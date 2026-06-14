import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './modules/redis/redis.module';
import { StorageModule } from './modules/storage/storage.module';
import { DashboardApiModule } from './modules/dashboard-api/dashboard-api.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { ProbingModule } from './modules/probing/probing.module';
import { TestingModule } from './modules/testing/testing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'monitor'),
        password: config.get<string>('DB_PASSWORD', 'change_me'),
        database: config.get<string>('DB_DATABASE', 'monitoring'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    TypeOrmModule.forRootAsync({
      name: 'timescale',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('TIMESCALE_HOST', 'timescaledb'),
        port: config.get<number>('TIMESCALE_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'monitor'),
        password: config.get<string>('DB_PASSWORD', 'change_me'),
        database: config.get<string>('DB_DATABASE', 'monitoring'),
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: { age: 86400 },
          removeOnFail: { age: 604800 },
        },
      }),
    }),

    RedisModule,
    AuthModule,
    StorageModule,
    DashboardApiModule,
    RegistrationModule,
    IngestionModule,
    ProbingModule,
    TestingModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
