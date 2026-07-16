import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ServicesModule } from './modules/services/services.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { IcsModule } from './modules/ics/ics.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { GreetingsModule } from './modules/greetings/greetings.module';
import { MessagesModule } from './modules/messages/messages.module';
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module';
import { RichMenusModule } from './modules/rich-menus/rich-menus.module';
import { LineAccountsModule } from './modules/line-accounts/line-accounts.module';
import { FormsModule } from './modules/forms/forms.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { TagsModule } from './modules/tags/tags.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SegmentsModule } from './modules/segments/segments.module';
import { AiModule } from './modules/ai/ai.module';
import { StepsModule } from './modules/steps/steps.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LineWebhookModule } from './modules/line-webhook/line-webhook.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthGuard } from './modules/auth/auth.guard';

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
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    DatabaseModule,
    AuthModule,
    TenantsModule,
    LocationsModule,
    ServicesModule,
    CalendarModule,
    ReservationsModule,
    IcsModule,
    RemindersModule,
    TemplatesModule,
    GreetingsModule,
    MessagesModule,
    BroadcastsModule,
    RichMenusModule,
    LineAccountsModule,
    FormsModule,
    CouponsModule,
    TagsModule,
    CustomersModule,
    SegmentsModule,
    AiModule,
    StepsModule,
    AnalyticsModule,
    LineWebhookModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
