import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Application } from './application.entity';
import { TestRun } from './test-run.entity';

@Entity('test_definitions')
export class TestDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @ManyToOne(() => Application, (app) => app.testDefinitions)
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'target_path', type: 'varchar', length: 2048 })
  targetPath!: string;

  @Column({ type: 'varchar', length: 10, default: 'GET' })
  method!: string;

  @Column({ type: 'jsonb', nullable: true })
  headers!: Record<string, string> | null;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ type: 'integer', default: 10 })
  vus!: number;

  @Column({ name: 'duration_s', type: 'integer', default: 30 })
  durationS!: number;

  @Column({ type: 'jsonb', nullable: true })
  stages!: any[] | null;

  @Column({ type: 'jsonb', nullable: true })
  thresholds!: Record<string, string> | null;

  @Column({ name: 'schedule_cron', type: 'varchar', length: 100, nullable: true })
  scheduleCron!: string | null;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ name: 'max_vus_cap', type: 'integer', nullable: true })
  maxVusCap!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => TestRun, (run) => run.testDefinition)
  testRuns!: TestRun[];
}
