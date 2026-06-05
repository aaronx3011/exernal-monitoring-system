import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ProbingService } from '../probing.service';

@Processor('probing')
export class ProbingProcessor extends WorkerHost {
  private readonly logger = new Logger(ProbingProcessor.name);

  constructor(
    private readonly probingService: ProbingService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { applicationId } = job.data;

    this.logger.debug(`Executing probe for application ${applicationId}`);

    try {
      const result = await this.probingService.executeProbe(applicationId);
      await this.probingService.storeProbeResult(applicationId, result);
      await this.probingService.evaluateState(applicationId, result);
      return result;
    } catch (err: any) {
      this.logger.error(`Probe failed for ${applicationId}: ${err.message}`);
      throw err;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Probe job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Probe job ${job.id} failed: ${err.message}`);
  }
}
