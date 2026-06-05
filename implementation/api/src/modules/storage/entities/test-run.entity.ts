import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TestDefinition } from './test-definition.entity';

export type TestTrigger = 'scheduled' | 'manual';
export type TestRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

@Entity('test_runs')
export class TestRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'test_definition_id', type: 'uuid' })
  testDefinitionId!: string;

  @ManyToOne(() => TestDefinition, (test) => test.testRuns)
  @JoinColumn({ name: 'test_definition_id' })
  testDefinition!: TestDefinition;

  @Column({ type: 'varchar', length: 20, default: 'manual' })
  trigger!: TestTrigger;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: TestRunStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  summary!: Record<string, any> | null;

  @Column({ type: 'boolean', nullable: true })
  passed!: boolean | null;

  @Column({ name: 'artifact_ref', type: 'varchar', length: 512, nullable: true })
  artifactRef!: string | null;
}
