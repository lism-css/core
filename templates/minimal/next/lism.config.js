/**
 * Lism CSS のプロジェクト設定。
 *
 * props / tokens / traits / breakpoints などをここで上書き・追加できる。
 * dev 中（`next dev`）にこのファイルを保存すると、@lism-css/plugin/next の withLism が
 * CSS / 型を自動再生成する。詳細: https://lism-css.com/docs/customize/config/
 */
export default {
  tokens: {
    // 例: カスタムカラートークン。`--success` を出力し、`c="success"` / `bgc="success"` などの props で使える。
    color: {
      success: 'oklch(0.6 0.15 150)',
    },
    // 既定値の上書き: `--fw--bold` を 700 から 600 にする。
    fw: { bold: '600' },
  },
};
