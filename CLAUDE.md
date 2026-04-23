# LinQ for Beauty — CLAUDE.md

## プロジェクト概要

**LinQ for Beauty** は鬼窪（KIKUBO0722）が個人開発する **国内初の「AI ファースト × LINE ネイティブ × 二拠点対応」美容業界特化 SaaS**。

オリジナル LinQ（`C:\dev\LINEsupport`）は参照元のみ。LinQ for Beauty は美容業界向けにゼロから独立して構築する。

- **開発者**: 鬼窪（GitHub: `KIKUBO0722`）
- **第 1 号パイロット**: 平山明日奈さん（屋号「癒明 / ユア」、東京・池袋 + 兵庫・相生の二拠点）
- **v0.1 リリース目標**: 2026-05-22

## コードリポジトリ

| パス | 役割 |
|------|------|
| `C:\dev\LinQBeauty` | 本プロジェクト（monorepo） |
| `C:\dev\LINEsupport` | オリジナル LinQ（参照のみ、write 禁止） |
| `C:\dev\Claude manager\Projects\LinQ-for-Beauty\.claude\` | Harper 型 3 ファイル (spec / prompt_plan / todo) |
| `C:\dev\Claude manager\work\active\LinQ for Beauty.md` | Vault MOC ノート |

## Monorepo 構成

```
C:\dev\LinQBeauty\
├── apps/
│   ├── api/              # NestJS バックエンド (port 3001)
│   └── web/              # Next.js 15 フロントエンド (port 3000)
├── packages/
│   ├── db/               # Drizzle ORM スキーマ + マイグレーション
│   └── shared/           # 共通型・ユーティリティ
├── .github/
│   └── workflows/        # CI/CD
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── CLAUDE.md             # このファイル
├── MEMORY.md             # 保留・未決事項
└── docs/                 # 設計文書
    └── development-plan-v1.md
```

## 差別化 3 軸

> **「カルテ記入ゼロ」「受付人件費ゼロ」「経営判断を口頭で」**

| 軸 | v0.1 | Phase 2 |
|----|------|---------|
| カルテ記入ゼロ | 拡張ポイント設計のみ | AI 音声カルテ |
| 受付人件費ゼロ | 拡張ポイント設計のみ | AI Receptionist LINE |
| 経営判断を口頭で | 拡張ポイント設計のみ | AI Analyst (Phase 3) |

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| パッケージ管理 | pnpm + Turborepo |
| バックエンド | NestJS (TypeScript strict) |
| フロントエンド | Next.js 15 (App Router) + Tailwind v4 |
| ORM | Drizzle ORM |
| DB | PostgreSQL (Supabase) |
| カレンダー UI | FullCalendar (React) |
| LINE | @line/bot-sdk |
| ICS | ical-generator |
| テスト | Vitest + Playwright + testcontainers |

## 確定設計方針

> 鬼窪判断 (2026-04-24) — これらは再検討しない

- 仕事カレンダー = LinQ for Beauty 独自開発で完結
- 個人スケジュール = 平山さん個人の Google Calendar（逆方向取り込みなし）
- LinQ → 個人 Google の一方向プッシュ: v0.1 = ICS / Phase 2 = API push
- 二拠点（東京 / 相生）を v0.1 から両方 ON
- 拠点別ブランディング（リッチメニュー画像・カラー）対応
- リッチメニュー = エリア選択タブ常設
- LP 機能は Phase 2 に降格（v0.1 はリッチメニュー直リンクで代替）

## 平山さんヒアリング未決 (数値要件)

- [ ] 施術時間・カウンセリング時間（コース別）
- [ ] 1 日最大予約件数
- [ ] 営業時間・定休日（東京 / 相生 各）
- [ ] 出張頻度・パターン
- [ ] 相生開店日
- [ ] リピート率 / 新規客比率

## オリジナル LinQ 参照マップ（コピー禁止、パターン学習のみ）

| 参照ファイル | 学習する内容 |
|-------------|-------------|
| `apps/api/src/common/decorators/tenant.decorator.ts` | `@TenantId()` パターン |
| `apps/api/src/common/guards/auth.guard.ts` | JWT 認証ガード |
| `apps/api/src/modules/line/line.service.ts` | LINE API ラッパー |
| `apps/api/src/modules/reservations/reservations.service.ts:241-272` | スロット生成ロジック |
| `apps/api/src/modules/rich-menus/rich-menus.service.ts:330-425` | タブ型リッチメニュー |
| `packages/db/src/schema/reservations.ts` | Drizzle スキーマパターン |

## 禁止事項

- **Git init しない**（LinQ 母体管理に委ねる。後で GitHub リモートを設定）
- `C:\dev\LINEsupport` に write しない
- 相生の場所貸し機能をこのプロジェクト内で実装しない
- AI 顧問サービスをスコープに含めない
- 平山さんに技術的な選択を問わない

## 作業方針

- 推奨ベース・宣言形式（「○○で進めます」と宣言）
- 技術選択は Claude が決める、ユーザーへの確認は事業判断・好みのみ
- v0.1 = AI なし、Phase 2 から AI 機能追加（拡張ポイントは v0.1 設計段階で組み込み）
