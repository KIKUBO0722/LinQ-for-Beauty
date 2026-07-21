import { Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { adminAuditLogs } from '@linq-beauty/db';

type Db = NodePgDatabase<typeof schema>;

export type AuditAction =
  | 'platform.login'
  | 'platform.login_failed'
  | 'tenant.create'
  | 'user.issue'
  | 'user.reset_password';

export type AuditEntry = {
  actorId: string | null;
  action: AuditAction;
  targetTenantId?: string | null;
  /** パスワード平文・ハッシュは絶対に入れない (platform.service.spec が機械検証) */
  detail: Record<string, unknown>;
};

/**
 * 運営の監査記録 (追記専用、08 設計判断 2)。
 * 書き込み操作は呼び出し側のトランザクション tx を ex に渡して同梱する
 * (「操作されたのに記録が無い」を構造的に排除)。login 失敗の記録だけは db 直で呼び、失敗しても握る。
 */
@Injectable()
export class AuditService {
  async record(ex: Pick<Db, 'insert'>, entry: AuditEntry): Promise<void> {
    await ex.insert(adminAuditLogs).values({
      actorId: entry.actorId,
      action: entry.action,
      targetTenantId: entry.targetTenantId ?? null,
      detail: entry.detail,
    });
  }
}
