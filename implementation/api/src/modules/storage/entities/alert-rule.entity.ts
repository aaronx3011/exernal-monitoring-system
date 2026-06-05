import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type AlertSeverity = 'critical' | 'warning' | 'info';

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId!: string | null;

  @Column({ name: 'condition_type', type: 'varchar', length: 100 })
  conditionType!: string;

  @Column({ type: 'jsonb' })
  parameters!: Record<string, any>;

  @Column({ type: 'varchar', length: 20, default: 'warning' })
  severity!: AlertSeverity;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
