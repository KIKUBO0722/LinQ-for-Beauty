import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, and, lte, asc, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { stepEnrollments, stepMessages, stepScenarios } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { MessagesService } from '../messages/messages.service';

type Db = NodePgDatabase<typeof schema>;

/**
 * Day 13/22: ステップ配信の実発火スケジューラ。
 * 1 分ごとに nextSendAt <= NOW() AND status='active' を SELECT → 該当ステップを送信 → 次ステップへ進める。
 *
 * - Redis / BullMQ は使わず DB ポーリング (送信件数小想定、Day 14 で Upstash Free 接続後に BullMQ 化検討)
 * - 各 enrollment は scenario.isActive チェック (シナリオ停止中なら送信スキップ)
 */
@Injectable()
export class StepsScheduler {
  private readonly logger = new Logger(StepsScheduler.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly messages: MessagesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    try {
      const now = new Date();
      const due = await this.db
        .select()
        .from(stepEnrollments)
        .where(
          and(
            eq(stepEnrollments.status, 'active'),
            lte(stepEnrollments.nextSendAt, now),
            sql`${stepEnrollments.nextSendAt} IS NOT NULL`,
          ),
        )
        .orderBy(asc(stepEnrollments.nextSendAt))
        .limit(50); // 1 ティックあたり最大 50 件

      if (due.length === 0) return;
      this.logger.log(`Steps scheduler: ${due.length} 件の送信予定を処理`);

      for (const enrollment of due) {
        await this.processEnrollment(enrollment).catch((e) => {
          this.logger.error(`enrollment ${enrollment.id} 処理失敗: ${e}`);
        });
      }
    } catch (error) {
      this.logger.error(`Scheduler tick error: ${error}`);
    }
  }

  private async processEnrollment(enrollment: typeof stepEnrollments.$inferSelect) {
    // シナリオ + 全ステップ取得
    const [scenario] = await this.db
      .select()
      .from(stepScenarios)
      .where(eq(stepScenarios.id, enrollment.scenarioId))
      .limit(1);
    if (!scenario) {
      await this.markCancelled(enrollment.id, 'シナリオが削除されました');
      return;
    }
    if (!scenario.isActive) {
      // シナリオ停止中: nextSendAt を 1 時間後に延期 (一時停止扱い)
      await this.db
        .update(stepEnrollments)
        .set({ nextSendAt: new Date(Date.now() + 60 * 60 * 1000) })
        .where(eq(stepEnrollments.id, enrollment.id));
      return;
    }

    const messages = await this.db
      .select()
      .from(stepMessages)
      .where(eq(stepMessages.scenarioId, scenario.id))
      .orderBy(asc(stepMessages.sortOrder));

    const currentMessage = messages[enrollment.currentStepIndex];
    if (!currentMessage) {
      await this.markCompleted(enrollment.id);
      return;
    }

    // 送信
    const content = currentMessage.messageContent;
    const text = (content as { type: string; text?: string }).text;
    if (!text) {
      // 非テキスト型は v0.1 では未対応、スキップして次へ
      this.logger.warn(`Step ${currentMessage.id} は非テキスト型、スキップ`);
    } else {
      try {
        await this.messages.sendMessageToCustomer(scenario.tenantId, enrollment.customerId, {
          type: 'text',
          text,
        });
      } catch (e) {
        this.logger.warn(
          `LINE 送信失敗 (enrollment=${enrollment.id}): ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // 次ステップへ進める
    const nextStepIndex = enrollment.currentStepIndex + 1;
    const nextMessage = messages[nextStepIndex];
    if (!nextMessage) {
      await this.markCompleted(enrollment.id);
    } else {
      const nextSendAt = new Date(Date.now() + nextMessage.delayMinutes * 60 * 1000);
      await this.db
        .update(stepEnrollments)
        .set({ currentStepIndex: nextStepIndex, nextSendAt })
        .where(eq(stepEnrollments.id, enrollment.id));
    }
  }

  private async markCompleted(enrollmentId: string) {
    await this.db
      .update(stepEnrollments)
      .set({ status: 'completed', completedAt: new Date(), nextSendAt: null })
      .where(eq(stepEnrollments.id, enrollmentId));
  }

  private async markCancelled(enrollmentId: string, reason: string) {
    this.logger.warn(`enrollment ${enrollmentId} cancelled: ${reason}`);
    await this.db
      .update(stepEnrollments)
      .set({ status: 'cancelled', nextSendAt: null })
      .where(eq(stepEnrollments.id, enrollmentId));
  }
}
