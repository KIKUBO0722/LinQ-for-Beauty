import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, asc, desc, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { stepScenarios, stepMessages, stepEnrollments, customers } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import type { CreateScenarioDto, UpdateScenarioDto, StepMessageDto } from './dto/steps.dto';

type Db = NodePgDatabase<typeof schema>;
type ScenarioRow = typeof stepScenarios.$inferSelect;
type MessageRow = typeof stepMessages.$inferSelect;
type EnrollmentRow = typeof stepEnrollments.$inferSelect;

export type ScenarioWithCounts = ScenarioRow & {
  messageCount: number;
  activeEnrollmentCount: number;
};

@Injectable()
export class StepsService {
  private readonly logger = new Logger(StepsService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  // ====== シナリオ ======

  async listScenarios(tenantId: string): Promise<ScenarioWithCounts[]> {
    const scenarios = await this.db
      .select()
      .from(stepScenarios)
      .where(eq(stepScenarios.tenantId, tenantId))
      .orderBy(desc(stepScenarios.updatedAt));

    if (scenarios.length === 0) return [];

    const scenarioIds = scenarios.map((s) => s.id);

    // 件数集計 (2-query JS-merge、innerJoin 回避)
    const allMessages = await this.db
      .select({ scenarioId: stepMessages.scenarioId })
      .from(stepMessages)
      .where(inArray(stepMessages.scenarioId, scenarioIds));
    const messageCountMap = new Map<string, number>();
    for (const m of allMessages) {
      messageCountMap.set(m.scenarioId, (messageCountMap.get(m.scenarioId) ?? 0) + 1);
    }

    const allEnrollments = await this.db
      .select({ scenarioId: stepEnrollments.scenarioId, status: stepEnrollments.status })
      .from(stepEnrollments)
      .where(inArray(stepEnrollments.scenarioId, scenarioIds));
    const enrollmentCountMap = new Map<string, number>();
    for (const e of allEnrollments) {
      if (e.status === 'active') {
        enrollmentCountMap.set(e.scenarioId, (enrollmentCountMap.get(e.scenarioId) ?? 0) + 1);
      }
    }

    return scenarios.map((s) => ({
      ...s,
      messageCount: messageCountMap.get(s.id) ?? 0,
      activeEnrollmentCount: enrollmentCountMap.get(s.id) ?? 0,
    }));
  }

  async getScenario(tenantId: string, id: string): Promise<ScenarioRow & { messages: MessageRow[] }> {
    const [scenario] = await this.db
      .select()
      .from(stepScenarios)
      .where(and(eq(stepScenarios.id, id), eq(stepScenarios.tenantId, tenantId)))
      .limit(1);
    if (!scenario) throw new NotFoundException('シナリオが見つかりません');

    const messages = await this.db
      .select()
      .from(stepMessages)
      .where(eq(stepMessages.scenarioId, id))
      .orderBy(asc(stepMessages.sortOrder));

    return { ...scenario, messages };
  }

  async createScenario(tenantId: string, data: CreateScenarioDto): Promise<ScenarioRow> {
    const [created] = await this.db
      .insert(stepScenarios)
      .values({
        tenantId,
        locationId: data.locationId ?? null,
        name: data.name,
        description: data.description ?? null,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig ?? {},
        isActive: data.isActive ?? false,
      })
      .returning();
    return created;
  }

  async updateScenario(tenantId: string, id: string, data: UpdateScenarioDto): Promise<ScenarioRow> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.triggerType !== undefined) updateData.triggerType = data.triggerType;
    if (data.triggerConfig !== undefined) updateData.triggerConfig = data.triggerConfig;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await this.db
      .update(stepScenarios)
      .set(updateData)
      .where(and(eq(stepScenarios.id, id), eq(stepScenarios.tenantId, tenantId)))
      .returning();
    if (!updated) throw new NotFoundException('シナリオが見つかりません');
    return updated;
  }

  async removeScenario(tenantId: string, id: string): Promise<void> {
    await this.db
      .delete(stepScenarios)
      .where(and(eq(stepScenarios.id, id), eq(stepScenarios.tenantId, tenantId)));
  }

  // ====== ステップメッセージ (シナリオ配下) ======

  /** シナリオの全ステップを replace 方式で入れ替え (UI が並べ替えしやすい) */
  async replaceMessages(tenantId: string, scenarioId: string, messages: StepMessageDto[]): Promise<MessageRow[]> {
    // tenant チェック
    await this.getScenario(tenantId, scenarioId);

    // 既存全削除 → 新規挿入 (簡略化、件数少ない想定)
    await this.db.delete(stepMessages).where(eq(stepMessages.scenarioId, scenarioId));

    if (messages.length === 0) return [];

    const inserted = await this.db
      .insert(stepMessages)
      .values(
        messages.map((m) => ({
          scenarioId,
          delayMinutes: m.delayMinutes,
          sortOrder: m.sortOrder,
          messageContent: m.messageContent as { type: 'text'; text: string },
        })),
      )
      .returning();
    return inserted;
  }

  // ====== 進行状況 (Enrollment) ======

  /** Day 12: 手動で顧客をシナリオに登録。Day 13 でトリガー連動 (tag/form/friend-add/reservation-completed) を結線 */
  async enroll(tenantId: string, scenarioId: string, customerId: string): Promise<EnrollmentRow> {
    const scenario = await this.getScenario(tenantId, scenarioId);
    if (!scenario.isActive) {
      throw new BadRequestException('シナリオが停止中です。有効化してから登録してください');
    }

    const [customer] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!customer) throw new NotFoundException('顧客が見つかりません');

    // 重複チェック (同じシナリオに active で重複登録は不可)
    const existing = await this.db
      .select()
      .from(stepEnrollments)
      .where(
        and(
          eq(stepEnrollments.customerId, customerId),
          eq(stepEnrollments.scenarioId, scenarioId),
          eq(stepEnrollments.status, 'active'),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      throw new BadRequestException('この顧客は既にこのシナリオに登録中です');
    }

    // 最初のメッセージの送信予定時刻を計算
    const firstMessage = scenario.messages[0];
    const nextSendAt = firstMessage
      ? new Date(Date.now() + firstMessage.delayMinutes * 60 * 1000)
      : null;

    const [enrollment] = await this.db
      .insert(stepEnrollments)
      .values({
        customerId,
        scenarioId,
        currentStepIndex: 0,
        status: 'active',
        nextSendAt,
      })
      .returning();
    return enrollment;
  }

  async cancelEnrollment(tenantId: string, enrollmentId: string): Promise<void> {
    // tenant チェック (scenario 経由)
    const [enrollment] = await this.db
      .select()
      .from(stepEnrollments)
      .where(eq(stepEnrollments.id, enrollmentId))
      .limit(1);
    if (!enrollment) throw new NotFoundException('登録が見つかりません');

    const [scenario] = await this.db
      .select()
      .from(stepScenarios)
      .where(and(eq(stepScenarios.id, enrollment.scenarioId), eq(stepScenarios.tenantId, tenantId)))
      .limit(1);
    if (!scenario) throw new NotFoundException('登録が見つかりません');

    await this.db
      .update(stepEnrollments)
      .set({ status: 'cancelled' })
      .where(eq(stepEnrollments.id, enrollmentId));
  }

  /**
   * Day 13: 外部イベントから該当 scenarios を検索 → 該当 customer を一括 enroll。
   * 失敗してもイベント本体 (タグ付与など) は止めないので catch して warn のみ。
   */
  async triggerByEvent(
    tenantId: string,
    triggerType: 'tag' | 'form' | 'friend-add' | 'reservation-completed',
    params: { customerId: string; tagId?: string; formId?: string; serviceId?: string },
  ): Promise<void> {
    try {
      const candidates = await this.db
        .select()
        .from(stepScenarios)
        .where(
          and(
            eq(stepScenarios.tenantId, tenantId),
            eq(stepScenarios.triggerType, triggerType),
            eq(stepScenarios.isActive, true),
          ),
        );

      for (const scenario of candidates) {
        // triggerConfig マッチ判定
        const cfg = scenario.triggerConfig as Record<string, unknown>;
        if (triggerType === 'tag' && cfg.tagId && cfg.tagId !== params.tagId) continue;
        if (triggerType === 'form' && cfg.formId && cfg.formId !== params.formId) continue;
        if (triggerType === 'reservation-completed' && cfg.serviceId && cfg.serviceId !== params.serviceId) continue;
        // friend-add は customer 単位、追加判定なし

        try {
          await this.enroll(tenantId, scenario.id, params.customerId);
          this.logger.log(
            `Auto-triggered: scenario=${scenario.id} customer=${params.customerId} via ${triggerType}`,
          );
        } catch (e) {
          // 重複登録 (BadRequestException) は無視、他のエラーは warn
          if (e instanceof BadRequestException) continue;
          this.logger.warn(`Auto-trigger failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (e) {
      this.logger.error(`triggerByEvent error: ${e}`);
    }
  }

  async listEnrollments(tenantId: string, scenarioId: string) {
    // tenant チェック
    await this.getScenario(tenantId, scenarioId);

    const enrollments = await this.db
      .select()
      .from(stepEnrollments)
      .where(eq(stepEnrollments.scenarioId, scenarioId))
      .orderBy(desc(stepEnrollments.enrolledAt));

    if (enrollments.length === 0) return [];

    // 顧客名解決 (2-query JS-merge)
    const customerIds = [...new Set(enrollments.map((e) => e.customerId))];
    const customerRows = await this.db
      .select({ id: customers.id, name: customers.name, displayName: customers.displayName })
      .from(customers)
      .where(inArray(customers.id, customerIds));
    const cusMap = new Map(customerRows.map((c) => [c.id, c]));

    return enrollments.map((e) => ({
      ...e,
      customerName: cusMap.get(e.customerId)?.displayName ?? cusMap.get(e.customerId)?.name ?? '名前未登録',
    }));
  }
}
