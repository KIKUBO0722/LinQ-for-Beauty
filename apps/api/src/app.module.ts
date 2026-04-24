import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ServicesModule } from './modules/services/services.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { IcsModule } from './modules/ics/ics.module';
import { RemindersModule } from './modules/reminders/reminders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    DatabaseModule,
    LocationsModule,
    ServicesModule,
    CalendarModule,
    ReservationsModule,
    IcsModule,
    RemindersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
