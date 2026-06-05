import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../storage/entities/application.entity';
import { TestRun } from '../storage/entities/test-run.entity';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardApiController {
  constructor(
    @InjectRepository(Application)
    private readonly appRepository: Repository<Application>,
    @InjectRepository(TestRun)
    private readonly testRunRepository: Repository<TestRun>,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get fleet overview statistics' })
  async getStats() {
    const totalApps = await this.appRepository.count();
    const activeApps = await this.appRepository.count({
      where: { status: 'active' },
    });
    const totalTestRuns = await this.testRunRepository.count();
    const passedRuns = await this.testRunRepository.count({
      where: { passed: true },
    });
    const failedRuns = await this.testRunRepository.count({
      where: { passed: false },
    });

    return {
      totalApplications: totalApps,
      activeApplications: activeApps,
      totalTestRuns,
      passedTestRuns: passedRuns,
      failedTestRuns: failedRuns,
      passRate:
        totalTestRuns > 0
          ? Number(((passedRuns / totalTestRuns) * 100).toFixed(2))
          : 0,
    };
  }
}
