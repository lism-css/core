基準日: 2026-10-01・コミットa1ea2a076

# docs-md integration 処理フロー

`apps/site/src/integrations/docs-md/`のAstro integration。ビルド時にMDXレンダリング後のHTMLから、AI向けの`.md`と`llms.txt`を生成する。共通処理は`util.ts`。

`data-pagefind-body`はPagefind検索の索引対象を示す属性で、レイアウトの`excludeFromSearch`で外れる。このintegrationはこれを「本文のある記事ページ」の目印に使い、持たないページ（一覧・リダイレクト先等）は変換しない。


## 全体像（`index.ts`）

| フック | 処理 |
| --- | --- |
| `astro:config:done` | `config.site`を`siteUrl`として保持（絶対URL化用）。`content/en`の絶対パスも保持 |
| `astro:build:done` | `pages`を走査してHTML→MD変換。続けてUI一覧`.md`、最後に`llms.txt`を生成 |

- 対象は`INCLUDE_PREFIXES`（`docs/` `ui/` `en/docs/` `en/ui/`）に当たり、かつ`EXCLUDE_PREFIXES`（`docs/layout-demos/` `en/docs/layout-demos/`：記事本文を持たない設定データ駆動ページ）に当たらないパスだけ。`patterns/` `templates/` `_demo/` `preview/` `og/`等は対象外。
- `article[data-pagefind-body]`が無いページは`ArticleNotFoundError`として警告ログを出しスキップする。それ以外の例外（rehypeのTypeError、I/O失敗、HTMLパス不整合等）はrethrowしてbuildを失敗させる。`llms.txt`が指す`.md`だけが静かに欠ける事故を防ぐため。


## HTML→Markdown変換（`convert-html-to-md.ts`）

`dist/{path}/index.html`を読み、unifiedパイプラインを次の順で適用して`dist/{path}.md`へ出力する。

1. `rehype-parse`: HTMLをhastに変換
2. `rehype-extract-meta`: `<head>`から`<title>` / `<meta name="description">` / `<link rel="canonical">`を`file.data`へ保管
3. `rehypeKeepArticle`（ローカル）: `article[data-pagefind-body]`だけを残す。無ければthrow
4. `rehype-strip-noise`: `nav.c--postNav` / `<script>` / `<style>` / `data-astro-cid-*` / コピーボタン等のノイズを除去
5. `rehype-preview`: `c--preview_area` / `b--tabs_list` / `__decorator`等のプレビューUIを除去
6. `rehype-docs-link`: `<a class="c--docsLink">`の中身をタイトル文字列だけにする（タイトル＋説明文の二重出力を防ぐ）
7. `rehype-code-language`: `<pre data-language="X">`の言語名を`<code class="language-X">`へ転記
8. `rehype-callouts`: `c--docsNote`をGFM Alert（`> [!NOTE]`等）に変換。`keycolor`と種別の対応表はこのファイルにある
9. `rehype-absolute-urls`: `a` / `area` / `link` / `img` / `source` / `video` / `audio` / `iframe`のURL属性（`srcset`・`poster`を含む）のルート相対URL（`/foo`）を`{siteUrl}/foo`に展開。パスは小文字化するが、`primitives` / `trait-class`セグメントとそれ以降は大文字小文字を維持する。`#anchor` / `mailto:` / 絶対URL / プロトコル相対（`//host`）は触らない
10. `rehype-remark`→`remark-gfm`→`remark-stringify`（`bullet: '-'`、`rule: '-'`、`fences: true`、`incrementListMarker: false`）

後処理:

- `remark-stringify`が`[`を`\[`にエスケープするので、既知種別（NOTE / TIP / IMPORTANT / WARNING / CAUTION）に限って`\[!XXX]`を`[!XXX]`へ戻す。
- 抽出したtitle / description / urlをYAML frontmatterとして先頭に付ける。titleの` - Lism CSS`サフィックスは除去する。


## `llms.txt`生成（`build-llms-txt.ts`）

`content/en/**/*.mdx`のfrontmatterを集計し、固定ヘッダー（サイト名・説明・GitHub / npm / License）の後にセクションごとのエントリ（`- [Title](URL): description`）を並べ、`dist/llms.txt`へ出力する。

- 除外: `_demo/`配下、`test.mdx`、`draft: true`、`title`か`description`が無いもの（警告ログ後にスキップ）。
- セクション分類（`classify()`）は消去法で次の順に評価する。`content/en/`に`docs/`ディレクトリは無く、URLの`/docs/`はルーティング側が付ける。

| 順 | セクション | 対象 |
| --- | --- | --- |
| 1 | Optional | `ui/examples/*` / `property-class/*` |
| 2 | UI Components | 上記以外の`ui/`配下（`ui/DummyText`も含む） |
| 3 | Getting Started | トップレベルの`overview` / `installation` / `changelog` / `features` / `mcp` / `skills` |
| 4 | Documentation | 残り全部 |

- ソート: Getting Startedは`GS_ORDER`の固定順（学習導線）、それ以外は`title`の昇順。
- URL（`toUrl()`）は`.md`版を指す。`ui/Xxx.mdx`→`{siteUrl}/en/ui/{slug}.md`、それ以外→`{siteUrl}/en/docs/{slug}.md`。


## UI一覧`.md`生成（`build-ui-index-md.ts`）

`/ui/`と`/en/ui/`の一覧ページは`excludeFromSearch`で`data-pagefind-body`を持たず、通常の変換ではスキップされる。その代替として、リンク集の`dist/ui.md`と`dist/en/ui.md`を`astro:build:done`内でja / en各1回生成する。

- frontmatter（title / description / url）: ビルド済み`dist/{lang}/ui/index.html`から`rehype-extract-meta`と同等の処理で取得し、一覧ページ本体と同期させる。
- 本文: `content/{ja,en}/ui/`を`walkMdx`で走査する。`_`始まりのファイル・ディレクトリと`draft: true`は除外。
- 見出し: `ui/`直下は`## Blocks`、`examples/`は`## Examples`。各タイトル昇順。
- リンク先: 各ページの`.md`（`convert-html-to-md.ts`の生成物）。


## `.md`の応答ヘッダー

`apps/site/public/_headers`の`/*.md`ルールと、`wrangler.jsonc`の`run_worker_first: ["/*.md"]`で`.md`だけに挟まる`apps/site/worker/index.ts`で付ける。

- `X-Robots-Tag: noindex`: 検索結果には載せない（AI向けクロールは許容）。`_headers`で付け、Workerも成功応答と304に明示する。
- `Content-Type: text/markdown; charset=utf-8`: 静的アセット配信はcharsetを付けないため、Workerが成功応答と304に付ける。存在しない`.md`の404はHTMLのまま返し、`text/markdown`を付けない（`_headers`に書くとパスパターン式のため404にも付いてしまう）。


## 出力の確認

`.md`の件数と`llms.txt`のエントリ数はコンテンツで変わるので固定値は記録しない。ビルドログ（`generated N markdown files (M skipped)` / `generated llms.txt (N entries)`）で確認する。想定内のスキップは`/ui/` `/en/ui/`の一覧ページだけ。他がスキップされたら原因を調べる。
