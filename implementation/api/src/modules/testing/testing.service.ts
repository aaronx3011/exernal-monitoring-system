import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestDefinition } from '../storage/entities/test-definition.entity';
import { TestRun } from '../storage/entities/test-run.entity';
import { CreateTestDto } from './dto/create-test.dto';

@Injectable()
export class TestingService implements OnModuleInit {
  private readonly logger = new Logger(TestingService.name);

  constructor(
    @InjectQueue('testing')
    private readonly testingQueue: Queue,
    @InjectRepository(TestDefinition)
    private readonly testDefRepository: Repository<TestDefinition>,
    @InjectRepository(TestRun)
    private readonly testRunRepository: Repository<TestRun>,
  ) {}

  async onModuleInit() {
    await this.scheduleTests();
  }

  async createTest(applicationId: string, dto: CreateTestDto) {
    if (dto.vus && dto.max_vus_cap && dto.vus > dto.max_vus_cap) {
      throw new BadRequestException(`VUs (${dto.vus}) exceed max VUs cap (${dto.max_vus_cap})`);
    }

    const testDef = this.testDefRepository.create({
      applicationId,
      name: dto.name,
      targetPath: dto.targetPath,
      method: dto.method || 'GET',
      headers: dto.headers || null,
      body: dto.body || null,
      vus: dto.vus || 10,
      durationS: dto.duration_s || 30,
      stages: dto.stages || null,
      thresholds: dto.thresholds || null,
      scheduleCron: dto.schedule_cron || null,
      maxVusCap: dto.max_vus_cap || null,
      enabled: true,
    });

    return this.testDefRepository.save(testDef);
  }

  async listTests(applicationId?: string) {
    const where: any = {};
    if (applicationId) where.applicationId = applicationId;
    return this.testDefRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getTest(id: string) {
    const test = await this.testDefRepository.findOne({ where: { id }, relations: ['testRuns'] });
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async runTest(testId: string, trigger: 'manual' | 'scheduled' = 'manual') {
    const testDef = await this.testDefRepository.findOne({ where: { id: testId } });
    if (!testDef) throw new NotFoundException('Test not found');

    const testRun = this.testRunRepository.create({
      testDefinitionId: testId,
      trigger,
      status: 'pending',
    });

    const saved = await this.testRunRepository.save(testRun);

    await this.testingQueue.add('k6-run', {
      testRunId: saved.id,
      testDefinitionId: testId,
    });

    return saved;
  }

  async abortRun(runId: string) {
    const run = await this.testRunRepository.findOne({ where: { id: runId } });
    if (!run) throw new NotFoundException('Test run not found');

    run.status = 'cancelled';
    run.finishedAt = new Date();
    return this.testRunRepository.save(run);
  }

  async getRunDetail(runId: string) {
    const run = await this.testRunRepository.findOne({ where: { id: runId }, relations: ['testDefinition'] });
    if (!run) throw new NotFoundException('Test run not found');
    return run;
  }

  async getRunHistory(testId: string, limit: number = 20, offset: number = 0) {
    const [runs, total] = await this.testRunRepository.findAndCount({
      where: { testDefinitionId: testId },
      order: { startedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { runs, total, limit, offset };
  }

  async compareRuns(testId: string, lastN: number = 5) {
    const runs = await this.testRunRepository.find({
      where: { testDefinitionId: testId, status: 'completed' },
      order: { finishedAt: 'DESC' },
      take: lastN,
    });

    return runs.map((run) => ({
      id: run.id,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      passed: run.passed,
      summary: run.summary,
    }));
  }

  async scheduleTests() {
    const scheduledTests = await this.testDefRepository.find({
      where: { enabled: true },
    });

    for (const test of scheduledTests) {
      if (test.scheduleCron) {
        await this.testingQueue.upsertJobScheduler(
          `test:${test.id}`,
          { pattern: test.scheduleCron, immediately: false },
          { name: 'k6-run', data: { testDefinitionId: test.id } },
        );
      }
    }

    this.logger.log(`Scheduled ${scheduledTests.length} tests`);
  }
}
