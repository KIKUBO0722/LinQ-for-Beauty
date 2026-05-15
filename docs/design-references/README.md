# Design References

`DESIGN.md` を補完する **視覚的参考資料**。Claude Code は UI 生成時にここのスクリーンショットも参照すること。

## 必須参照 (1 件のみ)

| ファイル名 | 取得元 URL | 何を学ぶか |
|------------|-----------|------------|
| `01-hirokei-fullpage.png` | https://www.hirokei.co.jp/ | **唯一の視覚参考**。ピンク→パープルグラデの大型英字 Hero、円形ブロック 4 個 (BEST PARTNER 型)、事業内容の Venn 図、ピル型 CTA、フッター手前のフルグラデ CTA セクション、波カーブ装飾、広い余白、温度感のある人物写真 |

## 配置方法 (鬼窪さん作業)

1. Edge で https://www.hirokei.co.jp/ を開く
2. `Ctrl + Shift + S` →「Web キャプチャ」→「ページ全体をキャプチャ」
3. PNG で保存
4. `C:\dev\LinQBeauty\docs\design-references\01-hirokei-fullpage.png` にリネーム移動

> ※ すでに鬼窪さんが共有してくれた `C:\Users\demon\Downloads\www.hirokei.co.jp_(Nest Hub).png` を上記パス・ファイル名にコピーすれば同じ。

## アニメーション参考 (後追い)

デザインが固まってから別途追加予定。空き枠:

| ファイル名 | 形式 | 用途 |
|------------|------|------|
| `02-xxx-animation.mp4` | MP4 録画 | 動きの記録 |
| `02-xxx-animation.md` | テキスト | 動きの言語化 (Claude が再現するための日本語ヒント) |

## 使い方 (Claude Code)

`DESIGN.md` §9 Agent Prompt Guide の手順 2 に従い、UI 生成前に `01-hirokei-fullpage.png` を必ず読み込む。

## 注意

- 著作権配慮: ローカル参考用途のみ
- 画像は時間が経つと古くなる: 半年に 1 度撮り直しを推奨
