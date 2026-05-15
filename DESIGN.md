---
name: linq-for-beauty-design-system
description: LinQ for Beauty の LP・管理画面・LINE 関連 UI を Claude Code が一貫して生成するための単一の真実源。HIROKEI トーン (ピンク→パープルグラデ + 余白 + 円形 + 温度感のある人物写真) を美容業界向けに翻訳した版
version: 0.2.0
inspired_by:
  - HIROKEI (https://www.hirokei.co.jp/) — 唯一の視覚参考。ピンク→パープルグラデ大型英字、円形ブロック、Venn 図、フルグラデ CTA セクション、ピル型ボタン
references_dir: docs/design-references/
---

# LinQ for Beauty — DESIGN.md

LinQ for Beauty の **LP・管理画面・LINE 連携 UI** を Claude Code が生成するときの単一の真実源。
このファイルと `docs/design-references/` を**毎回**読んでから UI を出力すること。

> Agent Prompt Guide: UI 生成前に必ず本書 §1〜§9 を全文走査し、`docs/design-references/01-hirokei-fullpage.png` を視覚参照とする。判断に迷ったら **HIROKEI トーン (§1)** を優先する。

---

## §1. Visual Theme & Atmosphere

**核となる感性: 上品 / 柔らかい / プロフェッショナル / 温度感のある信頼。**

- **言葉のトーン**: 誇張・煽り・絵文字過多を禁止。「ちょっとだけ上」「ずっと安い」「使いやすい」を上品に伝える。美容業界らしい繊細さを保つ。
- **ビジュアルトーン**: 白ベースに **ピンク → パープル** のグラデーションを大型英字タイポと装飾線・フルセクション CTA で使う。グレースケールが骨格、グラデーションが情緒。
- **動き**: 過度なアニメーションを禁止。スクロール時のフェードイン (300–500ms / ease-out) と CTA の hover lift (1〜2px)、装飾の波カーブを **ゆったり横スライドさせる** (8–12s loop) に限定。
- **写真・イメージ**: 人物中心の実写を温度感を保ったまま使う (HIROKEI スタイル)。スタッフ・サロン現場・施術風景・経営者の顔。彩度を 10% 程度落として上品さを保つ。

**禁止する世界観**: ネオン、原色、ホットピンク 1 色べた塗り、競合 LINE ビューティープラスの「先行予約 75% OFF」型バナー押し付け、ガーリー過剰 (ハート・キラキラ装飾)。

---

## §2. Color Palette & Roles

### グレースケール (骨格)

| Token | 値 | 役割 |
|------|----|----|
| `--ink-900` | `#1A1A1A` | 主要見出し・本文濃色 |
| `--ink-700` | `#2E2E2E` | 副次見出し |
| `--ink-500` | `#5C5C5C` | 本文 |
| `--ink-300` | `#A8A8A8` | 補助テキスト |
| `--ink-100` | `#E8E8E8` | 罫線・dividers |
| `--surface-0` | `#FFFFFF` | 主背景 |
| `--surface-50` | `#FBFAFC` | セクション交互背景 (うっすら紫みを帯びる) |
| `--surface-100` | `#F5F3F8` | カード背景 |

### ブランドグラデーション (情緒)

| Token | 値 | 役割 |
|------|----|----|
| `--brand-pink` | `#F58FB8` | グラデ開始色 (温かい桜ピンク) |
| `--brand-pink-light` | `#FBC8DC` | 装飾波カーブの薄色 |
| `--brand-purple` | `#B89AEC` | グラデ終了色 (ラベンダー) |
| `--brand-purple-light` | `#DCCFF5` | 装飾波カーブの薄色 |
| `--gradient-primary` | `linear-gradient(135deg, #F58FB8 0%, #B89AEC 100%)` | Hero 大型タイポ・フッター手前 CTA セクション |
| `--gradient-soft` | `linear-gradient(135deg, #FBC8DC 0%, #DCCFF5 100%)` | 装飾・薄背景 |

### 機能色 (用途限定)

| Token | 値 | 役割 |
|------|----|----|
| `--line-green` | `#06C755` | **LINE 関連の機能アイコン・LINE ボタンのみ**。装飾には絶対使わない |
| `--danger` | `#DC2626` | エラー・解約警告 (LINE BP 比較表のみ) |
| `--success` | `#10B981` | 完了通知・予約確定 (管理画面のみ) |

### 使用ルール (rationing)

- **`--gradient-primary` は 1 画面で 2 箇所まで** — 通常は「Hero の大型英字タイポ」+「フッター手前の CTA セクション」のセット。それ以外には使わない。
- **`--brand-pink` `--brand-purple` 単色のべた塗りは原則禁止** (グラデで使う前提)。例外的にチップやアイコンの薄色背景は OK。
- **`--line-green` は LINE Messaging / LINE ログイン / LINE 連携アイコンのみ**。CTA ボタンや装飾には使わない (HIROKEI トーンを壊すため)。
- グレースケール 6 段の中で**コントラスト比 4.5:1** を満たす組み合わせのみ使う (WCAG AA)。
- 競合比較表の「LINE BP は 2 年目 2 倍」など警告文脈でのみ `--danger` を使う。LinQ 自身の説明には使わない。

---

## §3. Typography Rules

| 役割 | フォント | サイズ (desktop) | サイズ (mobile) | weight | letter-spacing |
|------|---------|------------------|-----------------|--------|----------------|
| Hero Display (英字、グラデ) | "Inter Tight", "Outfit", sans-serif | 96–128px | 56–72px | 800 | -0.03em |
| Hero Sub (日本語) | "Noto Sans JP" | 18–22px | 16–18px | 500 | 0.02em |
| H1 | "Inter Tight", "Noto Sans JP" | 40–48px | 28–32px | 700 | -0.015em |
| H2 | 同上 | 28–32px | 22–24px | 700 | -0.01em |
| H3 | 同上 | 20–22px | 18px | 600 | 0 |
| Body | "Inter", "Noto Sans JP" | 16px | 16px | 400 | 0 |
| Caption | 同上 | 13–14px | 13px | 400 | 0.01em |
| Numeric (価格・KPI) | "Inter Tight" | 56–72px | 40–48px | 800 | -0.02em (tabular-nums) |

### Hero 大型英字タイポ専用ルール

- HIROKEI の「BE THE BEST PARTNER」型の **英字 2〜4 単語の短いキャッチ** を 1 度だけ使う
- 候補 (検討用): `BEAUTY, ON LINE.` / `LINK FOR BEAUTY` / `SALON, REIMAGINED.`
- **必ず `--gradient-primary` を `background-clip: text` でテキストに適用**
- 改行は単語の意味の切れ目で。1 行で長すぎる場合は 2 行に
- 日本語キャッチコピーは英字タイポの**下に小さく**配置 (主従関係を明確に)

### 日本語処理

- **長文見出しは BudouX で改行ヒント挿入**。手動の `<br>` で改行制御しない。
- 日本語と英数字の混在では `font-feature-settings: "palt"` で詰める。
- 行間: 日本語見出し 1.4 / 日本語本文 1.8 (HIROKEI はやや広め) / 英数字本文 1.5。

---

## §4. Component Stylings

### Button — ピル型 (HIROKEI 準拠)

| 種別 | 背景 | 文字色 | 罫線 | 角丸 | パディング | 用途 |
|------|------|--------|------|------|------------|------|
| Primary | `--surface-0` | `--ink-900` | 1px `--ink-100` | **fully rounded (9999px)** | 16px 32px | 主要 CTA (無料で試す等) |
| Primary on Gradient | `--surface-0` | `--ink-900` | none | fully rounded | 16px 32px | グラデ CTA セクション上の白ピル |
| Secondary | transparent | `--ink-900` | 1px `--ink-300` | fully rounded | 16px 32px | 副次 CTA (資料を見る) |
| LINE Connect | `--line-green` | `#FFFFFF` | none | fully rounded | 14px 28px | LINE 連携専用 (LINE ロゴ左) |
| Ghost | transparent | `--ink-700` | none | fully rounded | 12px 24px | テキストリンク強化 |

- hover: `translateY(-1px)` + shadow `0 6px 16px rgba(184, 154, 236, 0.20)` (薄いパープル影)、200ms ease-out
- focus-visible: `outline: 2px solid var(--brand-purple); outline-offset: 3px`
- disabled: opacity 0.4、pointer-events: none

### Card

- 背景 `--surface-0` または `--surface-100`、罫線**なしを推奨** (HIROKEI は罫線少なめ)
- 角丸 20px、パディング 28–40px、シャドウ既定なし (hover 時のみ薄く)

### 円形ブロック (HIROKEI の「4 つの理由」型)

- 直径 200–240px の正円、`border: 1.5px solid var(--brand-pink-light)`
- 背景 `--surface-0`、内側中央寄せでタイトルと小さな説明
- 4 個 1 セットで横並びが基本、mobile では 2 列 × 2 行
- hover: ボーダーが `--brand-pink` に濃くなる、200ms

### Venn 図 (HIROKEI の事業内容型) — 任意

- 2 円が中央で 30% 重なる。各円直径 280–320px、`background: rgba(245, 143, 184, 0.10)` と `rgba(184, 154, 236, 0.10)` の薄塗り
- 重なる部分にロゴアイコン群を配置
- 大きな機能ブロック紹介で 1 度だけ使う

### Pricing Table

- 3 列固定 (Free / Standard / Pro)、推奨プランのみ `--gradient-primary` で**枠線 2px**を作る (`background-image` ボーダー技法)
- 価格は Numeric タイポで大きく、月額単位は `--ink-500` で小さく `/月`
- 「LINE BP 比 -71%」のような比較バッジは `--ink-900` 背景 + 白テキストで控えめに

### Form

- 入力枠: 1px `--ink-300`、focus 時 `--brand-purple` に変化、角丸 12px
- ラベル: 14px、`--ink-700`、入力枠の上に配置 (フローティングラベル禁止)
- 必須マークは小さく `--danger`、エラーメッセージは枠下 12px

### 波カーブ装飾 (HIROKEI Hero 背景)

- SVG パスで 2〜3 本の緩い波線を描き、各色は `--brand-pink-light` `--brand-purple-light` の半透明 (alpha 0.6)
- 線幅 2px、Hero の中央〜下部に重ねる
- アニメ: 8–12 秒で右へ 20–40px ゆっくり並行移動して戻る (`ease-in-out infinite alternate`)

---

## §5. Layout Principles

- **8px グリッド** (spacing は 8 / 16 / 24 / 32 / 48 / 64 / 96 / 128 / 160 のみ)
- **最大コンテンツ幅 1180px**、両端 padding は desktop 80px / tablet 32px / mobile 24px
- **Hero**: 縦 100vh、英字大型タイポを左上に、日本語キャッチを右側または下部に。HIROKEI のように **テキスト左揃え** が基本
- **セクション間 vertical rhythm**: 128–160px (desktop) / 80–96px (mobile) — HIROKEI は余白を広く取る
- **セクション見出しは中央揃え**、英字小キャプション (e.g. `BEST PARTNER`) を上に、日本語見出しを下に配置

### Hero の固定構造 (LP 用)

1. 上部にナビ (透明背景 + ロゴ + メニュー + 右端 CTA ピル 2 個: `RECRUIT` 相当 = 「資料 DL」、`お問い合わせ` 相当 = 「無料で試す」)
2. 左寄せ大型英字タイポ (グラデ、2〜4 単語、2 行可) — **このページの主役**
3. 右側または英字下部に日本語キャッチコピー 4〜5 行 (「半世紀の信頼と実績」位置)
4. 背景に波カーブ装飾 2〜3 本を半透明で重ねる
5. Hero 下に三連数字または 3 つの特徴 (HIROKEI の「55 年」「100 年企業」相当を LinQ 流に置換: 「¥4,000〜」「解約自由」「LINE ひとつで」)

### セクション標準テンプレ (HIROKEI 4 セクション構成を踏襲)

1. **イントロ** (大型ロゴ + ミッションコピー + 3 つの主要ページへの写真カード)
2. **BEST PARTNER 型** (英字キャプション + 日本語 H2 + 円形ブロック 4 個)
3. **事業内容 (Venn 図)** — LinQ 用に置換: 「LINE で顧客対応」と「管理画面で経営判断」の 2 円が重なる
4. **お知らせ + 採用情報** — LinQ 用に置換: 「最新アップデート + 導入を検討中の方へ」
5. **フルグラデ CTA セクション** — 紫ピンクグラデ背景、白ピル CTA 2 個

---

## §6. Depth & Elevation

シャドウは **3 段階のみ**。多用しない。色味のあるシャドウを使う (HIROKEI 風)。

- `--elev-1`: `0 2px 6px rgba(184, 154, 236, 0.08)` — カード hover、固定ヘッダー
- `--elev-2`: `0 8px 24px rgba(184, 154, 236, 0.12)` — モーダル、ドロップダウン
- `--elev-3`: `0 24px 48px rgba(245, 143, 184, 0.15)` — フルグラデ CTA セクションのフローティングカード

それ以上の depth (光るボーダー、ネオン、グロー) は**禁止**。

---

## §7. Do's and Don'ts

### ✅ Do

- 数値で語る (「カルテ記入時間 -90%」「2 年目も同じ ¥4,000」)
- 実名 + 顔写真 + 具体効果でお客様の声を構成する (平山さん想定)
- 競合比較で LINE BP の弱点 (年契約縛り / 2 年目 2 倍) を客観事実として 1 度だけ提示
- 「ヘア / ネイル(準備中) / エステ(準備中) / まつげ(準備中)」の業種タブで将来余白を可視化
- グラデ大型英字タイポは Hero に 1 度、CTA セクションに 1 度の **2 回限り**
- 円形ブロックを 4 個 1 セットで使う (HIROKEI 流)
- 余白を広く取る (HIROKEI レベル: セクション間 128–160px)
- 装飾の波カーブはゆっくり動かして温度感を出す
- フッター手前にフルグラデ CTA セクションを 1 個置く

### ❌ Don't

- ロゴ壁の捏造 (導入実績が少ない初期に「導入 1,000 店突破」風の見栄えを作らない)
- 押し売りフレーズ (「今すぐ申し込まないと損」「初年度限定」)
- 「押し売りしません」のような自己弁護フレーズ (鬼窪さん明示禁止)
- 形式的な「業務」表現
- グラデーションを 3 箇所以上同時使用 (主役が分散する)
- LINE グリーンを CTA や装飾に使う (機能色のみ)
- ホットピンク単色べた塗り
- ハート・キラキラ・絵文字装飾
- 文字を白抜きする多色背景
- セクション間を詰めすぎる (HIROKEI の広い余白を維持)

---

## §8. Responsive Behavior

| Breakpoint | 幅 | 主な挙動 |
|------------|----|----|
| mobile | < 640px | 1 カラム、Hero 英字は 56–72px、円形ブロックは 2 × 2、padding 24px |
| tablet | 640–1024px | Hero 2 カラム維持、3 列カードは 2 列に、円形ブロックは 4 個横並び維持 |
| desktop | ≥ 1024px | 既定値、最大幅 1180px |

- 価格表は mobile では**横スクロールではなく縦積み** (3 カード縦並び)
- ナビゲーションは mobile でハンバーガー、デスクトップは横並びテキストリンク + 右端 CTA ピル 2 個
- 業種タブは mobile では水平スクロール許可
- Venn 図は mobile で**縦積み** (2 円が上下に並ぶ)、重なる部分は中央に

---

## §9. Agent Prompt Guide (Claude Code 用)

UI を生成・改修するときは以下の順で考えること:

1. 対象は LP か / 管理画面か / LINE リッチメニュー側か を確認
2. **`docs/design-references/01-hirokei-fullpage.png` を必ず参照**して視覚的方向性を取り込む
3. §2 配色 → §3 タイポ → §4 コンポーネント → §5 レイアウト の順で骨格を決める
4. §7 Don't に該当しないか自己レビュー
5. 最後に: 「グラデは 2 箇所以下か」「数値で語っているか」「実名証言が入っているか」「余白は HIROKEI レベルか」をチェック

### LP 専用追加ルール

- Hero の大型英字タイポは 1 箇所のみ、`--gradient-primary` の `background-clip: text` で表現
- Hero 下の三連数字は固定: **¥4,000〜 / 解約自由 / LINE ひとつで**
- フッター手前にフルグラデ CTA セクションを 1 個必ず置く (白ピル CTA 2 個入り)
- 平山明日奈さん (実パイロット) を「お客様の声」として顔写真 + 具体的時間/金額削減で配置
- 業種タブを Hero 内に置き、ヘア以外は (準備中) と明示する
- 競合 (LINE BP) との客観比較を最低 1 度

### 管理画面専用追加ルール

- LP より情報密度を上げてよい (パディング 16–24px、カード罫線あり可)
- グラデーションは管理画面では使わない (機能性優先、ヘッダーロゴのみ例外)
- カレンダー UI は FullCalendar の既定スタイルを上書きし、本書の配色・タイポに揃える
- LINE 連携部分のみ `--line-green` を使用

### LINE リッチメニュー専用追加ルール

- 拠点別ブランディング (東京 / 相生) — 各拠点の写真をベースにグラデオーバーレイを薄く乗せる
- ボタンエリアは LINE 既定の 3×2 / 2×2 グリッド、各エリアにアイコン + 短いラベル

---

## 変更ログ

| 日付 | 変更 | 理由 |
|------|------|------|
| 2026-05-14 | 初版 (GlossGenius モノクロ路線) | DESIGN.md トレンドを受けて LP 制作前に導入 |
| 2026-05-14 | **v0.2 全面書き直し** — HIROKEI トーンに転換 (ピンク→パープルグラデ、円形ブロック、Venn 図、ピル型ボタン、広い余白)。LINE グリーンは機能色に降格 | 鬼窪さんの好みが GlossGenius モノクロ系ではなく HIROKEI のグラデーション + 柔らかさ + 温度感だったため。視覚参考も HIROKEI 1 件に絞った |
