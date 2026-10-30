基準日: 2026-09-19・コミット9feef9fa0

# テンプレート スクリーンショット

`templates/`配下の各テンプレを、プレビューサーバーを起動して自動撮影する仕組み。撮影対象URLは各テンプレ直下の`screenshots.config.json`に宣言し、このファイルがあるテンプレが自動で対象になる（スクリプト変更は不要）。パターン側は[pattern-screenshots.md](./pattern-screenshots.md)。


## コマンド

ルートで実行する。内部で`pnpm --filter lism-site ...`を呼ぶ。

| コマンド | 処理 |
| --- | --- |
| `pnpm screenshot:templates` | 各テンプレをbuild→previewし、新規ぶんだけ撮影（公開用のみ） |
| `pnpm screenshot:templates:force` | 全テンプレを再撮影。公開用とbaselineの両方を上書き |
| `pnpm screenshot:templates:compare` | baselineと比較（初回はbaseline生成） |
| `pnpm screenshot:templates:update` | 差分テンプレのbaselineと公開用画像を更新 |

対象の絞り込みは`--target=<slug|相対パス>`、既存`dist/`を使うなら`--no-build`。`screenshots.config.json`の`port`を別プロセスが占有しているときは`--port=<port>`で全テンプレのpreviewポートを上書きできる。

Astro 7の`astro preview`はAIエージェント環境を検出するとバックグラウンドのデーモンとして起動し、`astro preview stop`で止める方式になる。スクリプトは判定に使われる環境変数を外して前面で起動するので、エージェントから実行しても撮影後にサーバーが残らない。残った場合は各テンプレのディレクトリで`pnpm exec astro preview stop`を実行する。

```bash
pnpm --filter lism-site screenshot:templates -- --target=minimal-astro
pnpm --filter lism-site screenshot:templates -- --compare --target=lp-astro
pnpm --filter lism-site screenshot:templates -- --no-build
```


## `screenshots.config.json`

```json
{
  "command": "preview",
  "port": 4321,
  "waitAfterLoad": 500,
  "shots": [
    { "name": "top", "path": "/" },
    { "name": "about", "path": "/about/" }
  ]
}
```

| プロパティ | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `command` | `'preview' \| 'dev'` | `'preview'` | 起動コマンド。`preview`は事前にbuildする |
| `port` | number | — | プレビューサーバーのポート。テンプレ間で重複させない |
| `portViaEnv` | boolean | `false` | `true`なら`port`をCLI引数でなく`PORT`環境変数で渡す。`next start` / `next dev`が`--`後の`--port`をディレクトリ引数と誤解してエラーになるための回避策 |
| `waitAfterLoad` | number | `500` | ページ読み込み後の待機ms |
| `reducedMotion` | boolean | `false` | `true`なら`prefers-reduced-motion: reduce`を適用して撮る。入場アニメーションや背景の常時アニメーションがあるテンプレで、完了後の静止状態を安定して撮るため。テンプレ側にreduced-motion用のスタイル分岐が必要 |
| `shots[].name` | string | — | 出力ファイル名。`screenshots/{name}.png`。`/`を含めるとサブディレクトリになる（`en/top`→`screenshots/en/top.png`） |
| `shots[].path` | string | — | サーバールートからのパス |
| `langShots` | `Record<string, ShotDef[]>` | — | 言語別overlay（`.lang/<lang>/`）をマージして撮る`shots`。`screenshots/<lang>/{name}.png`へ保存 |


## 英語版（en）

テンプレの言語対応方式で撮り方が分かれるが、出力先はどちらも`screenshots/en/`に揃える。

- LP（言語別variant方式）: `/en/`, `/en/corporate/`等は通常buildに含まれる実ルートなので、`shots`に`{ "name": "en/corporate", "path": "/en/corporate/" }`のように追記するだけ。jaと同じ1回のbuild / previewで撮れる。
- blog（overlay方式）: `.lang/en`をsrcへマージする方式のため通常buildには出ず、enページはjaと同じpathに重なる。`langShots.en`に`shots`と同じ形で書く（`name`に`en/`は付けない）。スクリプトは通常撮影の後に`node scripts/build-template-lang.mjs <pkg> en`（=`nr build:template:en`。`.lang/en`を一時的にsrcへマージして再build→src復元）→preview→撮影を行う。
  - overlay再buildは`--no-build`でもスキップされない（distをenで上書きする必要があるため）。`new`モードでは`screenshots/en/`が揃っていれば再buildごとスキップする。
  - blogはLPより時間がかかる。

撮影してコミットするだけでen版サムネに切り替わる。手動のimport差し替えは不要。

- docsのテンプレカード: `apps/site/src/config/templates.ts`の`getThumb(tpl, lang)`が、en表示時に`screenshots/en/{variant|top}.png`を優先し、無ければjaへフォールバックする。
- LPのen一覧（`templates/lp/astro/src/pages/en/index.astro`）: `import.meta.glob`で`screenshots/en/*.png`を優先し、無いslugは`screenshots/*.png`へフォールバックする。


## ファイル構成

```
templates/blog/astro/minimal/
  screenshots.config.json   # 撮影対象URL（shots / langShots）
  screenshots/
    top.png                 # 公開用サムネ（Git管理、本物の画像）
    en/top.png              # 言語別
    _baseline/              # 比較用（Git管理、CDNランダム画像はグレー差し替え）
      top.png
      en/top.png
    _diff/                  # 差分画像（Git管理外）
    _temp/                  # 比較時の一時ファイル（自動削除）
```

`screenshots/`配下の`*.png`（言語別サブディレクトリ含む）が公開用サムネ。apps/siteは`import.meta.glob('.../screenshots/**/*.png')`相当（実際は相対パス）で取得し、`_baseline/` `_diff/` `_temp/`はglobの除外パターンで弾く。


## 運用フロー

1. テンプレを変更した: `compare`で意図しない崩れがないか確認する。
2. 差分が意図どおり: `update`でbaselineと公開用を更新してコミットする。
3. テンプレを追加した: サイト一覧とCLIの配信対象になるよう、[CLIガイド](./cli-guide.md#テンプレ運用)に従って`templates/manifest.ts`へ登録する。直下に`screenshots.config.json`を作り、`pnpm screenshot:templates`で撮影してコミットする。
4. 全部撮り直す: `force`。
5. en版を用意する: LPは`shots`に`en/*`、blogは`langShots.en`を追加し、`pnpm screenshot:templates`で`screenshots/en/`を撮影してコミットする。


## スクリプト（`apps/site/scripts/template-screenshots.ts`）

- `templates/`以下を再帰走査し、`screenshots.config.json`を持つディレクトリを収集する。
- 各テンプレを`pnpm --filter <name> build`→`pnpm --filter <name> preview`で起動する。ポートは`--port <port>`、`portViaEnv: true`なら`PORT`環境変数で渡す。起動前にIPv4・IPv6両方のTCP接続でポートの空きを確認し、停止は自分が起動したプロセスグループにだけシグナルを送る。停止後にポートが解放されなければエラーで中止する。
- Playwright（headless chromium）で`shots`を順に撮影する。`langShots`があれば上記のoverlay再build→撮影を続けて行い、`screenshots/<lang>/`へ保存する。
- compareはpixelmatchで比較し、しきい値（既定0.01%）以下なら変更なしとみなす。
- CDNランダム画像（`cdn.lism-css.com/random/img*`と`cdn.lism-css.com/img/random*`）は、baseline用の撮影（`force` / `compare` / `update`のbaseline）では1x1グレーに差し替える（比較を安定させるため）。公開用の撮影（`new` / `force` / `update`のpublic）は本物のまま。
