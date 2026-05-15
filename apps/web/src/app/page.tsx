import Image from "next/image";
import Link from "next/link";
import { FaqList } from "./_components/Faq";
import { Logo } from "./_components/Logo";

const stats = [
  { num: "¥4,000", suffix: "〜", label: "月額、ずっとこの価格" },
  { num: "解約自由", suffix: "", label: "年契約縛りなし" },
  { num: "-90%", suffix: "", label: "カルテ記入時間 (Phase 2)" },
  { num: "2 拠点", suffix: "", label: "標準対応 (出張・本店)" },
];

const reasons = [
  {
    title: "ワンストップ予約",
    sub: "All in LINE",
    desc: "予約・カルテ・配信・リッチメニュー、すべて LINE で完結。複数ツールの行き来をなくす。",
  },
  {
    title: "美容に特化した設計",
    sub: "Salon Native",
    desc: "ヘア・ネイル・エステ・まつげの現場で必要な機能だけを、深く作り込む。",
  },
  {
    title: "中小サロンの現場主義",
    sub: "Field First",
    desc: "個人〜2-3 名サロン、二拠点運営の現場に通うパイロットと共に作っている。",
  },
  {
    title: "AI ファーストの拡張",
    sub: "Always Evolving",
    desc: "カルテ AI・受付 AI・経営対話 AI を継続的に解放。料金は据え置きで進化する。",
  },
];

const features = [
  {
    icon: "📅",
    tone: "pink",
    title: "二拠点予約管理",
    desc: "東京・相生など複数拠点をひとつの管理画面で。拠点ごとの営業時間・スタッフ・メニューを別管理。",
  },
  {
    icon: "💬",
    tone: "purple",
    title: "LINE 予約導線",
    desc: "リッチメニューにエリア選択タブを常設。お客さまは LINE 内で予約完結、外部サイトを開かせない。",
  },
  {
    icon: "🔔",
    tone: "pink",
    title: "自動リマインダー",
    desc: "24h 前・1h 前を LINE プッシュで自動送信。無断キャンセル・遅刻を未然に防ぐ。",
  },
  {
    icon: "📋",
    tone: "purple",
    title: "カルテ AI 自動生成",
    desc: "施術後の口頭メモを AI が構造化してカルテに保存 (Phase 2)。記入時間ゼロを目指す。",
  },
  {
    icon: "🎨",
    tone: "pink",
    title: "拠点別ブランディング",
    desc: "リッチメニューの画像・カラーを拠点ごとに切替。出張拠点でも本店と同じ世界観を保つ。",
  },
  {
    icon: "📊",
    tone: "purple",
    title: "経営対話 AI",
    desc: "「今月の売上は？」「稼働率の低い時間は？」を音声で質問→AI が即答 (Phase 3)。",
  },
];

const steps = [
  {
    num: "01",
    title: "アカウント作成",
    desc: "メールアドレスで 30 秒で登録完了。",
  },
  {
    num: "02",
    title: "LINE 公式アカウント連携",
    desc: "チャネル情報をコピペ、LINE BP からの乗り換えも Webhook 切替のみ。",
  },
  {
    num: "03",
    title: "サロン情報を入力",
    desc: "営業時間・メニュー・スタッフ・拠点を 1 度設定すれば終わり。",
  },
  {
    num: "04",
    title: "お客さまに LINE で案内",
    desc: "リッチメニューに予約ボタンを差し込み、その日から運用開始。",
  },
];

const cases = [
  {
    tag: "個人サロン",
    title: "月 ¥4,000 でも本気の機能",
    desc: "フリーランス美容師でも導入できる価格設計。LINE BP の月 ¥14,000 を待たずに、今日から始められる。",
    metric: "¥4,000",
    metricLabel: "/月",
  },
  {
    tag: "二拠点運営",
    title: "東京 × 相生のように、本店と出張先を 1 画面で",
    desc: "二拠点標準対応。本店と出張サロンを行き来する経営者に最適化。スタッフ・売上・予約を拠点別で可視化。",
    metric: "2 拠点",
    metricLabel: "標準",
  },
  {
    tag: "中小サロン (2-3 名)",
    title: "LINE BP の 1/3〜1/5 で AI も強い",
    desc: "複数スタッフ店舗での LINE BP は月 ¥25,000、LinQ なら ¥5,000。AI ファーストの設計思想で価値も上回る。",
    metric: "-71%",
    metricLabel: "vs LINE BP",
  },
];

const plans = [
  {
    name: "Free",
    price: "¥0",
    period: "永久無料",
    saving: "個人サロン・お試し用",
    features: [
      "友だち 50 人まで",
      "月 500 通",
      "1 拠点",
      "基本予約管理",
      "リッチメニュー 1 種",
    ],
    cta: "無料で始める",
    popular: false,
  },
  {
    name: "Standard",
    price: "¥4,000",
    period: "/月",
    saving: "個人〜1 拠点サロン",
    features: [
      "友だち 500 人",
      "月 5,000 通",
      "1 拠点",
      "予約 + カルテ",
      "リッチメニュー 3 種",
      "自動リマインダー",
    ],
    cta: "14 日間無料",
    popular: false,
  },
  {
    name: "Pro",
    price: "¥9,800",
    period: "/月",
    saving: "二拠点・中小サロン (人気)",
    features: [
      "友だち 5,000 人",
      "月 30,000 通",
      "二拠点標準対応",
      "拠点別ブランディング",
      "カルテ AI (Phase 2)",
      "AI 自動応答 (Phase 2)",
    ],
    cta: "14 日間無料",
    popular: true,
  },
  {
    name: "Premium",
    price: "¥18,000",
    period: "/月",
    saving: "多拠点・優先サポート",
    features: [
      "友だち 無制限",
      "月 100,000 通",
      "拠点 4 つまで",
      "経営対話 AI (Phase 3)",
      "外部 Webhook",
      "優先メールサポート",
    ],
    cta: "14 日間無料",
    popular: false,
  },
];

const competitorRows = [
  { label: "月額 (通常時)", linq: "¥4,000〜5,000", bp: "¥14,000", bpDanger: true },
  { label: "月額 (複数スタッフ)", linq: "据え置き", bp: "+¥11,000/月", bpDanger: true },
  { label: "契約形態", linq: "月額・いつでも解約", bp: "年間契約・中途解約原則不可", bpDanger: true },
  { label: "支払い", linq: "毎月", bp: "1 年分一括カード払い", bpDanger: true },
  { label: "2 年目以降", linq: "据え置き ¥4,000〜", bp: "¥14,000/月 (初年度の 2 倍)", bpDanger: true },
  { label: "二拠点運営", linq: "標準対応", bp: "公開情報なし", bpDanger: false },
  { label: "AI 機能", linq: "ロードマップ明示", bp: "未訴求", bpDanger: false },
  { label: "外部予約サイト連携", linq: "v0.1 から対応予定", bp: "リリース後順次提供予定", bpDanger: false },
];

const faqs = [
  {
    q: "LINE 公式アカウントの費用は別途かかりますか?",
    a: "はい、LINE 公式アカウント自体の月額費用は別途必要です。ただし LinQ for Beauty 経由の AI 応答は Reply API を利用するため、LINE のメッセージ課金対象外になります。",
  },
  {
    q: "LINE ビューティープラスとの違いは何ですか?",
    a: "価格は 1/3〜1/5、契約は月額で中途解約自由、二拠点運営に標準対応、AI ファーストの設計思想——この 4 点が決定的に違います。LINE BP は 2 年目から月額が 2 倍になりますが、LinQ は据え置きを約束します。",
  },
  {
    q: "既存の予約システムからの移行は簡単ですか?",
    a: "LINE 公式アカウント自体はそのままお使いいただけるため、Webhook URL を切り替えるだけで移行できます。顧客データは CSV インポートに対応予定 (Phase 2)。",
  },
  {
    q: "美容業界以外でも使えますか?",
    a: "現在はヘアサロンに最適化されています。ネイル・エステ・まつげサロンは順次対応予定です。LINE BP より早い展開を目指します。",
  },
  {
    q: "AI 機能はいつから使えますか?",
    a: "v0.1 (2026/5/22 リリース) では予約・リマインダー・拠点管理など基本機能のみ。Phase 2 (8 月予定) でカルテ AI・受付 AI を解放、Phase 3 で経営対話 AI を追加します。料金プランは据え置きで進化します。",
  },
  {
    q: "サポート体制は?",
    a: "メールサポートを全プランで提供。Premium プランは優先対応となります。導入時の初期設定は無料で支援します。",
  },
];

const toneClasses: Record<string, string> = {
  pink: "bg-brand-pink/10 text-brand-pink",
  purple: "bg-brand-purple/10 text-brand-purple",
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden text-ink-900">
      {/* ─────────────── Header ─────────────── */}
      <header className="sticky top-0 z-30 border-b border-ink-100/50 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-4 md:px-20">
          <Link
            href="/"
            className="flex items-baseline gap-2"
          >
            <Logo size={26} />
            <span className="text-ink-500 text-sm font-medium md:text-base">
              for Beauty
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink-700 md:flex">
            <a href="#features" className="transition hover:text-brand-purple">
              機能
            </a>
            <a href="#compare" className="transition hover:text-brand-purple">
              LINE BP との比較
            </a>
            <a href="#pricing" className="transition hover:text-brand-purple">
              料金
            </a>
            <a href="#cases" className="transition hover:text-brand-purple">
              事例
            </a>
            <a href="#faq" className="transition hover:text-brand-purple">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="#docs"
              className="hidden rounded-full border border-ink-100 bg-white px-5 py-2.5 text-sm font-medium text-ink-700 transition hover:-translate-y-[1px] hover:shadow-[0_6px_16px_rgba(184,154,236,0.20)] sm:inline-flex"
            >
              資料を見る
            </Link>
            <Link
              href="#cta"
              className="inline-flex rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-[1px] hover:shadow-[0_6px_16px_rgba(184,154,236,0.30)]"
            >
              無料で試す
            </Link>
          </div>
        </div>
      </header>

      {/* Wave Background — ユーザー提供画像 (Gemini 生成)、viewport に完全固定 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <Image
          src="/images/wave-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* ─────────────── Hero ─────────────── */}
      <section className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-col justify-center px-6 pb-24 pt-8 md:min-h-[78vh] md:px-20 md:pb-32 md:pt-16">
        <p className="mb-5 text-xs font-semibold tracking-[0.24em] text-ink-500 md:text-sm">
          LINE × AI × SALON SaaS
        </p>

        <h1 className="hero-display text-[64px] md:text-[140px]">
          LinQ
          <br />
          for Beauty.
        </h1>

        <div className="mt-10 grid gap-2 md:mt-14 md:max-w-2xl">
          <p className="text-xl font-semibold text-ink-900 md:text-2xl">
            カルテも、受付も、ゼロに。
          </p>
          <p className="text-base leading-relaxed text-ink-500 md:text-lg">
            LINE ひとつで、予約も顧客管理も。
            <br />
            二拠点運営に標準対応した、AI ファースト美容サロン SaaS。
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 md:mt-16 md:max-w-3xl md:grid-cols-3 md:gap-12">
          <div>
            <p className="numeric text-5xl text-ink-900 md:text-6xl">
              ¥4,000
              <span className="text-2xl md:text-3xl">〜</span>
            </p>
            <p className="mt-2 text-sm text-ink-500 md:text-base">
              月額、ずっとこの価格
            </p>
          </div>
          <div>
            <p className="numeric text-5xl text-ink-900 md:text-6xl">解約自由</p>
            <p className="mt-2 text-sm text-ink-500 md:text-base">
              年契約縛りなし
            </p>
          </div>
          <div>
            <p className="numeric text-5xl text-ink-900 md:text-6xl">
              LINE 完結
            </p>
            <p className="mt-2 text-sm text-ink-500 md:text-base">
              お客さまも、お店も
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start gap-3 md:mt-16 md:flex-row md:items-center md:gap-4">
          <Link
            href="#cta"
            className="inline-flex items-center justify-center rounded-full bg-ink-900 px-8 py-4 text-base font-semibold text-white shadow-[0_2px_6px_rgba(184,154,236,0.12)] transition hover:-translate-y-[1px] hover:shadow-[0_10px_28px_rgba(184,154,236,0.30)] md:text-lg"
          >
            無料で試す
            <span aria-hidden className="ml-2">→</span>
          </Link>
          <Link
            href="#docs"
            className="inline-flex items-center justify-center rounded-full border border-ink-300 bg-white/70 px-8 py-4 text-base font-semibold text-ink-900 backdrop-blur transition hover:-translate-y-[1px] hover:border-ink-900 md:text-lg"
          >
            資料を見る
          </Link>
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-2 md:mt-20">
          <span className="rounded-full border-2 border-brand-purple bg-white px-5 py-2 text-sm font-semibold text-ink-900">
            ヘアサロン
          </span>
          <span className="rounded-full border border-ink-100 bg-white px-5 py-2 text-sm text-ink-300">
            ネイル(準備中)
          </span>
          <span className="rounded-full border border-ink-100 bg-white px-5 py-2 text-sm text-ink-300">
            エステ(準備中)
          </span>
          <span className="rounded-full border border-ink-100 bg-white px-5 py-2 text-sm text-ink-300">
            まつげ(準備中)
          </span>
        </div>
      </section>

      {/* ─────────────── Stats Bar ─────────────── */}
      <section className="relative z-10 border-y border-ink-100 bg-surface-50/60">
        <div className="mx-auto grid w-full max-w-[1180px] grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4 md:px-20 md:py-16">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-start">
              <p className="numeric text-4xl text-ink-900 md:text-5xl">
                {s.num}
                {s.suffix && (
                  <span className="text-2xl text-ink-700">{s.suffix}</span>
                )}
              </p>
              <p className="mt-2 text-xs text-ink-500 md:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────── BEST PARTNER (Reasons) ─────────────── */}
      <section className="relative z-10 mx-auto w-full max-w-[1180px] px-6 py-24 md:px-20 md:py-32">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.24em] text-ink-500 md:text-sm">
            WHY LINQ FOR BEAUTY
          </p>
          <h2 className="hero-display mx-auto mt-4 max-w-3xl text-[44px] leading-tight md:text-[72px]">
            BEST FOR
            <br />
            BEAUTY.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink-500 md:text-lg">
            美容業界 38 万サロンに向けて。
            <br />
            個人サロンから二拠点運営まで、ずっと同じ価格で寄り添うパートナーへ。
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:mt-20 md:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r) => (
            <div
              key={r.title}
              className="group flex flex-col items-center text-center"
            >
              <div className="flex h-[220px] w-[220px] flex-col items-center justify-center rounded-full border-[1.5px] border-brand-pink-light bg-white p-6 transition group-hover:border-brand-pink group-hover:shadow-[0_8px_24px_rgba(245,143,184,0.15)]">
                <p className="text-xs font-semibold tracking-[0.18em] text-brand-purple">
                  {r.sub}
                </p>
                <p className="mt-2 text-lg font-bold text-ink-900">{r.title}</p>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-ink-500">
                {r.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────── Venn (Business Domain) ─────────────── */}
      <section className="relative z-10 bg-surface-50/60 py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1180px] px-6 md:px-20">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.24em] text-ink-500 md:text-sm">
              OUR SOLUTIONS
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-ink-900 md:text-5xl">
              <span className="hero-display inline-block">LINE</span>で接客、
              <br className="md:hidden" />
              <span className="hero-display inline-block">管理画面</span>
              で経営判断。
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base text-ink-500 md:text-lg">
              お客さま側と経営側、ふたつの面を AI が貫通する。
              <br />
              片方だけの SaaS ではない、サロン経営の両面を担うパートナー。
            </p>
          </div>

          {/* Venn diagram */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2 md:gap-0">
            <div className="relative flex flex-col items-center rounded-full bg-brand-pink/10 p-10 text-center md:right-[-40px] md:aspect-square md:justify-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-pink">
                CUSTOMER FACE
              </p>
              <p className="mt-2 text-xl font-bold text-ink-900 md:text-2xl">
                LINE で顧客接点
              </p>
              <ul className="mt-4 space-y-1 text-sm text-ink-500 md:text-base">
                <li>予約受付・変更</li>
                <li>事前カウンセリング</li>
                <li>来店リマインド</li>
                <li>施術後フォロー</li>
              </ul>
            </div>
            <div className="relative flex flex-col items-center rounded-full bg-brand-purple/10 p-10 text-center md:left-[-40px] md:aspect-square md:justify-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-purple">
                MANAGEMENT FACE
              </p>
              <p className="mt-2 text-xl font-bold text-ink-900 md:text-2xl">
                管理画面で経営判断
              </p>
              <ul className="mt-4 space-y-1 text-sm text-ink-500 md:text-base">
                <li>カレンダー (二拠点)</li>
                <li>売上・稼働率</li>
                <li>スタッフ管理</li>
                <li>カルテ・顧客 DB</li>
              </ul>
            </div>
          </div>

          <p className="mx-auto mt-12 max-w-xl text-center text-sm text-ink-500 md:text-base">
            <span className="font-semibold text-ink-900">
              重なる部分は AI が担当。
            </span>
            <br />
            カルテ作成・予約最適化・経営対話を、自動で。
          </p>
        </div>
      </section>

      {/* ─────────────── Features ─────────────── */}
      <section id="features" className="relative z-10 mx-auto w-full max-w-[1180px] px-6 py-24 md:px-20 md:py-32">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.24em] text-ink-500 md:text-sm">
            FEATURES
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight text-ink-900 md:text-5xl">
            <span className="hero-display inline-block">6 つの軸</span>
            で、サロン運営を再設計
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink-500 md:text-lg">
            v0.1 で必要十分、Phase 2 以降で AI 機能を継続解放。
            <br />
            料金は据え置きで進化します。
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:mt-20 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-3xl bg-white p-7 transition hover:-translate-y-[2px] hover:shadow-[0_12px_32px_rgba(184,154,236,0.12)] md:p-8"
            >
              <div
                className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${toneClasses[f.tone]}`}
              >
                {f.icon}
              </div>
              <h3 className="mt-5 text-xl font-bold text-ink-900">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-500 md:text-base">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────── Steps ─────────────── */}
      <section className="relative z-10 bg-surface-50/60 py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1180px] px-6 md:px-20">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.24em] text-ink-500 md:text-sm">
              HOW IT WORKS
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-ink-900 md:text-5xl">
              <span className="hero-display inline-block">最短 5 分</span>
              で、運用開始
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:mt-20 md:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.num}
                className="relative rounded-3xl border border-ink-100 bg-white p-7"
              >
                <p className="numeric text-3xl text-brand-purple">{s.num}</p>
                <h4 className="mt-4 text-lg font-bold text-ink-900">
                  {s.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── Compare (LINE BP vs LinQ) ─────────────── */}
      <section id="compare" className="relative z-10 mx-auto w-full max-w-[1180px] px-6 py-24 md:px-20 md:py-32">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.24em] text-ink-500 md:text-sm">
            COMPARE
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight text-ink-900 md:text-5xl">
            2 年目から月額が 2 倍になる予約システムに、
            <br className="hidden md:block" />
            戻れますか？
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink-500 md:text-lg">
            LINE ビューティープラスは初年度キャンペーンで安く見えますが、2
            年目以降は月額が 2 倍に。 複数スタッフ店舗ではさらに +¥11,000。
            <br />
            LinQ for Beauty は <span className="font-semibold text-ink-900">ずっと ¥4,000〜</span> を約束します。
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-3xl border border-ink-100 bg-white md:mt-20">
          <div className="grid grid-cols-[1fr_1fr_1fr] divide-x divide-ink-100 border-b border-ink-100 bg-surface-50">
            <div className="p-4 text-xs font-semibold text-ink-500 md:p-6 md:text-sm">
              項目
            </div>
            <div className="p-4 md:p-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-purple md:text-sm">
                LinQ FOR BEAUTY
              </p>
              <p className="mt-1 text-sm font-bold text-ink-900 md:text-base">
                LinQ for Beauty
              </p>
            </div>
            <div className="p-4 md:p-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-ink-500 md:text-sm">
                COMPETITOR
              </p>
              <p className="mt-1 text-sm font-bold text-ink-700 md:text-base">
                LINE ビューティープラス
              </p>
            </div>
          </div>
          {competitorRows.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr_1fr_1fr] divide-x divide-ink-100 ${
                i % 2 === 1 ? "bg-surface-50/40" : ""
              } border-b border-ink-100 last:border-b-0`}
            >
              <div className="p-4 text-xs font-medium text-ink-700 md:p-6 md:text-sm">
                {row.label}
              </div>
              <div className="p-4 text-sm font-semibold text-ink-900 md:p-6 md:text-base">
                {row.linq}
              </div>
              <div
                className={`p-4 text-sm md:p-6 md:text-base ${
                  row.bpDanger ? "text-[#DC2626] font-medium" : "text-ink-500"
                }`}
              >
                {row.bp}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────── Use Cases ─────────────── */}
      <section id="cases" className="relative z-10 bg-surface-50/60 py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1180px] px-6 md:px-20">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.24em] text-ink-500 md:text-sm">
              USE CASES
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-ink-900 md:text-5xl">
              個人サロンから、
              <br className="md:hidden" />
              <span className="hero-display inline-block">二拠点</span>
              まで
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:mt-20 md:grid-cols-3">
            {cases.map((c) => (
              <div
                key={c.tag}
                className="rounded-3xl bg-white p-8 transition hover:-translate-y-[2px] hover:shadow-[0_12px_32px_rgba(184,154,236,0.12)]"
              >
                <span className="inline-flex rounded-full bg-brand-pink/10 px-3 py-1 text-xs font-semibold text-brand-pink">
                  {c.tag}
                </span>
                <p className="numeric mt-6 text-5xl text-ink-900 md:text-6xl">
                  {c.metric}
                </p>
                <p className="mt-1 text-sm text-ink-500">{c.metricLabel}</p>
                <h4 className="mt-6 text-lg font-bold text-ink-900">
                  {c.title}
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Pilot voice */}
          <div className="mt-16 overflow-hidden rounded-3xl border border-ink-100 bg-white md:mt-20">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr]">
              <div className="bg-[var(--gradient-soft)] p-10 md:p-12">
                <p className="text-xs font-semibold tracking-[0.18em] text-ink-700">
                  FIRST PILOT
                </p>
                <p className="mt-3 text-2xl font-bold text-ink-900 md:text-3xl">
                  平山 明日奈さん
                </p>
                <p className="mt-1 text-sm text-ink-700">
                  屋号「癒明 / ユア」
                  <br />
                  東京・池袋 + 兵庫・相生
                </p>
              </div>
              <div className="p-10 md:p-12">
                <p className="text-xl font-bold leading-relaxed text-ink-900 md:text-2xl">
                  「個人で東京と相生の二拠点を回す私のために、
                  ゼロから設計してくれた。」
                </p>
                <p className="mt-6 text-sm leading-relaxed text-ink-500 md:text-base">
                  鬼窪と直接の対話を重ねて開発した、現場主義の予約管理。
                  二拠点運営、LINE 受付、Phase
                  2 のカルテ AI まで、本人の声を起点に作り続けています。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Pricing ─────────────── */}
      <section id="pricing" className="relative z-10 mx-auto w-full max-w-[1180px] px-6 py-24 md:px-20 md:py-32">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.24em] text-ink-500 md:text-sm">
            PRICING
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight text-ink-900 md:text-5xl">
            <span className="hero-display inline-block">ずっと安い</span>
            、を約束する
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink-500 md:text-lg">
            全プラン 14 日間無料・解約自由。
            <br />
            機能が増えても、価格は据え置きです。
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:mt-20 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-3xl bg-white p-7 transition hover:-translate-y-[2px] hover:shadow-[0_12px_32px_rgba(184,154,236,0.15)] md:p-8 ${
                p.popular
                  ? "border-[2px] border-transparent [background-clip:padding-box,border-box] [background-image:linear-gradient(white,white),linear-gradient(135deg,#F58FB8,#B89AEC)] [background-origin:border-box]"
                  : "border border-ink-100"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 rounded-full bg-[var(--gradient-primary)] px-4 py-1 text-xs font-semibold text-white">
                  人気 No.1
                </span>
              )}
              <p className="text-sm font-semibold text-ink-700">{p.name}</p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="numeric text-4xl text-ink-900 md:text-5xl">
                  {p.price}
                </span>
                <span className="text-sm text-ink-500">{p.period}</span>
              </p>
              <p className="mt-2 text-xs text-brand-purple">{p.saving}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-ink-700">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <span className="mt-[2px] text-brand-purple">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="#cta"
                className={`mt-7 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-[1px] ${
                  p.popular
                    ? "bg-ink-900 text-white hover:shadow-[0_8px_24px_rgba(184,154,236,0.30)]"
                    : "border border-ink-300 bg-white text-ink-900"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────── FAQ ─────────────── */}
      <section id="faq" className="relative z-10 bg-surface-50/60 py-24 md:py-32">
        <div className="mx-auto w-full max-w-[860px] px-6 md:px-20">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.24em] text-ink-500 md:text-sm">
              FAQ
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight text-ink-900 md:text-5xl">
              よくある質問
            </h2>
          </div>
          <div className="mt-14 md:mt-16">
            <FaqList items={faqs} />
          </div>
        </div>
      </section>

      {/* ─────────────── CTA (full gradient) ─────────────── */}
      <section id="cta" className="relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-primary)] opacity-95" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(60% 80% at 20% 20%, rgba(255,255,255,0.5), transparent), radial-gradient(50% 60% at 80% 70%, rgba(255,255,255,0.4), transparent)",
          }}
        />
        <div className="relative mx-auto w-full max-w-[1180px] px-6 py-24 text-center md:px-20 md:py-32">
          <p className="text-xs font-semibold tracking-[0.24em] text-white/80 md:text-sm">
            GET STARTED
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
            あなたのサロンを、LinQ で。
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base text-white/90 md:text-lg">
            14 日間の無料テスター期間からスタート。
            <br />
            クレジットカード不要、いつでも解約できます。
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 md:flex-row md:gap-4">
            <Link
              href="#"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-ink-900 transition hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] md:text-lg"
            >
              無料で試す
              <span aria-hidden className="ml-2">→</span>
            </Link>
            <Link
              href="#"
              className="inline-flex items-center justify-center rounded-full border border-white/60 bg-transparent px-8 py-4 text-base font-semibold text-white transition hover:-translate-y-[1px] hover:bg-white/10 md:text-lg"
            >
              資料を見る
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────── Footer ─────────────── */}
      <footer className="relative z-10 border-t border-ink-100 bg-white">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-14 md:px-20 md:py-20">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-baseline gap-2">
                <Logo size={22} />
                <span className="text-ink-500 text-sm font-medium">
                  for Beauty
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
                美容業界専用の AI ファースト × LINE ネイティブ × 二拠点対応 SaaS。
                個人〜中小サロンに、ずっと寄り添うパートナーへ。
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-ink-700">
                プロダクト
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-500">
                <li>
                  <a href="#features" className="transition hover:text-brand-purple">
                    機能
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition hover:text-brand-purple">
                    料金
                  </a>
                </li>
                <li>
                  <a href="#compare" className="transition hover:text-brand-purple">
                    LINE BP との比較
                  </a>
                </li>
                <li>
                  <a href="#cases" className="transition hover:text-brand-purple">
                    事例
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-ink-700">
                会社
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-500">
                <li>運営: 鬼窪 哲也</li>
                <li>パイロット: 癒明 / ユア</li>
                <li>所在: 東京 / 兵庫</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-ink-700">
                お問い合わせ
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-500">
                <li>
                  <a href="#cta" className="transition hover:text-brand-purple">
                    無料で試す
                  </a>
                </li>
                <li>
                  <a href="#docs" className="transition hover:text-brand-purple">
                    資料請求
                  </a>
                </li>
                <li>
                  <a href="#faq" className="transition hover:text-brand-purple">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-ink-100 pt-8 text-xs text-ink-500 md:flex-row md:items-center">
            <p>© 2026 LinQ for Beauty — AI × LINE × Salon Native SaaS</p>
            <p>v0.1 — 2026/05/22 リリース予定</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
