import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestRun } from '../../storage/entities/test-run.entity';
import { TestDefinition } from '../../storage/entities/test-definition.entity';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Processor('testing')
export class K6RunnerProcessor extends WorkerHost {
  private readonly logger = new Logger(K6RunnerProcessor.name);

  constructor(
    @InjectRepository(TestRun)
    private readonly testRunRepository: Repository<TestRun>,
    @InjectRepository(TestDefinition)
    private readonly testDefRepository: Repository<TestDefinition>,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { testRunId, testDefinitionId } = job.data;

    const testRun = await this.testRunRepository.findOne({ where: { id: testRunId } });
    if (!testRun) throw new Error(`TestRun ${testRunId} not found`);

    const testDef = await this.testDefRepository.findOne({ where: { id: testDefinitionId } });
    if (!testDef) throw new Error(`TestDefinition ${testDefinitionId} not found`);

    testRun.status = 'running';
    testRun.startedAt = new Date();
    await this.testRunRepository.save(testRun);

    try {
      const script = this.generateScript(testDef);
      const scriptsDir = process.env.K6_SCRIPTS_DIR || '/tmp/k6-scripts';
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }
      const tmpFile = path.join(scriptsDir, `k6-script-${testRunId}.js`);
      fs.writeFileSync(tmpFile, script);

      const output = execSync(
        `docker run --rm --network=host -v ${tmpFile}:/script.js grafana/k6:latest run /script.js --summary-export=/dev/stdout`,
        { timeout: (testDef.durationS + 60) * 1000, encoding: 'utf-8' },
      );

      fs.unlinkSync(tmpFile);

      let summary: any;
      try {
        summary = JSON.parse(output);
      } catch {
        summary = { raw: output };
      }

      const thresholds = testDef.thresholds || {};
      const passed = this.evaluateThresholds(summary, thresholds);

      testRun.status = 'completed';
      testRun.finishedAt = new Date();
      testRun.summary = summary;
      testRun.passed = passed;
      await this.testRunRepository.save(testRun);

      return { testRunId, passed, summary };
    } catch (err: any) {
      testRun.status = 'failed';
      testRun.finishedAt = new Date();
      testRun.summary = { error: err.message };
      testRun.passed = false;
      await this.testRunRepository.save(testRun);

      throw err;
    }
  }

  private generateScript(testDef: TestDefinition): string {
    const method = testDef.method || 'GET';
    const headers = testDef.headers || {};
    const body = testDef.body;
    const stages = testDef.stages || [{ target: testDef.vus || 10, duration_s: testDef.durationS || 30 }];
    const thresholds = testDef.thresholds || {};

    const stagesStr = stages.map((s: any) => `{ target: ${s.target}, duration: '${s.duration_s}s' }`).join(',\n    ');
    const thresholdsStr = Object.entries(thresholds)
      .map(([key, val]) => `    '${key}': ['${val}'],`)
      .join('\n');
    const headersStr = Object.entries(headers)
      .map(([key, val]) => `    '${key}': '${val}',`)
      .join('\n');

    let bodyBlock = '';
    if (body && method !== 'GET') {
      bodyBlock = `  body: JSON.stringify(${JSON.stringify(body)}),\n`;
    }

    return `
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    ${stagesStr}
  ],
  thresholds: {
${thresholdsStr}
  },
};

export default function () {
  const url = '${testDef.targetPath.replace(/"/g, '\\"')}';
  const params = {
    headers: {
${headersStr}
    },
  };

  const res = http.${method.toLowerCase()}(${method === 'GET' ? 'url' : 'url, ' + bodyBlock}params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
`;
  }

  private evaluateThresholds(summary: any, thresholds: Record<string, string>): boolean {
    if (!summary || Object.keys(thresholds).length === 0) return true;

    const metrics = summary.metrics || {};
    for (const [key, condition] of Object.entries(thresholds)) {
      const metric = metrics[key];
      if (!metric) return false;

      const values = metric.values || metric;
      const p95 = values['p(95)'] || values.p95;
      const avg = values.avg || values.avg;

      for (const cond of (Array.isArray(condition) ? condition : [condition])) {
        const match = cond.match(/(\w+)\s*([<>=!]+)\s*(\d+\.?\d*)/);
        if (!match) continue;

        const val = match[1] === 'p(95)' || match[1] === 'p95' ? p95 : avg;
        if (val === undefined) return false;

        const op = match[2];
        const threshold = parseFloat(match[3]);

        switch (op) {
          case '<': if (!(val < threshold)) return false; break;
          case '>': if (!(val > threshold)) return false; break;
          case '<=': if (!(val <= threshold)) return false; break;
          case '>=': if (!(val >= threshold)) return false; break;
          case '==': if (!(val === threshold)) return false; break;
        }
      }
    }

    return true;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`K6 test job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`K6 test job ${job.id} failed: ${err.message}`);
  }
}
