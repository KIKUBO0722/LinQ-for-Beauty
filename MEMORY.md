# LinQ for Beauty — 未完タスク (Pending)

本ファイルはプロジェクトルートの pending 項目管理用。
Vault MOC: `C:\dev\Claude manager\work\active\LinQ for Beauty.md`

## Day 0 状況 (2026-04-24)

### 完了
- [x] `C:\dev\Hirayama Project` → `C:\dev\LinQBeauty` リネーム
- [x] pnpm + Turbo monorepo 初期化
- [x] NestJS API (`apps/api`) + Next.js 15 (`apps/web`) スキャフォールド
- [x] `packages/db` Drizzle スキーマ骨格 (全テーブル定義済み)
- [x] `packages/shared` スキャフォールド
- [x] AI 拡張ポイントスタブ (`apps/api/src/modules/ai/`)
- [x] `.env.example` 作成
- [x] API / Web ビルド通過

### 残タスク (手動作業)
- [ ] **Supabase** プロジェクト作成 → `DATABASE_URL` を `.env` に設定 → `pnpm --filter @linq-beauty/db run push`
- [ ] **GitHub** リポジトリ `linq-for-beauty` (private) 作成
- [ ] **LINE** 公式アカウント作成 → `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` を `.env` に設定
- [ ] `pnpm dev` (API + Web 同時起動) の動作確認
- [ ] `GET http://localhost:3001/health` → 200 確認

## 次のセッション (Week 1 開始)

優先順：
1. カレンダー API 実装 (`apps/api/src/modules/calendar/`)
2. 予約管理 API 実装 (`apps/api/src/modules/reservations/`)
3. Next.js カレンダー画面 (FullCalendar 組み込み)

参照: `C:\dev\Claude manager\thinking\2026-04-24-linq-for-beauty-calendar-technical-design.md`

## 保留事項

### 事業判断
- [ ] モニター後の継続費用 (面談で10,000円は反応悪し)
- [ ] LINE ビューティープラス (2026-06 参入) への対応戦略 確定待ち

### 平山さんへの次回確認 (数値要件)
- 施術時間・カウンセリング時間 (コース別)
- 1 日最大予約件数
- 営業時間・定休日 (東京 / 相生 各)
- 相生開店日

## メモ

- Git init しない (後で GitHub リモートのみ追加)
- 面談文字起こし後半 (20:40:00 以降) は必要時に追加保存
- オリジナル LinQ (`C:\dev\LINEsupport`) は参照のみ、write 禁止
