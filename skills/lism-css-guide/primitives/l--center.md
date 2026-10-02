# l--center / `<Center>`

要素を上下左右中央揃えで配置するクラス。高さの有無で水平中央のみ / 上下左右中央を自動的に切り替えます。

公式ドキュメント（使い方・コード例）: https://lism-css.com/docs/primitives/l--center.md

## 既定の挙動

- `display:grid`。
- `grid-template-columns:minmax(0, auto)`。
- `place-content:center`と`place-items:center`で子要素を中央配置します。
- 中央配置のために`d="grid"`、`pc="center"`、`pi="center"`などを重ねる必要はありません。

## 動作の仕組み

- 高さを持たない場合: コンテンツを**水平方向のみ**中央揃え（内在的な中央寄せ。長いテキストは左寄せのまま）
- 高さ・アスペクト比（`h`, `min-h`, `ar` など）が設定されている場合: **垂直方向も中央揃え**

## 関連プリミティブ

- [l--frame](./l--frame.md) — アスペクト比付きメディアフレーム（`<Center>` と組み合わせられる）
- [l--stack](./l--stack.md) — `ai="center"` で水平中央の内在的な中央寄せが可能
- [l--grid](./l--grid.md) — `ga="1/1"` で重ね配置のオーバーレイ
