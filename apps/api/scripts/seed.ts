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
  coupons,
  tags,
  customerTags,
  forms,
  stepScenarios,
  stepMessages,
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
  { id: '66666666-6666-6666-6666-666666666601', type: 'welcome', name: '友だち追加直後',         messages: [{ type: 'text', text: '友だち追加ありがとうございます。\nご来店のご予約は LINE からお気軽にどうぞ。' }] },
  { id: '66666666-6666-6666-6666-666666666602', type: 'thanks',  name: '来店後 1 時間お礼', messages: [{ type: 'text', text: '本日はご来店ありがとうございました。\nまたお会いできるのを楽しみにしております。' }] },
];

// 美容業界共通プリセット 5 種 (店舗固有名 hardcode せず、locationId=null で全拠点共通)
// 参照: Projects/LinQ-for-Beauty/.claude/spec.md §「業界共通プリセット」
const COUPONS: Array<{
  id: string;
  name: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  description: string;
  daysUntilExpiry: number;
  maxUses: number | null;
}> = [
  { id: '88888888-8888-8888-8888-888888888801', name: '新規来店割引',     code: 'WELCOME20', discountType: 'percent', discountValue: 20,   description: '初めてのご来店で 20% OFF',                       daysUntilExpiry: 30, maxUses: null },
  { id: '88888888-8888-8888-8888-888888888802', name: 'リピート促進',     code: 'REPEAT10',  discountType: 'percent', discountValue: 10,   description: '前回来店から 60 日以内の再来店で 10% OFF',     daysUntilExpiry: 60, maxUses: null },
  { id: '88888888-8888-8888-8888-888888888803', name: '季節キャンペーン', code: 'SEASON1K',  discountType: 'fixed',   discountValue: 1000, description: '季節限定 1,000 円 OFF',                          daysUntilExpiry: 45, maxUses: 100  },
  { id: '88888888-8888-8888-8888-888888888804', name: '紹介クーポン',     code: 'FRIEND15',  discountType: 'percent', discountValue: 15,   description: 'お友達紹介でご紹介者・お友達ともに 15% OFF', daysUntilExpiry: 90, maxUses: null },
  { id: '88888888-8888-8888-8888-888888888805', name: '誕生月特典',       code: 'BIRTHDAY',  discountType: 'percent', discountValue: 30,   description: '誕生月のご来店で 30% OFF',                       daysUntilExpiry: 30, maxUses: null },
];

// 美容業界共通プリセット タグ 14 種 (店舗固有名 hardcode せず、カテゴリ別色分け)
// 参照: Projects/LinQ-for-Beauty/.claude/spec.md §「業界共通プリセット - タグカテゴリ」
const TAGS: Array<{ id: string; category: 'treatment' | 'status' | 'segment'; name: string; color: string }> = [
  // 施術タイプ (5、ピンク #f58fb8)
  { id: '99999999-9999-9999-9999-999999999901', category: 'treatment', name: 'カット',         color: '#f58fb8' },
  { id: '99999999-9999-9999-9999-999999999902', category: 'treatment', name: 'カラー',         color: '#f58fb8' },
  { id: '99999999-9999-9999-9999-999999999903', category: 'treatment', name: 'パーマ',         color: '#f58fb8' },
  { id: '99999999-9999-9999-9999-999999999904', category: 'treatment', name: 'トリートメント', color: '#f58fb8' },
  { id: '99999999-9999-9999-9999-999999999905', category: 'treatment', name: 'ヘッドスパ',     color: '#f58fb8' },
  // 顧客ステータス (5、パープル #a78bfa)
  { id: '99999999-9999-9999-9999-999999999911', category: 'status',    name: '新規',           color: '#a78bfa' },
  { id: '99999999-9999-9999-9999-999999999912', category: 'status',    name: 'リピート',       color: '#a78bfa' },
  { id: '99999999-9999-9999-9999-999999999913', category: 'status',    name: 'VIP',            color: '#a78bfa' },
  { id: '99999999-9999-9999-9999-999999999914', category: 'status',    name: '休眠',           color: '#a78bfa' },
  { id: '99999999-9999-9999-9999-999999999915', category: 'status',    name: '失客',           color: '#a78bfa' },
  // 客層 (4、グレー #94a3b8)
  { id: '99999999-9999-9999-9999-999999999921', category: 'segment',   name: '学生',           color: '#94a3b8' },
  { id: '99999999-9999-9999-9999-999999999922', category: 'segment',   name: '主婦',           color: '#94a3b8' },
  { id: '99999999-9999-9999-9999-999999999923', category: 'segment',   name: 'ビジネス',       color: '#94a3b8' },
  { id: '99999999-9999-9999-9999-999999999924', category: 'segment',   name: 'シニア',         color: '#94a3b8' },
];

const CUSTOMERS: Array<{ id: string; name: string; lineUserId: string; phone: string; preferredLocationId: string; tagIds: string[]; chatStatus: 'unread' | 'replied' | 'pending'; engagementTier: 'new' | 'active' | 'sleeping' | 'unknown'; score: number }> = [
  { id: '77777777-7777-7777-7777-777777777701', name: '佐藤 美咲',     lineUserId: 'U0000000000000000000000000000001', phone: '090-1111-1111', preferredLocationId: IKEBUKURO_ID, tagIds: ['99999999-9999-9999-9999-999999999911', '99999999-9999-9999-9999-999999999902'], chatStatus: 'unread',  engagementTier: 'new',      score: 10 },
  { id: '77777777-7777-7777-7777-777777777702', name: '田中 真理',     lineUserId: 'U0000000000000000000000000000002', phone: '090-2222-2222', preferredLocationId: IKEBUKURO_ID, tagIds: ['99999999-9999-9999-9999-999999999912', '99999999-9999-9999-9999-999999999903', '99999999-9999-9999-9999-999999999922'], chatStatus: 'replied', engagementTier: 'active',   score: 45 },
  { id: '77777777-7777-7777-7777-777777777703', name: '鈴木 さくら',   lineUserId: 'U0000000000000000000000000000003', phone: '090-3333-3333', preferredLocationId: AIOI_ID,      tagIds: ['99999999-9999-9999-9999-999999999913', '99999999-9999-9999-9999-999999999905'], chatStatus: 'pending', engagementTier: 'active',   score: 80 },
];

async function main() {
  if (!dbUrl) throw new Error('DATABASE_URL not set in .env');
  console.log(`Seeding tenant=${TENANT_ID}…`);

  const client = postgres(dbUrl, { onnotice: () => {} });
  const db = drizzle(client, { schema });

  // Tenant
  await db
    .insert(tenants)
    .values({ id: TENANT_ID, name: 'サンプル サロン', email: 'owner@sample-salon.test' })
    .onConflictDoUpdate({ target: tenants.id, set: { name: 'サンプル サロン', updatedAt: new Date() } });
  console.log('  ✓ tenant');

  // Locations (slug required by schema)
  // 汎用 demo: 平山さん固有 (池袋 / 相生 / 癒明) を hardcode せず、店舗 A / B のサンプル名で投入
  const IKEBUKURO = {
    id: IKEBUKURO_ID,
    tenantId: TENANT_ID,
    name: '店舗 A',
    slug: 'store-a',
    address: 'サンプル住所 1',
    businessHours: { mon: { open: '11:00', close: '20:00' }, tue: { open: '11:00', close: '20:00' }, wed: { open: '11:00', close: '20:00' }, thu: { open: '11:00', close: '20:00' }, fri: { open: '11:00', close: '20:00' }, sat: { open: '10:00', close: '19:00' }, sun: { open: '10:00', close: '19:00' } },
  };
  const AIOI = {
    id: AIOI_ID,
    tenantId: TENANT_ID,
    name: '店舗 B',
    slug: 'store-b',
    address: 'サンプル住所 2',
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
  console.log('  ✓ locations (店舗 A + 店舗 B)');

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

  // Coupons (業界共通プリセット 5 種、locationId=null で全拠点共通)
  for (const c of COUPONS) {
    const expiresAt = new Date(Date.now() + c.daysUntilExpiry * 86400_000);
    await db
      .insert(coupons)
      .values({
        id: c.id,
        tenantId: TENANT_ID,
        locationId: null,
        name: c.name,
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        description: c.description,
        expiresAt,
        maxUses: c.maxUses,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: coupons.id,
        set: {
          name: c.name,
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          description: c.description,
          expiresAt,
          maxUses: c.maxUses,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`  ✓ coupons (${COUPONS.length})`);

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

  // Tags (業界共通プリセット 14 種)
  for (const t of TAGS) {
    await db
      .insert(tags)
      .values({ id: t.id, tenantId: TENANT_ID, category: t.category, name: t.name, color: t.color })
      .onConflictDoUpdate({
        target: tags.id,
        set: { category: t.category, name: t.name, color: t.color },
      });
  }
  console.log(`  ✓ tags (${TAGS.length})`);

  // Customers (lastReadAt は null にリセット → seed 再実行で未読が復活する、Day 3 で chatStatus/engagementTier/score も投入)
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
        chatStatus: c.chatStatus,
        engagementTier: c.engagementTier,
        score: c.score,
        lastReadAt: null,
      })
      .onConflictDoUpdate({
        target: customers.id,
        set: {
          name: c.name,
          phone: c.phone,
          preferredLocationId: c.preferredLocationId,
          chatStatus: c.chatStatus,
          engagementTier: c.engagementTier,
          score: c.score,
          lastReadAt: null,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`  ✓ customers (${CUSTOMERS.length})`);

  // Customer-Tag 関連 (デモタグ付与、既存を一旦消してから再投入)
  for (const c of CUSTOMERS) {
    await db.delete(customerTags).where(eq(customerTags.customerId, c.id));
    for (const tagId of c.tagIds) {
      await db.insert(customerTags).values({ customerId: c.id, tagId }).onConflictDoNothing();
    }
  }
  const totalAssignments = CUSTOMERS.reduce((sum, c) => sum + c.tagIds.length, 0);
  console.log(`  ✓ customer_tags (${totalAssignments} assignments)`);

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
  console.log('  ✓ messages (sample conversations: 店舗 A 1, 店舗 B 1)');

  // Rich menus (clear and re-insert)
  // 業界向けひな型「定番 6 ボタン (2×3)」で初期登録、URL 系は空欄 (テナント側で後から編集)
  await db.delete(richMenus).where(eq(richMenus.tenantId, TENANT_ID));
  const CLASSIC_6_AREAS = [
    { bounds: { x: 0,    y: 0,   width: 833, height: 843 }, action: { type: 'uri',     uri: '', label: '予約する' },        label: '予約する' },
    { bounds: { x: 833,  y: 0,   width: 834, height: 843 }, action: { type: 'message', text: 'クーポンを見たい' },           label: 'クーポン' },
    { bounds: { x: 1667, y: 0,   width: 833, height: 843 }, action: { type: 'message', text: 'メニューを教えて' },           label: 'メニュー・料金' },
    { bounds: { x: 0,    y: 843, width: 833, height: 843 }, action: { type: 'message', text: '店舗情報を教えて' },           label: '店舗・アクセス' },
    { bounds: { x: 833,  y: 843, width: 834, height: 843 }, action: { type: 'message', text: 'スタンプを見せて' },           label: 'ショップカード' },
    { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: 'uri',     uri: '', label: 'SNS' },              label: 'SNS' },
  ];
  await db.insert(richMenus).values([
    {
      tenantId: TENANT_ID,
      locationId: IKEBUKURO_ID,
      lineAccountId: LINE_ACCOUNT_ID,
      name: '店舗 A 通常メニュー',
      chatBarText: 'メニュー',
      size: { width: 2500, height: 1686 },
      areas: CLASSIC_6_AREAS,
      isDefault: true,
      isActive: false,
    },
    {
      tenantId: TENANT_ID,
      locationId: AIOI_ID,
      lineAccountId: LINE_ACCOUNT_ID,
      name: '店舗 B 通常メニュー',
      chatBarText: 'メニュー',
      size: { width: 2500, height: 1686 },
      areas: CLASSIC_6_AREAS,
      isDefault: false,
      isActive: false,
    },
  ]);
  console.log('  ✓ rich-menus (店舗 A + 店舗 B、定番 6 ボタン構成)');

  // Forms (clear and re-insert) — 美容室向けサンプル 1 件 (業界実例ベース)
  await db.delete(forms).where(eq(forms.tenantId, TENANT_ID));
  await db.insert(forms).values({
    tenantId: TENANT_ID,
    locationId: IKEBUKURO_ID,
    name: 'カウンセリングシート (美容室サンプル)',
    slug: 'sample-counseling',
    category: 'hair_salon',
    description: '初回ご来店前に、お客様情報を事前にお伺いします。スムーズなご案内のためご協力ください。',
    fields: [
      {
        id: 'name',
        type: 'short_text',
        label: 'お名前',
        required: true,
        placeholder: '例: 山田 花子',
      },
      {
        id: 'motivation',
        type: 'long_text',
        label: '今回の来店理由・なりたいイメージ',
        required: false,
        placeholder: '例: 伸びたので整えたい / 髪色を明るくしたい / 結婚式に向けてイメチェン',
        helperText: '「ふんわり」などの曖昧表現より、雰囲気が伝わると提案精度が上がります',
      },
      {
        id: 'concern',
        type: 'multi_choice',
        label: '髪の悩み',
        required: false,
        options: ['くせ毛', 'ボリューム不足', '白髪', 'ダメージ', 'カラー退色', '広がり', '頭皮のかゆみ', 'その他'],
      },
      {
        id: 'allergy',
        type: 'single_choice',
        label: 'カラー・パーマでかぶれた経験',
        required: true,
        options: ['ない', 'ある', '不明'],
      },
      {
        id: 'allergy_detail',
        type: 'long_text',
        label: 'かぶれた経験の詳細',
        required: false,
        placeholder: '例: 〇〇というカラー剤で頭皮が赤くなった / かゆみが 1 週間続いた',
        helperText: '「ある」と回答した方のみご記入ください',
        showIf: { fieldId: 'allergy', mode: 'equals', equals: 'ある' },
      },
      {
        id: 'reference',
        type: 'image',
        label: '理想のヘアスタイル写真 (任意)',
        required: false,
        helperText: 'なりたい雰囲気が伝わる写真を 1〜3 枚。SNS のスクリーンショットも OK',
      },
    ],
    autoTagIds: [],
    thankYouMessage: 'この度はご回答いただき誠にありがとうございます。当日お会いできるのを心より楽しみにしております。',
    isPublished: true,
  });
  console.log('  ✓ forms (カウンセリングシート サンプル 1 件、業界実例ベース、公開済)');

  // ========== ステップ配信プリセット 2 種 (Day 13 業界黄金パターン) ==========
  await db.delete(stepScenarios).where(eq(stepScenarios.tenantId, TENANT_ID));

  // (A) 新規友だち追加 → 4 週間フォロー
  const [scenarioA] = await db
    .insert(stepScenarios)
    .values({
      tenantId: TENANT_ID,
      name: '新規友だち追加 → 4 週間フォロー',
      description: '友だち追加 → 翌日お礼 → 1 週間後使い心地確認 → 4 週間後再来店案内',
      triggerType: 'friend-add',
      triggerConfig: {},
      isActive: true,
    })
    .returning();

  await db.insert(stepMessages).values([
    {
      scenarioId: scenarioA.id,
      delayMinutes: 1440, // 1 日後
      sortOrder: 0,
      messageContent: {
        type: 'text',
        text: '昨日はご来店ありがとうございました。\n仕上がりはいかがでしたでしょうか?\n気になる点があればお気軽にメッセージください。',
      },
    },
    {
      scenarioId: scenarioA.id,
      delayMinutes: 1440 * 6, // 1 週間後 (前ステップ = 1 日後 から 6 日)
      sortOrder: 1,
      messageContent: {
        type: 'text',
        text: 'ご来店から 1 週間が経ちました。\n髪・お肌の調子はいかがですか?\n次回のご相談もお気軽にお知らせください。',
      },
    },
    {
      scenarioId: scenarioA.id,
      delayMinutes: 1440 * 21, // 4 週間後 (前ステップ = 1 週後 から 3 週間)
      sortOrder: 2,
      messageContent: {
        type: 'text',
        text: '前回のご来店から約 4 週間が経ちました。\nそろそろメンテナンスの時期です。\nご都合の良いお日にちをお知らせいただければ、ご予約お取りいたします。',
      },
    },
  ]);

  // (B) カラー後 6 週間サイクル (reservation-completed トリガー)
  const [scenarioB] = await db
    .insert(stepScenarios)
    .values({
      tenantId: TENANT_ID,
      name: 'カラー後 6 週間サイクル',
      description: '来店完了 → 6 週間後にリタッチ案内、カラー利用者向け',
      triggerType: 'reservation-completed',
      triggerConfig: {}, // serviceId は本番運用でカラーメニュー ID を設定
      isActive: false, // serviceId 未設定なので OFF で投入 (運営が ON に切替)
    })
    .returning();

  await db.insert(stepMessages).values([
    {
      scenarioId: scenarioB.id,
      delayMinutes: 1440 * 42, // 6 週間後
      sortOrder: 0,
      messageContent: {
        type: 'text',
        text: '前回のカラーから 6 週間が経ちました。\n根元のリタッチはいかがでしょうか?\nご希望のお日にちをお知らせください、お席をお取りいたします。',
      },
    },
  ]);

  console.log(`  ✓ step_scenarios (業界プリセット 2 種: 新規 4 週間フォロー / カラー後 6 週間サイクル)`);

  await client.end();
  console.log('Seed done.');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
