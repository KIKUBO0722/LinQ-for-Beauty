import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcryptjs'; // bcryptjs 固定 (01 §設計判断 3 — native bcrypt の追加導入は禁止)
import * as schema from '@linq-beauty/db';
import { platformAdmins } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { AuditService } from './audit.service';
import type { PlatformLoginDto } from './dto/platform.dto';

// email 不存在時も bcrypt.compare を必ず 1 回実行して応答時間を揃えるためのダミーハッシュ (起動時 1 回生成)。
// 比較スキップだと存在する email としない email で 401 の応答時間に測定可能な差が出て、
// 「存在有無を漏らさない」不変条件が時間の側チャネルで破れる (SP1 独立検証の指摘)
const DUMMY_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), 10);

@Injectable()
export class PlatformAuthService {
  private readonly logger = new Logger(PlatformAuthService.name);

  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: PlatformLoginDto) {
    const admin = await this.db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.email, dto.email),
    });
    const matches = await bcrypt.compare(dto.password, admin?.passwordHash ?? DUMMY_HASH);
    if (!admin || !matches) {
      // 失敗も day one で監査記録 (単一運営アカウントへの総当たりを検知する唯一の手段 — 08 設計判断 2)。
      // 失敗の記録失敗でログイン応答を 500 にはしない (warn で握り 401 を返す)
      try {
        await this.audit.record(this.db, {
          actorId: admin?.id ?? null,
          action: 'platform.login_failed',
          detail: { email: dto.email },
        });
      } catch (e) {
        this.logger.warn(`login_failed の監査記録に失敗: ${String(e)}`);
      }
      // 店側 login と同じ同一文面主義 (存在有無を漏らさない)
      throw new UnauthorizedException('メールアドレスまたはパスワードが違います');
    }
    // 成功の記録は fail-closed — 記録できないログインは成立させない (lastLoginAt と同一 tx、08 設計判断 3)
    await this.db.transaction(async (tx) => {
      await tx
        .update(platformAdmins)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(platformAdmins.id, admin.id));
      await this.audit.record(tx, {
        actorId: admin.id,
        action: 'platform.login',
        detail: { email: admin.email },
      });
    });
    const accessToken = await this.jwtService.signAsync(
      { sub: admin.id, role: 'platform', email: admin.email }, // tenantId は絶対に入れない (同居禁止の規律)
      { expiresIn: '12h' }, // 店側 30d より短い管理者アカウント衛生 (08 設計判断 3、CIS 5.4)
    );
    return {
      accessToken,
      tokenType: 'Bearer' as const,
      expiresInSec: 43200,
      admin: { id: admin.id, email: admin.email },
    };
  }
}
