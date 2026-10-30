基準日: 2026-09-23・コミット50e44dbb2

# apps/site 更新作業の入口

この文書が持つもの: `apps/site`を更新するときに、どのコマンド・スクリプトを使うかの入口と委譲先。
持たないもの: 各処理の中身（`docs-md` integrationは[docs-md.md](./docs-md.md)、コマンドの手順は`.claude/commands/`配下）。


## package更新を反映する

`packages/lism-css` / `packages/lism-ui`の実装（Props・CSS・コンポーネント）が変わったら`/docs-update`を使う。`lism-docs-editor`サブエージェントをディレクトリグループ単位で並列起動し、Props名・コード例・HTML出力・importパス・リンク切れをソースと突き合わせて1パスで修正する。手順は`.claude/commands/docs-update.md`。

### CDN URLのバージョン番号

`packages/lism-css`のバージョンを上げても、MDXやREADMEのCDN URL（`cdn.jsdelivr.net/npm/lism-css@x.y.z/...`）は自動では変わらない。`nr sync:cdn-versions`が`packages/lism-css/package.json`の`version`を正として一括で書き換える。対象は`scripts/sync-cdn-versions.mjs`の`targets`。


## 翻訳する

`content/ja/`を正として`content/en/`へ同期するには`/docs-translation`を使う。ja / enの差分を新規・更新・削除・スキップに分類し、ユーザーの実行確認を得てから`lism-docs-translator`サブエージェントを並列起動する。手順は`.claude/commands/docs-translation.md`。

| 引数 | 対象 |
| --- | --- |
| なし | `ja/`配下の全`.mdx` |
| `root` | `ja/`直下のみ（サブディレクトリ除外） |
| `ui/` | 指定ディレクトリ配下 |
| `overview.mdx` | 指定した1ファイル |


## llms.txt

個別に更新するコマンドは無い。`nr build:site`時に`docs-md` integrationが`content/en/`のフロントマターから`dist/llms.txt`を生成する。詳細は[docs-md.md](./docs-md.md)。


## sitemapのlastmod

`apps/site/lastmod-map.json`（コミット対象）を`src/lib/sitemap-lastmod.ts`が読む。CI環境はgit履歴が浅く正確な日時を取れないため、全履歴のあるローカルのリポジトリルートから`pnpm --filter lism-site generate:lastmod`を実行してコミットする。[公開手順](#公開する)でmainへのマージ前にこれを行うので、通常は任せる。手でmainへマージする場合は再生成を忘れない。


## 公開する

通常は公開する変更を`dev`へコミットし、`dev`をチェックアウトした状態で、リポジトリルートから`nr deploy`を実行する。未コミット・ステージ済みの変更は残さない。lastmodはコミット履歴から生成され、スクリプト内のコミットにはステージ済みの変更も含まれるため。

確認に`yes`と答えると、lastmodの更新・必要なコミット→`dev`を`main`へマージ→`main`をpush→`dev`へ戻ってpushする。コマンドの完了後、下記の除外条件に該当しなければ、GitHub Actionsの`Deploy site`が成功したことを確認する。

- 本番のビルドと配信は[deploy.yml](../.github/workflows/deploy.yml)が担当する。`main`へのpushで`build:site`→`apps/site`からWranglerでCloudflare Workersへデプロイする。手動で`main`へpushした場合も同じ経路になる。
- 変更がワークフローの`paths-ignore`に列挙されたパスだけなら実行されない。除外対象の正本は同ファイル。運営文書だけの変更は除外されるが、公開記事の`apps/site/src/content/`は対象になる。
- 認証にはGitHub secretsの`CLOUDFLARE_API_TOKEN`と`CLOUDFLARE_ACCOUNT_ID`を使う。値は文書やリポジトリへ保存しない。
- 配信設定は[wrangler.jsonc](../apps/site/wrangler.jsonc)、Markdown応答の仕様は[docs-md.md](./docs-md.md#mdの応答ヘッダー)を参照する。Workers BuildsのGit連携は解除済みで、Cloudflare側ではビルドしない。移行理由は[意思決定の記録](./decisions.md#2026-09-17-appssiteのデプロイをworkers-buildsからgithub-actionsへ移す)にある。secretsの設定状況はコードだけでは確認できないため、環境を引き継ぐ際に確認する。
