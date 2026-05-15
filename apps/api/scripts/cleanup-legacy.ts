/**
 * Cleanup script: 古い練習データ (癒明 以外の locations) を削除する。
 *
 * Usage:
 *   pnpm cleanup-legacy           # プレビューのみ (削除しない)
 *   pnpm cleanup-legacy -- --apply  # 実際に削除を実行
 *
 * 保持: id が 11111111-... / 22222222-... のもの (seed で投入した癒明 池袋・相生)
 * 削除: それ以外の同 tenant の locations + 紐づく reservations + services + rich_menus
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, inArray, notInArray } from 'drizzle-orm';
import * as schema from '@linq-beauty/db';
import {
  locations,
  reservations,
  services,
  richMenus,
  richMenuGroups,
  icsTokens,
} from '@linq-beauty/db';

// Load root .env
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

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const KEEP_LOCATION_IDS = [
  '11111111-1111-1111-1111-111111111111', // 癒明 池袋
  '22222222-2222-2222-2222-222222222222', // 癒明 相生
];

const APPLY = process.argv.includes('--apply');

async function main() {
  if (!dbUrl) throw new Error('DATABASE_URL not set');
  console.log(`Mode: ${APPLY ? '★ APPLY (実削除)' : 'DRY-RUN (プレビューのみ)'}`);
  console.log(`Tenant: ${TENANT_ID}`);
  console.log('');

  const client = postgres(dbUrl, { onnotice: () => {} });
  const db = drizzle(client, { schema });

  // 1. 削除対象の location 一覧
  const allLocations = await db
    .select()
    .from(locations)
    .where(eq(locations.tenantId, TENANT_ID));

  const toDelete = allLocations.filter((l) => !KEEP_LOCATION_IDS.includes(l.id));
  const toKeep = allLocations.filter((l) => KEEP_LOCATION_IDS.includes(l.id));

  console.log(`保持する拠点 (${toKeep.length} 件):`);
  toKeep.forEach((l) => console.log(`  ✓ ${l.name}  (id=${l.id})`));
  console.log('');
  console.log(`削除対象の拠点 (${toDelete.length} 件):`);
  toDelete.forEach((l) => console.log(`  ✗ ${l.name}  (id=${l.id})`));
  console.log('');

  if (toDelete.length === 0) {
    console.log('削除対象なし。');
    await client.end();
    return;
  }

  const ids = toDelete.map((l) => l.id);

  // 2. 紐づくデータ件数を集計
  const resvs = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(inArray(reservations.locationId, ids));
  const svcs = await db
    .select({ id: services.id })
    .from(services)
    .where(inArray(services.locationId, ids));
  const rms = await db
    .select({ id: richMenus.id })
    .from(richMenus)
    .where(inArray(richMenus.locationId, ids));
  const rmgs = await db
    .select({ id: richMenuGroups.id })
    .from(richMenuGroups)
    .where(inArray(richMenuGroups.locationId, ids));
  const icss = await db
    .select({ id: icsTokens.id })
    .from(icsTokens)
    .where(inArray(icsTokens.locationId, ids));

  console.log(`一緒に削除されるデータ:`);
  console.log(`  予約 (reservations):           ${resvs.length} 件`);
  console.log(`  メニュー (services):           ${svcs.length} 件 (FK cascade で自動)`);
  console.log(`  リッチメニュー (rich_menus):   ${rms.length} 件`);
  console.log(`  リッチメニューグループ:        ${rmgs.length} 件`);
  console.log(`  ICS トークン (ics_tokens):     ${icss.length} 件`);
  console.log('');
  console.log(
    `(注: messages / customers の locationId は ON DELETE SET NULL のため、行自体は残り locationId が NULL に更新されます)`,
  );
  console.log('');

  if (!APPLY) {
    console.log('▼ プレビューのみ。実削除するには `pnpm cleanup-legacy -- --apply` を実行してください。');
    await client.end();
    return;
  }

  console.log('★ 実削除を開始します…');

  // 3. 削除順: 子から親へ
  //    (reservations は locations FK に cascade なし → 先に削除)
  //    (services は cascade あり → locations 削除で自動)
  //    (rich_menus / rich_menu_groups も先に削除しておく)
  if (rms.length > 0) {
    await db.delete(richMenus).where(inArray(richMenus.locationId, ids));
    console.log(`  ✓ rich_menus ${rms.length} 件削除`);
  }
  if (rmgs.length > 0) {
    await db.delete(richMenuGroups).where(inArray(richMenuGroups.locationId, ids));
    console.log(`  ✓ rich_menu_groups ${rmgs.length} 件削除`);
  }
  if (resvs.length > 0) {
    await db.delete(reservations).where(inArray(reservations.locationId, ids));
    console.log(`  ✓ reservations ${resvs.length} 件削除`);
  }
  if (icss.length > 0) {
    await db.delete(icsTokens).where(inArray(icsTokens.locationId, ids));
    console.log(`  ✓ ics_tokens ${icss.length} 件削除`);
  }
  // services は cascade で自動だが明示的に
  if (svcs.length > 0) {
    await db.delete(services).where(inArray(services.locationId, ids));
    console.log(`  ✓ services ${svcs.length} 件削除`);
  }
  await db.delete(locations).where(inArray(locations.id, ids));
  console.log(`  ✓ locations ${toDelete.length} 件削除`);

  console.log('');
  console.log('Cleanup 完了。');

  await client.end();
}

main().catch((e) => {
  console.error('Cleanup failed:', e);
  process.exit(1);
});
