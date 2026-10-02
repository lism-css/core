---
name: lism-css-guide
description: 'Lism CSSでUIやページを実装・修正する時に使う実装ガイド。Primitive選定・トークン照合・Property Class/Lism Props活用・レスポンシブ設計・アンチパターン照合を変更規模に応じて行う。b--*, c--*, l--*, a--*, is--*, has--*, set--*, u--*, -prop:value形式のクラスやトークンの逆引きにも使う。'
---

# Lism CSS 実装ガイド

Lism CSSでUI・ページ・コンポーネントを実装する時の判断の起点。変更規模から実行レベルを判定し、実装前チェック→実装→提出前セルフチェックを通す。

公式ドキュメント: https://lism-css.com/docs/overview.md

**バージョン:** `lism-css@1.0.1`/`@lism-css/ui@0.40.1`時点の情報。プロジェクトのバージョンが異なる場合はユーザーに伝え、パッケージ更新またはこのスキルの更新を案内する。

## 実装フロー（厳守）

資料確認は、コード上の操作の直前に行う。どの操作の手前で何を読むかは「資料確認トリガー」に従う。

0. **実行レベル判定**: 「事前チェック実行レベル」で不要/軽量/通常/値照合付きを決める。
1. **初期確認**: SKILL.mdだけで実装しない。実装対象に明らかに関係する最小限の詳細ファイルを先に開き、実装プランに「初期確認した資料」を列挙する。リンク表を眺めただけは確認済みにしない。
2. 「目的別実装ガイド」でPrimitive/コンポーネントの候補を選ぶ。
3. 実装前チェック（C0–C8）を行い、初期確認した資料・使うPrimitive・コンポーネント・トークン・レスポンシブ方針を列挙した**実装プラン**を出す。未読のまま採用できない判断は🔁を付け、「読む資料」を判断行に紐づける。
4. 「資料確認トリガー」に従い、各操作をコードに書く手前で対応資料を読み、🔁を✅または⏸へ解消する。
5. ⏸が残る項目（px丸め・任意色・挙動変更・公開クラス変更など）は、その部分を実装する前にユーザー確認する。確認が取れない場合は「判定記号」の⏸の項に従う。
6. 実装する。
7. （通常・値照合付きのみ）「提出前セルフチェック」で実装プランと実装を照合する。

C0–C8の詳細と実装プランの書式は[`references/authoring.md`](./references/authoring.md)。

## 判定記号

実装プランの各行に付ける。使えるのは次の3記号と、✅への注記`✅新規`・`✅例外`・`✅前提`だけ。注記の組み合わせ（`✅例外/前提`等）や新しい記号・注記は作らない。該当する行は🔁として扱う。

| 記号 | 意味 |
| --- | --- |
| ✅ | 確定。新規定義（コンポーネント/トークン/クラス）や合意済みの直書き例外は行内に注記する（例: `✅新規`、`✅例外（1px罫線）`） |
| 🔁 | 資料確認トリガーに該当する未通過項目。対応操作をコードに書く手前で指定資料を読み、✅または⏸へ解消する。🔁のまま実装しない |
| ⏸ | 要ユーザー確認。確認まで実装しない |

**`✅例外`の条件**: `antipatterns.md`の「直書きしてよい例外」に該当する場合だけ。行にはその項目の引用を添え、引用を書けない行は⏸。それ以外の例外化・丸め・新規トークンは⏸。許可リストに例外カテゴリを自作しない。「正確に再現して」等のユーザー指示や実測値であることは根拠にならない。デザイン値の既定の扱いは[`references/authoring.md`](./references/authoring.md)の「デザインデータ取り込みフロー」に従う。

**⏸の確認が取れない場合**（自律実行など）: 原則準拠側の選択肢（すり合わせ済みの方針があればそれ、無ければ入力種別ごとの既定動作。例: 最寄りトークンへの丸め）を選び、その行を`✅前提（p="30"へ丸め）`のように更新して進め、完了報告で論点と代替案を列挙する。px直書き・例外カテゴリの新設・公開クラス変更・破壊的変更など逸脱側の選択肢は選べず、⏸のまま実装しない。

`lism-css-refactor`スキルは同じ記号を別の意味（✅=触らない、⬜=意図的に残す等）で使う。リファクタ時はrefactor側の定義に従い、どちらの意味かを表の見出し等で明示する。

## 実装前チェック項目（C0–C8）

| C | 見ること | 主な参照先 |
| --- | --- | --- |
| C0 | 入力整理:対象/粒度/フレームワーク/既存制約/不明点 | 既存コード・要件 |
| C1 | 構造・セマンティクス選定 | `primitive-class.md`、`components-core.md` |
| C2 | 再利用・コンポーネント境界 | `components-core.md`、`components-ui.md` |
| C3 | 命名設計 | `naming.md`、`css-rules.md` |
| C4 | 状態・バリエーション設計 | `trait-class.md`、`antipatterns-layout.md` |
| C5 | 値・トークン照合 | `tokens.md`、`property-class.md` |
| C6 | レスポンシブ方針 | `responsive.md`、`trait-class/is--container.md` |
| C7 | CSSに書くもの/Propsに移すもの | `property-class.md`、`css-rules.md` |
| C8 | 既定値の確認 | `primitives/l--*.md` |

## 事前チェック実行レベル

| レベル | 条件 | 確認するC | 出力 | 提出前セルフチェック |
| --- | --- | --- | --- | --- |
| 不要 | 説明のみ/コード変更なし/既存の書き方をなぞるだけの変更（下記の判定基準） | — | なし。手順6（実装）だけ行い、`.lism/`も作らない | 行わない |
| 軽量 | 数行の小変更・既存パターン内の変更・Props/Property Classだけで完結する小部品の追加 | C1・C5中心 | 3〜5行の箇条書き | 行わない |
| 通常 | 新規セクション、または新規CSS（`b--*`/`c--*`のスタイル宣言）を伴う新規部品 | 必須=初期確認した資料、C0、C1、C5、C6。該当時だけC2/C3/C4/C7/C8 | 項目別の表 | 実施し、`.lism/review.md`へ保存 |
| 値照合付き | Figma/スクショ等のデザイン再現 | 通常+C5/C7を詳しく確認 | 項目別の表＋トークン差分表（差分列必須）。チャットではなく`.lism/plan.md`へ保存 | 実施し、`.lism/review.md`へ保存 |

`.lism/`の規約は[`references/verification.md`](./references/verification.md)。

「不要」の判定基準: 次のいずれも含まなければ「不要」。1つでも含めば「軽量」以上。

- 新規の`c--*`/`b--*`クラス
- 新規のCSS宣言（ファイル・`<style>`）
- 既存コードで使っていないPrimitive/Trait/コンポーネントの導入
- 新規のレスポンシブ切替
- トークン外の数値・色

不要/軽量/通常で迷っても上のレベルへ上げない。デザイン再現かどうかで迷う場合だけ「値照合付き」にする。通常でも該当しないCは省略し、表を形だけ埋めず実装に影響する項目だけ列挙する。

## 資料確認トリガー

左の操作をコードに書く手前で右の資料を読む。未読ならその判断は🔁にし、読んで✅にするか、判断できなければ⏸にする。**🔁のままコードへ反映しない。**「必要なら参照」で代替しない。

| この操作をする手前で | この資料を読む |
| --- | --- |
| まだ読んでいないPrimitiveを使う | 該当の`primitives/l--*.md` |
| まだ読んでいないTrait Classを使う | 該当の`trait-class/*.md`または`trait-class.md` |
| スタイル宣言をCSS（ファイル・`<style>`）に書く、またはProperty Class/Lism Propsへ移す | `property-class.md` |
| hover/focus等の状態スタイルを書く | `property-class/hov.md`（必要に応じて`trait-class/has--transition.md`） |
| トークン外の数値・色をコードに書く（丸める場合を含む。CSS/Props問わず） | `tokens.md`、`antipatterns.md`の「px / 固定値の直書き」節 |
| レスポンシブの切替を決める | `responsive.md` |
| 独自クラス（`b--*`/`c--*`）を新しく作る/名前を付ける | `naming.md`、`css-rules.md`の`独自クラスの選び方（2分類）`節 |
| `b--*`/`c--*`のCSSを書く | `css-rules.md`の`Block Class（b--）`/`Custom Class（c--）`節 |
| 状態・バリエーションを設計する | `trait-class.md` |

## 最小ゲート

常に守る。迷う・例外にする・既存実装と衝突する場合は該当資料を読み、🔁を✅または⏸へ解消する。

- 構造は`<div>`+素のCSSよりPrimitiveを優先する。候補は「目的別実装ガイド」から選ぶ。
- `c--*`/`b--*`はBlockをcamelCase、Elementを`_`ひとつ、Modifierを`--`ふたつで命名する。`c--feature-card`や`__`は使わない。
- 独自クラスは2分類で命名する: ベーススタイルをCSS側で管理する共通基礎部品→`b--`、それ以外→`c--`。
- 独自CSSは必ず`@layer lism-custom`内に置く（`b--`のベーススタイルだけ`@layer lism-block`）。
- トークン外のpx/rem/em値を勝手に丸めたり直書きしたりしない。丸め・新規トークン・直書き例外は⏸（`✅例外`の条件は「判定記号」）。
- `c--*`では、単一要素にだけ効く宣言はCSSに書かず、まずLism Props/Property Classで表せないか確認する。CSSに残すのは擬似要素・子孫セレクタ・状態切替などProperty Classで書けない宣言だけ。名前として残すのは本体クラス`c--name`だけで、CSSで参照しないElement（`c--name_elem`）は付けない。`b--*`のベーススタイルは対象外で、トークンを使って`@layer lism-block`に書いてよい（BP切替・hover・例外的な調整はProperty Class）。
- レスポンシブ値は、container query運用なら必要な`isContainer`祖先を確認する。
- 状態は`data-*`/ARIA、見た目バリエーションはBlockと同じプレフィックスのModifier（`c--name--variant`/`b--name--variant`）で表す。`is--active`のようにTrait Classを状態名に流用しない。

## 目的別実装ガイド

やりたいことから候補を引く。複数候補の行は括弧内の基準で使い分ける。

| やりたいこと | 使う候補 | 詳細 |
| --- | --- | --- |
| 縦並び | `Stack`/`Flow` | `primitives/l--stack.md`、`primitives/l--flow.md` |
| 横並び | `Cluster`（折り返す）/`Flex`（細かく制御する） | `primitives/l--cluster.md`、`primitives/l--flex.md` |
| カラム | `Columns`（等幅N列）/`AutoColumns`（最小幅ベースの自動段組み）/`WithSide`（2カラム自動切替） | `primitive-class.md#カラムレイアウト-primitive-の使い分けガイド` |
| 幅制御 | `Container`（コンテナクエリ基準）/`Wrapper`（直下領域の幅制限）/`max-sz`（単体の幅） | `trait-class/is--container.md`、`trait-class/is--wrapper.md`、`property-class/max-sz.md` |
| 画像・動画・iframeを置く | `Frame`（アスペクト比枠・直下メディアのfit・overflowを任せる） | `primitives/l--frame.md` |
| ボタン | `@lism-css/ui`の`Button`。素の`<button>`を整えるならreset済みの`set--plain` | `components-ui.md`、`set-class.md` |
| ツールチップ・ポップオーバー | `@lism-css/ui`の`Tooltip`（ホバー/フォーカスの補足テキスト）/`Popover`（クリックで開くパネル。リンクやフォームを含むならこちら） | `components-ui.md` |
| hover効果 | `-hov:*`/`hov={{}}`/`set--hov`/`has--transition`（component CSSの`:hover`より先に検討） | `property-class/hov.md`、`trait-class/has--transition.md` |
| ボックス・カードの全体リンク | `BoxLink`/`is--boxLink`（クリック領域と重なり順を任せる） | `trait-class/is--boxLink.md` |
| 小さいUI部品 | `c--*`＋Property Class（`c--*`は何のパーツかを示す名前に留め、単一要素の見た目はProperty Class/Lism Propsへ）。ベーススタイルをCSS側で管理する共通部品なら`b--*` | `property-class.md`、`css-rules.md#custom-classc--`、`css-rules.md#block-classb--` |
| ページの定番セクション（ヒーロー・サイトヘッダー・フッター等） | `Group`＋`Wrapper`/`Stack`/`Cluster`の定番構成 | `references/page-sections.md` |

## 提出前セルフチェック

通常・値照合付きレベルだけ行う。不要・軽量では、チャット内の簡易確認も評価サブエージェントへの委任もしない。

サブエージェント／タスク委任機能が使える環境では、この節の照合を実装した本人ではなく読み取り専用の評価サブエージェントに委任する（指示テンプレ・報告書式・再評価ループは[`references/verification.md`](./references/verification.md)）。報告は`.lism/review.md`へ保存し、違反ゼロになるまで修正→再評価を繰り返してから提出し、完了報告で`.lism/review.md`を参照する。委任できない環境では、本人が同じ照合をこの節の順に行う。

まず実装プランと実装を1行ずつ照合し、差分を「計画変更（意図的）/実装漏れ（直す）/要確認（再び確認が必要）」に分類する。その後、次を確認する。

**プロセス照合**

- 実装プラン内の🔁が✅または⏸へ解消されているか。🔁のままコードに反映した判断がないか。
- 資料確認ログの各行が実装プランの判断項目と対応しているか。未読のまま採用したPrimitive/トークン/命名/レスポンシブ判断がないか。

**ルール照合**

- 「最小ゲート」の各項目に違反していないか。
- [`antipatterns.md`](./antipatterns.md)と[`antipatterns-layout.md`](./antipatterns-layout.md)のTOCを開き、実装コードに該当しうる項目を1つずつ照合する。リンク表を眺めただけは確認済みにしない。

**プラン再審査**（プラン段階で✅にした逸脱は差分照合では検出できないため、別に行う）

- `✅例外`を含む✅判定を、最小ゲート・`antipatterns.md`の「直書きしてよい例外」・すり合わせ済みの値マッピング方針に再照合する。許可リスト外の`✅例外`は⏸へ戻す。
- 値照合付きでは、`.lism/plan.md`にトークン差分表（差分列付き）があるか確認する。無ければ実装プランは無効。差分表を作って照合をやり直す。スケール前提（画像の書き出し倍率等）が実測・整合チェックで検証済みかも確認する（未検証なら差分表全体が無効）。
- 実行レベル判定が妥当だったか見直す（デザイン再現なのに「値照合付き」へ上げず、差分表を回避していないか）。

**個別確認**

- `@lism-css/ui`の既存コンポーネントで置き換えられないか。
- 同じProperty Classの組み合わせが3箇所以上ならコンポーネント化を検討したか。
- 既存の命名・レイヤー・ファイル配置に合っているか。
- 値照合付きでは、レンダリング結果の確認を完了報告の前提にする。確認できない環境では完了報告にユーザーへの目視確認依頼を含める。HTTPステータスやビルド成功だけで完了扱いにしない。

## 詳細リファレンス

| ファイル | 内容・読む時 |
| --- | --- |
| `primitive-class.md` | `l--`/`a--` Primitive一覧と使い分け。レイアウト選定（必要なら`primitives/l--*.md`も） |
| `trait-class.md` | `is--`/`has--` Trait一覧と役割。状態・バリエーション設計 |
| `property-class.md` | `-{prop}:{value}`形式のProperty Class。CSSをProperty Class/Propsへ移せるか |
| `utility-class.md` | `u--*`ユーティリティ |
| `set-class.md` | `set--plain`/`set--hov`等のセットクラス。reset済みボタン等 |
| `tokens.md` | デザイントークンとCSS変数。余白・色・角丸・影・fzの照合 |
| `naming.md` | 命名規則とProperty Class省略ルール |
| `css-rules.md` | CSS設計・Layer構造・`b--*`/`c--*`・独自クラスの分類。カスタムCSS |
| `responsive.md` | BP・コンテナクエリ・レスポンシブProps |
| `base-styles.md` | Reset CSSとHTML要素の基本スタイル。素のHTML要素の既定を確認 |
| `components-core.md` | `lism-css`のReact/Astroコアコンポーネント |
| `components-ui.md` | `@lism-css/ui`のUIコンポーネント。UIコンポーネント置換 |
| `customize.md` | SCSS変数・`lism.config.js`によるカスタマイズ |
| `antipatterns.md` | AIが生成しがちなNG→OK（値・スタイル宣言系）。典型ミス確認 |
| `antipatterns-layout.md` | NG→OKの分冊（構造・レイアウト・レスポンシブ系） |
| `references/authoring.md` | 実装プランの作り方（C0–C8詳細・出力フォーマット） |
| `references/verification.md` | `.lism/`規約・評価サブエージェントへの委任 |
| `references/page-sections.md` | ヒーロー・ヘッダー・フッター等の定番構成例 |

## クラス単位の詳細リファレンス

ファイル名はクラス名そのまま（`primitives/l--stack.md`等）。対応コンポーネント名は`components-core.md`。

- `primitives/`: `l--box` `l--flex` `l--stack` `l--cluster` `l--grid` `l--flow` `l--center` `l--frame` `l--columns` `l--tileGrid` `l--autoColumns` `l--switchColumns` `l--withSide` `a--icon` `a--divider` `a--spacer` `a--decorator`
- `trait-class/`: `is--container` `is--wrapper` `is--layer` `is--boxLink` `has--transition` `has--gutter` `has--snap` `has--mask`
- `property-class/`: `all-props.md`（全Prop表）、`bd.md`（`-bd`/`-bd-{side}`系）、`hov.md`（`-hov:*`系）、`max-sz.md`（`-max-sz:full`/`bleed`）

## このスキルファイル自身のアップデート方法

スキル更新の依頼には`lism-cli skill add`または`lism-cli skill update`を案内する。最新はGitHubリポジトリの`skills/lism-css-guide`で確認する。
