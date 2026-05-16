import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '@linq-beauty/db';

// Load root .env (same approach as drizzle.config.ts)
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
import {
  tenants,
  locations,
  services,
  lineAccounts,
  messageTemplates,
  greetingMessages,
  customers,
  reservations,
  messages,
  richMenus,
} from '@linq-beauty/db';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const IKEBUKURO_ID = '11111111-1111-1111-1111-111111111111';
const AIOI_ID = '22222222-2222-2222-2222-222222222222';
const LINE_ACCOUNT_ID = '33333333-3333-3333-3333-333333333333';

const SERVICES: Array<{ id: string; locationId: string; name: string; durationMin: number; price: number }> = [
  { id: '44444444-4444-4444-4444-444444444401', locationId: IKEBUKURO_ID, name: 'カット',             durationMin: 60,  price: 5500 },
  { id: '44444444-4444-4444-4444-444444444402', locationId: IKEBUKURO_ID, name: 'カット + カラー',     durationMin: 90,  price: 9800 },
  { id: '44444444-4444-4444-4444-444444444403', locationId: IKEBUKURO_ID, name: 'パーマ',             durationMin: 120, price: 12000 },
  { id: '44444444-4444-4444-4444-444444444404', locationId: AIOI_ID,      name: 'カット',             durationMin: 60,  price: 5000 },
  { id: '44444444-4444-4444-4444-444444444405', locationId: AIOI_ID,      name: 'トリートメント',     durationMin: 45,  price: 4500 },
];

// 美容業界共通プリセット 8 種 (店舗固有名は hardcode せず汎用文面、{プレースホルダ} は将来テンプレ変数で置換)
// 参照: Projects/LinQ-for-Beauty/.claude/spec.md §「業界共通プリセット」
const TEMPLATES: Array<{ id: string; name: string; content: string; category: string }> = [
  { id: '55555555-5555-5555-5555-555555555501', name: '予約確認',         content: 'ご予約日時のご確認です。\n\n{予約日時}\n{メニュー}\n\nご来店をお待ちしております。', category: '予約確認' },
  { id: '55555555-5555-5555-5555-555555555502', name: '来店リマインダー', content: '明日 {予約時刻} のご予約です。\nお気をつけてお越しください。', category: 'リマインダ' },
  { id: '55555555-5555-5555-5555-555555555503', name: '施術後お礼',       content: '本日はご来店ありがとうございました。\n仕上がりはいかがでしょうか?\n次回もお待ちしております。', category: 'フォロー' },
  { id: '55555555-5555-5555-5555-555555555504', name: 'カラー戻り案内',   content: '前回のカラーから 6 週間が経ちました。\nリタッチはいかがでしょうか?\nご都合の良いお日にちをお知らせください。', category: 'リピート' },
  { id: '55555555-5555-5555-5555-555555555505', name: '季節キャンペーン', content: '春の新メニューが登場しました!\n{期限} までのご予約で 10% OFF クーポンをご利用いただけます。', category: 'キャンペーン' },
  { id: '55555555-5555-5555-5555-555555555506', name: '失客フォロー',     content: 'お久しぶりです、お元気ですか?\n季節の変わり目、髪のお手入れをいかがでしょうか。\nお気軽にご連絡ください。', category: 'フォロー' },
  { id: '55555555-5555-5555-5555-555555555507', name: '誕生月メッセージ', content: 'お誕生日おめでとうございます!\n誕生月特典をご利用いただけます。詳しくはご返信ください。', category: 'キャンペーン' },
  { id: '55555555-5555-5555-5555-555555555508', name: 'リピート促進',     content: '前回ご来店から {経過日数} 経ちました。\n次回のご予約はいかがでしょうか?\nお気軽にメッセージください。', category: 'リピート' },
];

const GREETINGS: Array<{ id: string; type: string; name: string; messages: Array<Record<string, unknown>> }> = [
  { id: '66666666-6666-6666-6666-666666666601', type: 'welcome', name: '友だち追加直後',         messages: [{ type: 'text', text: 'はじめまして、癒明です。\nご来店のご予約は LINE からお気軽にどうぞ。' }] },
  { id: '66666666-6666-6666-6666-666666666602', type: 'thanks',  name: '来店後 1 時間お礼', messages: [{ type: 'text', text: '本日はご来店ありがとうございました。\nまたお会いできるのを楽しみにしております。' }] },
];

const CUSTOMERS: Array<{ id: string; name: string; lineUserId: string; phone: string; preferredLocationId: string }> = [
  { id: '77777777-7777-7777-7777-777777777701', name: '佐藤 美咲',     lineUserId: 'U0000000000000000000000000000001', phone: '090-1111-1111', preferredLocationId: IKEBUKURO_ID },
  { id: '77777777-7777-7777-7777-777777777702', name: '田中 真理',     lineUserId: 'U0000000000000000000000000000002', phone: '090-2222-2222', preferredLocationId: IKEBUKURO_ID },
  { id: '77777777-7777-7777-7777-777777777703', name: '鈴木 さくら',   lineUserId: 'U0000000000000000000000000000003', phone: '090-3333-3333', preferredLocationId: AIOI_ID },
];

async function main() {
  if (!dbUrl) throw new Error('DATABASE_URL not set in .env');
  console.log(`Seeding tenant=${TENANT_ID}…`);

  const client = postgres(dbUrl, { onnotice: () => {} });
  const db = drizzle(client, { schema });

  // Tenant
  await db
    .insert(tenants)
    .values({ id: TENANT_ID, name: '癒明 (ゆめい)', email: 'hirayama@yumei.test' })
    .onConflictDoUpdate({ target: tenants.id, set: { name: '癒明 (ゆめい)', updatedAt: new Date() } });
  console.log('  ✓ tenant');

  // Locations (slug required by schema)
  const IKEBUKURO = {
    id: IKEBUKURO_ID,
    tenantId: TENANT_ID,
    name: '癒明 池袋',
    slug: 'ikebukuro',
    address: '東京都豊島区池袋 (仮)',
    businessHours: { mon: { open: '11:00', close: '20:00' }, tue: { open: '11:00', close: '20:00' }, wed: { open: '11:00', close: '20:00' }, thu: { open: '11:00', close: '20:00' }, fri: { open: '11:00', close: '20:00' }, sat: { open: '10:00', close: '19:00' }, sun: { open: '10:00', close: '19:00' } },
  };
  const AIOI = {
    id: AIOI_ID,
    tenantId: TENANT_ID,
    name: '癒明 相生',
    slug: 'aioi',
    address: '兵庫県相生市 (仮、開店日未確定)',
    businessHours: { mon: { open: '10:00', close: '19:00' }, tue: { open: '10:00', close: '19:00' }, wed: { open: '10:00', close: '19:00' }, thu: { open: '10:00', close: '19:00' }, fri: { open: '10:00', close: '19:00' }, sat: { open: '10:00', close: '19:00' }, sun: { open: '10:00', close: '19:00' } },
  };
  await db
    .insert(locations)
    .values(IKEBUKURO)
    .onConflictDoUpdate({
      target: locations.id,
      set: { name: IKEBUKURO.name, slug: IKEBUKURO.slug, address: IKEBUKURO.address, businessHours: IKEBUKURO.businessHours, updatedAt: new Date() },
    });
  await db
    .insert(locations)
    .values(AIOI)
    .onConflictDoUpdate({
      target: locations.id,
      set: { name: AIOI.name, slug: AIOI.slug, address: AIOI.address, businessHours: AIOI.businessHours, updatedAt: new Date() },
    });
  console.log('  ✓ locations (池袋 + 相生)');

  // Services
  for (const s of SERVICES) {
    await db
      .insert(services)
      .values({
        id: s.id,
        tenantId: TENANT_ID,
        locationId: s.locationId,
        name: s.name,
        durationMin: s.durationMin,
        price: s.price,
      })
      .onConflictDoUpdate({
        target: services.id,
        set: { name: s.name, durationMin: s.durationMin, price: s.price, updatedAt: new Date() },
      });
  }
  console.log(`  ✓ services (${SERVICES.length})`);

  // LINE Account (dummy, real channel connected on Day 20)
  await db
    .insert(lineAccounts)
    .values({
      id: LINE_ACCOUNT_ID,
      tenantId: TENANT_ID,
      channelId: 'DUMMY_CHANNEL_ID',
      channelSecret: 'DUMMY_CHANNEL_SECRET',
      channelAccessToken: 'DUMMY_ACCESS_TOKEN',
    })
    .onConflictDoNothing();
  console.log('  ✓ line_account (dummy)');

  // Templates
  for (const t of TEMPLATES) {
    await db
      .insert(messageTemplates)
      .values({ id: t.id, tenantId: TENANT_ID, name: t.name, content: t.content, category: t.category, messageType: 'text' })
      .onConflictDoUpdate({
        target: messageTemplates.id,
        set: { name: t.name, content: t.content, category: t.category, updatedAt: new Date() },
      });
  }
  console.log(`  ✓ templates (${TEMPLATES.length})`);

  // Greetings
  for (const g of GREETINGS) {
    await db
      .insert(greetingMessages)
      .values({ id: g.id, tenantId: TENANT_ID, type: g.type, name: g.name, messages: g.messages, isActive: true })
      .onConflictDoUpdate({
        target: greetingMessages.id,
        set: { name: g.name, messages: g.messages, updatedAt: new Date() },
      });
  }
  console.log(`  ✓ greetings (${GREETINGS.length})`);

  // Customers (lastReadAt は null にリセット → seed 再実行で未読が復活する)
  for (const c of CUSTOMERS) {
    await db
      .insert(customers)
      .values({
        id: c.id,
        tenantId: TENANT_ID,
        name: c.name,
        lineUserId: c.lineUserId,
        phone: c.phone,
        preferredLocationId: c.preferredLocationId,
        lastReadAt: null,
      })
      .onConflictDoUpdate({
        target: customers.id,
        set: { name: c.name, phone: c.phone, preferredLocationId: c.preferredLocationId, lastReadAt: null, updatedAt: new Date() },
      });
  }
  console.log(`  ✓ customers (${CUSTOMERS.length})`);

  // Today's reservations (clear and re-insert)
  await db.delete(reservations).where(eq(reservations.locationId, IKEBUKURO_ID));
  await db.delete(reservations).where(eq(reservations.locationId, AIOI_ID));

  const now = new Date();
  const todayBase = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayReservations = [
    { customerId: CUSTOMERS[0].id, locationId: IKEBUKURO_ID, serviceId: SERVICES[0].id, hour: 10, status: 'confirmed' as const },
    { customerId: CUSTOMERS[1].id, locationId: IKEBUKURO_ID, serviceId: SERVICES[1].id, hour: 14, status: 'confirmed' as const },
    { customerId: CUSTOMERS[2].id, locationId: AIOI_ID,      serviceId: SERVICES[3].id, hour: 16, status: 'pending'   as const },
  ];
  for (const r of todayReservations) {
    const svc = SERVICES.find((s) => s.id === r.serviceId)!;
    const startsAt = new Date(todayBase.getTime() + r.hour * 3600_000);
    const endsAt = new Date(startsAt.getTime() + svc.durationMin * 60_000);
    await db.insert(reservations).values({
      locationId: r.locationId,
      serviceId: r.serviceId,
      customerId: r.customerId,
      startsAt,
      endsAt,
      status: r.status,
    });
  }
  console.log(`  ✓ today reservations (${todayReservations.length})`);

  // Sample messages (clear and re-insert)
  await db.delete(messages).where(eq(messages.tenantId, TENANT_ID));
  await db.insert(messages).values([
    {
      tenantId: TENANT_ID,
      locationId: IKEBUKURO_ID,
      lineAccountId: LINE_ACCOUNT_ID,
      customerId: CUSTOMERS[0].id,
      direction: 'inbound',
      messageType: 'text',
      content: { type: 'text', text: 'こんにちは、明日 14 時の予約変更できますか？' },
      sendType: 'reply',
      status: 'received',
      sentAt: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
      tenantId: TENANT_ID,
      locationId: IKEBUKURO_ID,
      lineAccountId: LINE_ACCOUNT_ID,
      customerId: CUSTOMERS[0].id,
      direction: 'outbound',
      messageType: 'text',
      content: { type: 'text', text: 'こんにちは。明日 14:30 でしたら空きがあります。いかがでしょうか？' },
      sendType: 'push',
      status: 'sent',
      sentAt: new Date(Date.now() - 50 * 60 * 1000),
    },
    {
      tenantId: TENANT_ID,
      locationId: IKEBUKURO_ID,
      lineAccountId: LINE_ACCOUNT_ID,
      customerId: CUSTOMERS[0].id,
      direction: 'inbound',
      messageType: 'text',
      content: { type: 'text', text: 'はい、14:30 でお願いします！' },
      sendType: 'reply',
      status: 'received',
      sentAt: new Date(Date.now() - 30 * 60 * 1000),
    },
    {
      tenantId: TENANT_ID,
      locationId: AIOI_ID,
      lineAccountId: LINE_ACCOUNT_ID,
      customerId: CUSTOMERS[2].id,
      direction: 'inbound',
      messageType: 'text',
      content: { type: 'text', text: 'カラーの料金教えてください' },
      sendType: 'reply',
      status: 'received',
      sentAt: new Date(Date.now() - 10 * 60 * 1000),
    },
  ]);
  console.log('  ✓ messages (sample conversations: 池袋 1, 相生 1)');

  // Rich menus (clear and re-insert)
  await db.delete(richMenus).where(eq(richMenus.tenantId, TENANT_ID));
  await db.insert(richMenus).values([
    {
      tenantId: TENANT_ID,
      locationId: IKEBUKURO_ID,
      lineAccountId: LINE_ACCOUNT_ID,
      name: '池袋 メインメニュー',
      chatBarText: 'メニュー',
      size: { width: 2500, height: 1686 },
      areas: [{ bounds: { x: 0, y: 0, width: 2500, height: 1686 }, action: { type: 'message', text: '予約したい' } }],
      isDefault: true,
      isActive: false,
    },
    {
      tenantId: TENANT_ID,
      locationId: AIOI_ID,
      lineAccountId: LINE_ACCOUNT_ID,
      name: '相生 メインメニュー',
      chatBarText: 'メニュー',
      size: { width: 2500, height: 1686 },
      areas: [{ bounds: { x: 0, y: 0, width: 2500, height: 1686 }, action: { type: 'message', text: '予約したい' } }],
      isDefault: false,
      isActive: false,
    },
  ]);
  console.log('  ✓ rich-menus (池袋 + 相生)');

  await client.end();
  console.log('Seed done.');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
