import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId!: string;

  @ManyToOne(() => Application, (app) => app.apiKeys)
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ name: 'key_hash', type: 'varchar', length: 255 })
  keyHash!: string;

  @Column({ type: 'varchar', length: 8 })
  prefix!: string;

  @Column({ type: 'text', array: true, default: [] })
  scopes!: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  label!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}
