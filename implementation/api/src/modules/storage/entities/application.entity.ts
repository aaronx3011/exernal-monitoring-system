import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Organization } from './organization.entity';
import { ApiKey } from './api-key.entity';
import { TestDefinition } from './test-definition.entity';

export type NetworkType = 'public' | 'private';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, (org) => org.applications)
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'base_url', type: 'varchar', length: 2048 })
  baseUrl!: string;

  @Column({ name: 'health_path', type: 'varchar', length: 255, default: '/healthz' })
  healthPath!: string;

  @Column({ name: 'network_type', type: 'varchar', length: 20, default: 'public' })
  networkType!: NetworkType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  environment!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  owner!: string | null;

  @Column({ type: 'text', array: true, default: [] })
  tags!: string[];

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status!: string;

  @Column({ name: 'private_endpoint', type: 'varchar', length: 2048, nullable: true })
  privateEndpoint!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => ApiKey, (key) => key.application)
  apiKeys!: ApiKey[];

  @OneToMany(() => TestDefinition, (test) => test.application)
  testDefinitions!: TestDefinition[];
}
