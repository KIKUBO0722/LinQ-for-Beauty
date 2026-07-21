import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as bcrypt from 'bcryptjs';
import * as schema from '@linq-beauty/db';
import { platformAdmins } from '@linq-beauty/db';

// 運営者 (platform_admins) の bootstrap — seed.ts から独立した単独スクリプト (08 設計判断 11)。
// seed.ts は NEXT_PUBLIC_TENANT_ID 連動でテナントデータを破壊的に再投入するため、
// 「運営者のパスワードを変えたいだけ」の操作でテナントに触れない経路を分けている。
// 実行: pnpm --filter api seed:platform

// Load root .env (seed.ts と同方式)
for (const candidate of [resolve(__dirname, '../../../.env'), resolve(__dirname, '../../.env')]) {
  if (existsSync(candidate)) {
    for (const line of readFileSync(candidate, 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
    break;
  }
}
const rawUrl = process.env.DATABASE_URL ?? '';
const dbUrl = rawUrl.includes('sslmode=')
  ? rawUrl
  : rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'sslmode=require';

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('⚠ PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD 未設定 — 運営者の投入をスキップ (両方設定して再実行で投入)');
    return;
  }
  // 全テナントを扱う資格情報の fail-fast (main.ts の JWT_SECRET 32 文字チェックと同じ流儀)。
  // 8 文字未満は PlatformLoginDto の @MinLength(8) で永久ログイン不能になる罠もここで塞がる
  if (password.length < 16) {
    console.error('✗ PLATFORM_ADMIN_PASSWORD は 16 文字以上が必須 (運営者は全店のデータを扱うため)。投入を中止');
    process.exit(1);
  }
  const client = postgres(dbUrl, { onnotice: () => {} });
  const db = drizzle(client, { schema });
  const passwordHash = await bcrypt.hash(password, 10);
  await db
    .insert(platformAdmins)
    .values({ email, passwordHash })
    .onConflictDoUpdate({
      target: platformAdmins.email,
      set: { passwordHash, updatedAt: new Date() },
    });
  console.log(`✓ platform admin (${email})`);
  // 注: PLATFORM_ADMIN_EMAIL を変更して再実行すると旧 email の行は残留する (監査 FK により削除不能・ログイン可能なまま)
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
