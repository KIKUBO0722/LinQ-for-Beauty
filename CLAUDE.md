# LinQ for Beauty — CLAUDE.md

鬼窪 (KIKUBO0722) が個人開発する美容室向け AI ファースト × LINE ネイティブ × 二拠点対応 SaaS。第 1 号パイロットは平山明日奈さん (屋号 癒明/ユア、東京池袋 + 兵庫相生の二拠点)。事業判断の経緯・実装ロードマップの詳細は本ファイルに書かない — 下記「読む順序」で Vault 側を参照する。

## 実装セッションの読む順序 (毎回)

1. **現在地ボード**: `C:/dev/Claude manager/Projects/LinQ-for-Beauty/.claude/todo.md` — 「S1〜S36 進捗表」で次に着手する S を確認する。これが進捗の正本、本ファイルには複製しない
2. **キックオフプロンプト**: `C:/dev/Claude manager/Projects/LinQ-for-Beauty/.claude/design-2026-07/07-implementation-plan.md` の付録から該当 S のプロンプトを取得
3. **設計詳細**: 同フォルダの `01-mustfix-pack.md` 〜 `06-karte-ai.md` の該当節を読む (`README.md` に全体地図と確定技術方針の根拠がある)
4. セッション終了時: 07 付録冒頭の「共通義務」(進捗表更新・逸脱ログ記録・曖昧点は独断で埋めない) を実行してから終了する

## リポジトリ構成

| パス | 役割 |
|---|---|
| `C:/dev/LinQBeauty` | 本プロジェクト monorepo (このリポジトリ自身) |
| `C:/dev/LinQ` | オリジナル LinQ。パターン参照のみ、コピー禁止・write 禁止 |
| `C:/dev/Claude manager/Projects/LinQ-for-Beauty/.claude/` | 設計台帳の正本 (spec/prompt_plan/todo + `design-2026-07/`) |
| `C:/dev/Claude manager/案件/進捗中案件/LinQ for Beauty.md` | Vault 概要ノート |

## 技術スタック (実コード確認済み。疑わしい箇所は package.json を直接見る)

- モノレポ: pnpm 10 + Turborepo 2 (`apps/*` `packages/*`、実体は `apps/api` `apps/web` `packages/db`)
- API: NestJS 11、TypeScript。tsconfig は Nest 既定 (`strictNullChecks`/`noImplicitAny` 等) — `strict: true` の完全 strict ではない
- Web: Next.js 16 (App Router) + React 19 + Tailwind v4。ビルドは `next build --webpack` 固定。静的書き出し (`output: 'export'`) はまだ未設定 — v0.1b (S10-S13) で導入予定
- DB/ORM: PostgreSQL (Supabase) + Drizzle ORM。スキーマは `packages/db/src/schema/`
- LINE: `@line/bot-sdk`。ICS: `ical-generator`。AI: `@anthropic-ai/sdk`。カレンダー UI: FullCalendar (React)
- 認証: next-auth v4 (`apps/web`) が依存関係に残存。JWT 移行 (方針 3) の着手有無は未確認 — 着手前に `apps/api/src/modules/` に `auth` モジュールが存在するか確認すること
- ジョブキュー: BullMQ + Redis (`@nestjs/bullmq`, `bullmq`) が現状稼働中。pg-boss 移行 (方針 2) の着手有無は `ioredis|bullmq|REDIS_|pg-boss` を grep して確認すること (旧構成が残っている可能性が高い)
- テスト: `apps/api` は Jest (unit: `pnpm --filter api test`、e2e: `pnpm --filter api test:e2e`、設定は `test/jest-e2e.json`)。`vitest` と `@testcontainers/postgresql` は devDependencies にあるが config・使用箇所は未確認 (未使用の可能性)。Playwright は導入されていない。`apps/web` に test script はない

## 確定技術方針 8 点 (2026-07-12 裁定、再検討しない)

詳細と根拠は `design-2026-07/README.md` の「確定技術方針」表を見る。要約:

1. api = Render Web Service Starter (常時起動) / web = Static Site 無料 / DB = Supabase Free
2. Redis 丸ごと撤廃 → pg-boss (ジョブを Supabase Postgres の行として永続化)
3. 認証 = Passport 不使用の `@nestjs/jwt` + グローバル Guard + `@Public()`。next-auth は除去対象
4. web は静的書き出しのため Bearer トークン方式 (localStorage + Authorization ヘッダ)
5. セルフ予約 = 未認証 LINE ミニアプリ (liff)。チャネルは既存 Messaging API チャネルと同一プロバイダー配下 (不可逆)
6. AI カルテは v0.3 でテキスト入力 + Claude structured outputs から開始、音声は後続
7. JST 日付処理は `Intl.DateTimeFormat(timeZone: 'Asia/Tokyo')` 明示に統一。TZ 環境変数への暗黙依存を書かない
8. 遅延実行は pg-boss / steps 毎分ポーリング / v0.3 followup ポーリングの 3 系統、無理に統一しない

## 検証コマンド

- `pnpm build` — turbo 経由で `packages/db` → `apps/api` → `apps/web` の順にビルド
- `pnpm --filter api test` / `pnpm --filter api test:e2e`
- `pnpm lint` (turbo 経由で全パッケージ) / `pnpm --filter api lint` / `pnpm --filter web lint`
- `pnpm --filter @linq-beauty/db generate` / `push` / `studio` — Drizzle スキーマ変更時

## 禁止事項

- `C:/dev/LinQ` (オリジナル) に write しない。読んでパターン学習のみ
- コード側リポジトリに `.claude/spec.md` 等の設計台帳を作らない (正本は Vault 側、上記参照)
- 相生の「場所貸し」機能をこのプロジェクト内で実装しない (スコープ外)
- AI 顧問サービスをスコープに含めない
- 平山さんに技術的な選択を問わない (問うのは事業判断・好みのみ)
- push は既に可能な状態 (GitHub 資格情報は個人 KIKUBO0722、`origin/main` あり) だが毎回鬼窪さんの承認を得てから実行する

## 作業方針

技術選択は Claude が決める (ユーザー確認は事業判断・好みのみ)。推奨ベース宣言形式で進める。

## デザイン規約

LP・管理画面・LINE 関連 UI を生成・改修するときは `DESIGN.md` (§1〜§9) を厳守。配色・タイポ・余白・コンポーネント Do/Don't はこのファイルが単一の真実源。視覚参照は `docs/design-references/01-hirokei-fullpage.png`。迷ったら HIROKEI トーン (ピンク→パープルグラデの大型英字 Hero + 円形ブロック + Venn 図 + ピル型 CTA + 広い余白 + 温度感のある人物写真) を優先する。グラデは 2 箇所以下、LINE グリーンは機能色のみ、数値で語る、押し売りフレーズ禁止。
