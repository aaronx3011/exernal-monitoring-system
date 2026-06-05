import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_log')
@Index(['actor', 'createdAt'])
@Index(['targetType', 'targetId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  actor!: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 100 })
  targetType!: string;

  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
