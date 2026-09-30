基準日: 2026-09-19・コミット9feef9fa0

# パターン スクリーンショット

`apps/site`のパターンページのサムネイル撮影と、レイアウト差分検出の仕組み。テンプレ側は[template-screenshots.md](./template-screenshots.md)。

## 撮影サイズと表示

ブラウザは1440×810pxで固定し、保存範囲の高さをコンテンツに合わせて最大810pxにする。高さは`body`ではなく、コンテンツを包む`.c--previewSizeReporter`で測る。生成・比較・更新は同じ撮影処理を使う。

公開用サムネイルは撮影直後にSharpでWebPへ圧縮する（quality: 80、effort: 6）。画像の幅・高さは維持する。ピクセル比較用のベースライン・差分・一時画像はPNGで保存する。

`patterns/`一覧は横スクロールと比率16:9の画像枠を使い、`object-fit: contain`で画像全体を表示する。カテゴリページはサムネイルを使わず、`PreviewFrame`によるiframeのライブプレビューを縦1列に並べる。

比較時に画像サイズが異なる場合は100%差分とし、新しい画像を`diff/`に保存して`update`の対象にする。

比較用ベースラインはCDNのランダム画像（`cdn.lism-css.com/random/img*`）を1×1pxのグレー画像に置き換えるため、画像本来の比率でレイアウトが決まるパターンでは公開用と高さが異なる場合がある。


## コマンド

以下のコマンドはリポジトリルートまたは`apps/site`で実行する。ルートからの実行は`apps/site`側に委譲される。

| コマンド | 処理 |
| --- | --- |
| `pnpm screenshot:patterns:new` | ビルド後、Playwrightで新規パターンだけ撮影し`public/screenshots/patterns/`へ保存（既存はスキップ）。サイトのパターン一覧がこれをサムネイルに使う |
| `pnpm screenshot:patterns:force` | ビルド後、全パターンの公開用サムネイルと比較用ベースラインを再撮影 |
| `pnpm screenshot:patterns:compare` | ビルド後、CDNのランダム画像をグレーに差し替えて撮影し、`_screenshots/baseline/`とピクセル比較。初回はベースラインを生成する（コミットする）。差分画像は`_screenshots/diff/`へ出力 |
| `pnpm screenshot:patterns:compare --threshold 0.5` | 差分率のしきい値を変更（既定0.01%） |
| `pnpm screenshot:patterns:update` | ビルドせず既存distを使い、`_screenshots/diff/`にある差分パターンのベースライン（グレー差し替え）と公開用サムネ（本番画像）を再撮影。完了後に`diff/`と`temp/`を削除 |

`apps/site/src/config/patterns.ts`で`draft: true`を指定した下書きパターンは、本番の一覧と`new` / `force` / `compare`の対象から外れる。`update`は設定を再判定せず、`diff/`に残った画像を対象にする。

プレビューサーバーはポート4002固定。テンプレ撮影の`--port`に相当する上書きオプションは無いため、実行前に4002番を空ける。

### 絞り込み

`new` / `force` / `compare`はカテゴリやパターンで対象を絞れる。以下もリポジトリルートまたは`apps/site`で実行する。

```bash
pnpm screenshot:patterns:new cta              # カテゴリ
pnpm screenshot:patterns:new cta/cta01       # パターン
pnpm screenshot:patterns:new cta section      # 複数
pnpm screenshot:patterns:compare cta
```

### 言語（ja / en）

プレビューは`ja`（既定）と`en`の2言語。`generate-screenshots.ts` / `compare-screenshots.ts`は`--lang=en` / `--lang=ja`で絞れる（省略時は全言語）。`update-screenshots.ts`に`--lang`は無く、`_screenshots/diff/`配下に`en/`があるかで対象言語を判定する。

```bash
# apps/site で実行
npx tsx scripts/generate-screenshots.ts --lang=en
npx tsx scripts/compare-screenshots.ts cta/cta01 --lang=ja
```

保存先は`ja`がプレフィックスなし、`en`が`en/`サブディレクトリ（公開用サムネもベースラインも同じ規則）。`en`の撮影URLは末尾に`/en/`が付く（`/preview/patterns/cta/cta01/en/`）。


## 運用フロー

1. CSSやパターンを変更した: `compare`で意図しない崩れがないか確認する。
2. 差分が意図どおり: `update`でベースラインとサムネを更新してコミットする。
3. サムネを撮り直したい: `force`してコミットする。比較用ベースラインも上書きされるため、変更前との差分を確認したい場合は先に`compare`する。
4. パターンを追加した: `new`でサムネを撮影し、`compare`でベースラインに追加する。


## ファイル構成

```
apps/site/
  scripts/
    capture-pattern-screenshot.ts # 共通の撮影・高さ計測・WebP圧縮
    generate-screenshots.ts    # 撮影（new / force）
    compare-screenshots.ts     # 比較
    update-screenshots.ts      # 差分パターンの更新
  public/screenshots/patterns/ # 公開用サムネ（Git管理）
    cta/cta01.webp            #   ja
    en/cta/cta01.webp         #   en
  _screenshots/
    baseline/                  # 比較用ベースライン（Git管理）。言語構成は上と同じ
    diff/                      # 差分画像（Git管理外）。言語構成は上と同じ
    temp/                      # 比較時の一時ファイル（自動削除）
```
