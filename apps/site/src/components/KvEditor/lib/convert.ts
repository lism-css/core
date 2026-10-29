// HTML（素のタグ + Lism Property Class）と JSX（Lism React コンポーネント表記）の双方向変換。
// KVエディターデモ専用の軽量実装で、lism-css の実行時ロジックは import しない
// （PROPS / TOKENS / BREAK_POINTS は純データなのでクライアントバンドルに React を持ち込まない）。
//
// 対応範囲（仕様）:
// - `-prop:val` クラス ⇔ `prop="val"` （prop が PROPS テーブルに存在するもののみ）
// - レスポンシブ: `-p:20 -p_sm -p_md` クラス + `--p_sm`/`--p_md` の style 変数 ⇔ `p={[20, 40, 50]}`
//   （PROPS の bp:1 の prop のみ・配列記法のみ。オブジェクト記法 `{{base,md}}` や `g={8}` 等の
//   その他の `{}` 式は非対応で、XML パースエラー → null（last-good 維持）になる。
//   集約は往復ガード付き: 配列へ束ねて再展開したとき元のクラス・宣言を文字単位で再現できる
//   組だけを集約し、それ以外（変数だけ・クラスだけ・非正準な値）は素通しする）
// - スペース区切り値: `-p` クラス + `--p` の style 変数 ⇔ `p="10 20"`（padding の一括指定など。
//   本物はトークンでない値をプロパティクラスにせず変数で出力するため、その形に合わせる。
//   対象は bp 対応 prop と alwaysVar の prop のみで、それ以外（`bd="1px solid red"` 等、本物は
//   生のスタイル宣言を書く）は変換不能 → null（last-good 維持）。BP 配列の base スロットも非対応）
// - `-bd` などの bare クラス ⇔ `bd`（値なしの boolean prop。key が PROPS に存在するもののみ。
//   本物の `val === true` → `-{prop}` と同じ規則。XML は値なし属性を書けないため前処理でマーカー化する。
//   `--{prop}` 宣言を伴う場合は上のスペース区切り値として扱う）
// - `-hov:val` クラス ⇔ `hov="val"` （hov は PROPS 外の特別扱い prop。文字列形式のみ・空白区切りで複数可。
//   boolean（値なし -hov）/ オブジェクト形式（inline CSS 変数が絡む）は非対応で className 保持）
// - `u--{name}` クラス ⇔ `util="{name}"` （util も PROPS 外の特別扱い prop。空白区切りで複数可）
// - `set--{name}` クラス ⇔ `set="{name}"` （set も util と同じ分割規則＝本物の mergeSet。
//   `-` prefix の除外指定はどちらも非対応 → 変換エラー = last-good 維持）
// - set / util の class 内の正準位置は本物の buildClassName の出力順と同じ:
//   レイアウトクラスの直後に set-- → u-- → prop クラスの順
// - `l--{layout}` ⇔ レイアウトコンポーネント（Box / Center / Cluster / Columns / Flex / Frame /
//   Grid / Stack / TileGrid。タグが div 以外なら as="tag"）
// - h1〜h6 ⇔ <Heading level="n">、p ⇔ <Text>
// - Lism prop クラスを持つ span ⇔ <Inline>（Inline のデフォルトタグ = span）
// - 上記以外のタグで Lism prop クラスを持つもの ⇔ <Lism as="tag">
// - 変換できないクラスは className として保持（HTML へ戻す際は本物と同じく class の先頭へ出力する）
// - 属性の正準形: HTML は class → style → その他、JSX は level/as → props → className → style → その他
import { PROPS, TOKENS } from 'lism-css/config';
// BREAK_POINTS は定義元から直接読む。`lism-css/config` 経由の re-export は
// ビルドのツリーシェイクで落ちるため（dist/config/index.js の export に含まれない）
import { BREAK_POINTS } from 'lism-css/config/defaults/breakpoints';
import { VOID_TAGS } from './validate';

// 対応するレイアウトコンポーネント。クラス名は本物と同じ `l--{layout}` 規則（src/lib/getLayoutProps.ts）。
// 固有の prop 処理を併せ持つ Flow / WithSide / AutoColumns / SwitchColumns は、クラスだけでは
// 往復が成立しないため対象外（それらのタグは変換不能 = last-good 維持になる）
const LAYOUT_COMPONENTS = ['Box', 'Center', 'Cluster', 'Columns', 'Flex', 'Frame', 'Grid', 'Stack', 'TileGrid'];
const layoutClassOf = (component: string): string => `l--${component[0].toLowerCase()}${component.slice(1)}`;
const COMPONENT_TO_LAYOUT_CLASS: Record<string, string> = Object.fromEntries(LAYOUT_COMPONENTS.map((c) => [c, layoutClassOf(c)]));
const LAYOUT_CLASS_TO_COMPONENT: Record<string, string> = Object.fromEntries(LAYOUT_COMPONENTS.map((c) => [layoutClassOf(c), c]));

// 単一テキスト子を1行にまとめる際の行長上限（インデント込み）
const INLINE_MAX_LENGTH = 80;
const INDENT = '  ';

/** `-fz:5xl` のような Property Class トークンを [prop, value] に分解（PROPSに無いキーは null） */
const parsePropToken = (token: string): [string, string] | null => {
  const m = token.match(/^-([a-zA-Z][a-zA-Z-]*):(.+)$/);
  if (!m) return null;
  const [, key, value] = m;
  if (!Object.hasOwn(PROPS, key)) return null;
  return [key, value];
};

/** テキストノード用のエスケープ（editor.ts のハイライト前プレーンテキスト描画とも共有する） */
export const escapeText = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (value: string): string => escapeText(value).replace(/"/g, '&quot;');

/** 属性の文字列表現 `name="value"` */
const attrToString = (name: string, value: string): string => `${name}="${escapeAttr(value)}"`;

// ---------------------------------------------------------------------------
// レスポンシブ（BP）props の双方向変換コア
// 本物の Lism は BP 値を「`-{prop}_{bp}` クラス + `--{prop}_{bp}` style 変数」の組で出力する
// （src/lib/getLismProps.ts の setAttrs）。ここではそのデモ用サブセットを写し、
// 「配列 → クラス + 変数」の展開（expandBpProp）を両方向で共有することで往復の正準形を一意にする。
// ---------------------------------------------------------------------------

/** `={[...]}` を XML 属性値へ書き換える際の目印（私用領域文字。通常の入力と衝突しない） */
const BP_ARRAY_MARKER = '\uE000';

/** 値なし属性（boolean prop）を XML 属性値へ書き換える際の目印（私用領域文字） */
const BOOL_MARKER = '\uE001';

/** 配列 prop のスロット値（null はその BP の指定なし） */
type BpSlotValue = string | number | null;

interface StyleDecl {
  name: string;
  value: string;
}
interface BpExpansion {
  classTokens: string[];
  styleDecls: StyleDecl[];
}

// 配列記法 [base, sm, md, lg, xl] の BP キー順。本物の定義（config/defaults/breakpoints.ts の
// BREAK_POINTS）が位置の公開契約そのものなので、そのまま使う
// （indexOf に任意の文字列を渡せるよう、タプル型から readonly string[] に広げる）
const BP_KEYS: readonly string[] = BREAK_POINTS;

// PROPS / TOKENS から参照するのは bp（レスポンシブ対応可否）と token（値変換の種別）のみ
const propToken = (key: string): string | undefined => {
  if (!Object.hasOwn(PROPS, key)) return undefined;
  const config = (PROPS as Record<string, { token?: string | false }>)[key];
  return typeof config.token === 'string' ? config.token : undefined;
};
const isBpProp = (key: string): boolean => Object.hasOwn(PROPS, key) && (PROPS as Record<string, { bp?: number | number[] }>)[key].bp === 1;
const tokenCatalogHas = (token: string, key: string): boolean => {
  if (!Object.hasOwn(TOKENS, token)) return false;
  const map = (TOKENS as Record<string, unknown>)[token];
  return typeof map === 'object' && map !== null && Object.hasOwn(map, key);
};

/** `-fz_md` のような BP クラス（BP キーは BP_KEYS から導出する） */
const BP_CLASS_RE = new RegExp(`^-([a-zA-Z][a-zA-Z-]*)_(${BP_KEYS.join('|')})$`);

/** 文字列が数値表記そのもののときだけ number にする（'020' や '1e3' は文字列のまま） */
const maybeNumber = (value: string): string | number => {
  const n = Number(value);
  return Number.isFinite(n) && String(n) === value ? n : value;
};

/** space トークンの単一値を CSS 値へ（getMaybeSpaceVar の規則のうち、0 と整数・負の整数の変数化だけを写したもの。小数などは変換しない） */
const spaceValueToCss = (value: string): string => {
  if (value === '0') return '0';
  if (/^\d+$/.test(value)) return `var(--s${value})`;
  if (/^-\d+$/.test(value)) return `calc(-1 * var(--s${value.slice(1)}))`;
  return value;
};

/** BP 成分値の forward 変換（本物の getMaybeCssVar のデモ用サブセット） */
const bpValueToCss = (value: string, token: string | undefined): string => {
  if (token === 'space') {
    // スペース区切りの複数値（例 p の "20 40"）は各要素を変換する
    return value.split(/\s+/).filter(Boolean).map(spaceValueToCss).join(' ');
  }
  if (token && tokenCatalogHas(token, value)) return `var(--${token}--${value})`;
  return value;
};

/** 単純な space 変数の複数値（例 `var(--s20) var(--s40)`。calc 入りは対象外） */
const SPACE_MULTI_RE = /^(?:0|var\(--s\d+\))(?: (?:0|var\(--s\d+\)))+$/;

/** BP 成分値の reverse 変換（--p_md の値 → 配列スロット値）。厳密性は往復ガード側が担保する */
const cssToBpValue = (css: string, token: string | undefined): string | number => {
  if (token === 'space') {
    if (css === '0') return 0;
    const single = css.match(/^var\(--s(\d+)\)$/);
    if (single) return Number(single[1]);
    const negative = css.match(/^calc\(-1 \* var\(--s(\d+)\)\)$/);
    if (negative) return -Number(negative[1]);
    if (SPACE_MULTI_RE.test(css)) {
      return css
        .split(' ')
        .map((part) => (part === '0' ? '0' : part.match(/^var\(--s(\d+)\)$/)![1]))
        .join(' ');
    }
    return css;
  }
  if (token) {
    const m = css.match(/^var\(--([a-zA-Z-]+)--(.+)\)$/);
    if (m && m[1] === token && tokenCatalogHas(token, m[2])) return maybeNumber(m[2]);
  }
  return maybeNumber(css);
};

/**
 * 配列値 [base, sm, md, lg, xl] をクラス + style 変数へ展開する（両方向共有・往復の正準形の唯一の定義点）。
 * base はトークンクラスへの機械変換（既存の `-prop:val` と同じ）、BP 成分は本物同様クラス + 変数の組になる。
 */
const expandBpProp = (key: string, values: BpSlotValue[]): BpExpansion => {
  if (values.length === 0 || values.length > BP_KEYS.length + 1) {
    throw new JsxConvertError(`invalid bp array length for ${key}: ${values.length}`);
  }
  const token = propToken(key);
  const classTokens: string[] = [];
  const styleDecls: StyleDecl[] = [];
  values.forEach((value, i) => {
    if (value === null || value === '') return; // 空スロットはスキップ（本物の filterEmptyObj 相当）
    const str = String(value);
    // クラス・style 属性の文字列表現を壊す値は変換不能として扱う
    if (str.includes(BP_ARRAY_MARKER) || str.includes(BOOL_MARKER) || /[;\n\r]/.test(str)) {
      throw new JsxConvertError(`invalid bp value: ${str}`);
    }
    if (i === 0) {
      if (/\s/.test(str)) throw new JsxConvertError(`invalid base value: ${str}`);
      classTokens.push(`-${key}:${str}`);
      return;
    }
    const bp = BP_KEYS[i - 1];
    classTokens.push(`-${key}_${bp}`);
    styleDecls.push({ name: `--${key}_${bp}`, value: bpValueToCss(str, token) });
  });
  return { classTokens, styleDecls };
};

/**
 * `-{prop}` クラス + `--{prop}` 変数の組を出力できる prop か。
 * 本物の setAttrs はこの形を bp 対応 prop と alwaysVar 指定の prop にだけ使い、
 * それ以外は生のスタイル宣言（`padding: ...`）を書くため、ここでは前者だけを対象にする
 */
const supportsVarForm = (key: string): boolean => {
  if (!Object.hasOwn(PROPS, key)) return false;
  const config = (PROPS as Record<string, { bp?: number | number[]; alwaysVar?: number }>)[key];
  return Boolean(config.bp) || Boolean(config.alwaysVar);
};

/**
 * トークンにならない値（`p="10 20"` のようなスペース区切り）をクラス + style 変数へ展開する。
 * 本物はトークン以外の値をプロパティクラスにせず `-{prop}` + `--{prop}` で出力する
 * （src/lib/getLismProps.ts の setAttrs 末尾）。expandBpProp と同じく両方向で共有し正準形を一意にする。
 */
const expandVarProp = (key: string, value: string): BpExpansion => {
  if (!supportsVarForm(key)) throw new JsxConvertError(`prop cannot hold a spaced value: ${key}`);
  // クラス・style 属性の文字列表現を壊す値は変換不能として扱う
  if (value.includes(BP_ARRAY_MARKER) || value.includes(BOOL_MARKER) || /[;\n\r]/.test(value)) {
    throw new JsxConvertError(`invalid value for ${key}: ${value}`);
  }
  return {
    classTokens: [`-${key}`],
    styleDecls: [{ name: `--${key}`, value: bpValueToCss(value, propToken(key)) }],
  };
};

/** style 属性を宣言リストへ分解。壊れた宣言・括弧の不整合があれば null（= その要素は集約しない） */
const parseStyleDecls = (style: string): StyleDecl[] | null => {
  // `;` での分割は括弧の外だけで行う（var() や url() の中の `;` を壊さない）
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of style) {
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth < 0) return null;
    }
    if (ch === ';' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (depth !== 0) return null;
  parts.push(current);

  const decls: StyleDecl[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon <= 0) return null;
    const name = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    if (!name || !value || /\s/.test(name)) return null;
    decls.push({ name, value });
  }
  return decls;
};

/** style 宣言の正準形（`name: value; name: value`） */
const serializeStyleDecls = (decls: StyleDecl[]): string => decls.map((d) => `${d.name}: ${d.value}`).join('; ');

/**
 * JSX の配列リテラル式 `{[20, null, '5xl']}` を安全にパースする（eval 禁止）。
 * source[start] が `{` である前提で、成功時は [items, `}` の次の位置]、
 * ネスト・末尾カンマ・エスケープ入り文字列・空配列などは null（= 非対応の `{}` 式扱い）。
 */
const parseBpArrayExpr = (source: string, start: number): [BpSlotValue[], number] | null => {
  let i = start;
  if (source[i] !== '{') return null;
  i += 1;
  const skipWs = () => {
    while (i < source.length && /\s/.test(source[i])) i += 1;
  };
  skipWs();
  if (source[i] !== '[') return null;
  i += 1;
  const items: BpSlotValue[] = [];
  let expectItem = true;
  for (;;) {
    skipWs();
    if (i >= source.length) return null;
    const ch = source[i];
    if (ch === ']') {
      if (expectItem && items.length > 0) return null; // 末尾カンマ
      i += 1;
      break;
    }
    if (!expectItem) {
      if (ch !== ',') return null;
      i += 1;
      expectItem = true;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const close = source.indexOf(ch, i + 1);
      if (close === -1) return null;
      const text = source.slice(i + 1, close);
      if (text.includes('\\')) return null;
      items.push(text);
      i = close + 1;
    } else {
      const m = source.slice(i).match(/^(?:null|-?\d+(?:\.\d+)?)/);
      if (!m) return null;
      items.push(m[0] === 'null' ? null : Number(m[0]));
      i += m[0].length;
    }
    expectItem = false;
  }
  skipWs();
  if (source[i] !== '}') return null;
  if (items.length === 0) return null;
  return [items, i + 1];
};

const printJsxBpArrayItem = (value: BpSlotValue): string => (value === null ? 'null' : typeof value === 'number' ? String(value) : `'${value}'`);

/** 配列 prop の JSX 属性文字列（例 `fz={['4xl', null, '5xl']}`） */
const printJsxBpArrayAttr = (key: string, values: BpSlotValue[]): string => `${key}={[${values.map(printJsxBpArrayItem).join(', ')}]}`;

const sameStringSet = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return set.size === a.length && b.every((item) => set.has(item));
};

interface BpAggregation {
  values: BpSlotValue[];
  declNames: string[];
}

/**
 * base トークン + BP クラス + style 変数から配列 prop への集約を試みる（HTML → JSX）。
 * 往復ガード: 復元した配列を expandBpProp で再展開して元のクラス・宣言を文字単位で再現でき、
 * かつ配列リテラルの print → parse が一致する組だけを集約する。失敗時は null（呼び出し側が素通し）。
 */
const tryAggregateBpProp = (
  key: string,
  baseUnit: { value: string; token: string } | null,
  bpUnits: { bp: string; slot: number; token: string }[],
  decls: StyleDecl[]
): BpAggregation | null => {
  // 同一 BP クラスの重複は不可
  if (new Set(bpUnits.map((u) => u.slot)).size !== bpUnits.length) return null;

  const maxSlot = Math.max(...bpUnits.map((u) => u.slot));
  const values = new Array<BpSlotValue>(maxSlot + 1).fill(null);
  if (baseUnit) values[0] = maybeNumber(baseUnit.value);
  const token = propToken(key);
  const declNames: string[] = [];
  const usedDecls: StyleDecl[] = [];
  for (const unit of bpUnits) {
    const name = `--${key}_${unit.bp}`;
    const matches = decls.filter((d) => d.name === name);
    if (matches.length !== 1) return null; // 宣言なし・重複はクラスと 1:1 にならない
    values[unit.slot] = cssToBpValue(matches[0].value, token);
    declNames.push(name);
    usedDecls.push(matches[0]);
  }

  let expansion: BpExpansion;
  try {
    expansion = expandBpProp(key, values);
  } catch (e) {
    if (e instanceof JsxConvertError) return null;
    throw e;
  }
  const originalTokens = [...(baseUnit ? [baseUnit.token] : []), ...bpUnits.map((u) => u.token)];
  if (!sameStringSet(expansion.classTokens, originalTokens)) return null;
  if (expansion.styleDecls.length !== usedDecls.length) return null;
  for (const gen of expansion.styleDecls) {
    const orig = usedDecls.find((d) => d.name === gen.name);
    if (!orig || orig.value !== gen.value) return null;
  }
  const printed = printJsxBpArrayAttr(key, values);
  const reparsed = parseBpArrayExpr(printed, key.length + 1);
  if (!reparsed || reparsed[1] !== printed.length) return null;
  if (reparsed[0].length !== values.length || reparsed[0].some((v, i) => v !== values[i])) return null;

  return { values, declNames };
};

interface VarAggregation {
  value: string;
  declNames: string[];
}

/**
 * bare クラス `-{prop}` + `--{prop}` 宣言から値付き prop への集約を試みる（HTML → JSX）。
 * `--{prop}` を伴わない bare クラスは本物でも `val === true` の出力なので、boolean prop のまま残る。
 * 往復ガード: 復元した値を expandVarProp で再展開して元のクラス・宣言を再現できる組だけ集約する。
 */
const tryAggregateVarProp = (key: string, decls: StyleDecl[]): VarAggregation | null => {
  const name = `--${key}`;
  const matches = decls.filter((d) => d.name === name);
  if (matches.length !== 1) return null; // 宣言なし・重複はクラスと 1:1 にならない
  const value = String(cssToBpValue(matches[0].value, propToken(key)));
  // JSX → HTML でこの形に戻るのはスペースを含む値だけ（それ以外はプロパティクラスになる）
  if (!/\s/.test(value)) return null;

  let expansion: BpExpansion;
  try {
    expansion = expandVarProp(key, value);
  } catch (e) {
    if (e instanceof JsxConvertError) return null;
    throw e;
  }
  if (expansion.classTokens.length !== 1 || expansion.classTokens[0] !== `-${key}`) return null;
  if (expansion.styleDecls.length !== 1) return null;
  if (expansion.styleDecls[0].name !== name || expansion.styleDecls[0].value !== matches[0].value) return null;

  return { value, declNames: [name] };
};

// ---------------------------------------------------------------------------
// 共通プリンタ
// ノード列を「要素・テキストごとに1行、2スペースインデント」で整形する。
// 単一テキスト子だけを持つ要素は、行長が収まる場合のみインライン化（例: <span ...>⌘K</span>）。
// ---------------------------------------------------------------------------

interface PrintableElement {
  /** 出力タグ名（HTMLならタグ、JSXならコンポーネント名 or タグ） */
  name: string;
  /** 出力属性（変換済み、順序保持） */
  attrs: string[];
  children: PrintableNode[];
  /** HTML の void 要素（<br /> など、子を持たない） */
  isVoid: boolean;
}
type PrintableNode = { kind: 'element'; el: PrintableElement } | { kind: 'text'; text: string };

const printNodes = (nodes: PrintableNode[], depth: number, mode: 'jsx' | 'html'): string[] => {
  const lines: string[] = [];
  const indent = INDENT.repeat(depth);

  for (const node of nodes) {
    if (node.kind === 'text') {
      lines.push(indent + escapeText(node.text));
      continue;
    }
    const { name, attrs, children, isVoid } = node.el;
    const openTag = attrs.length ? `<${name} ${attrs.join(' ')}` : `<${name}`;

    if (isVoid) {
      lines.push(`${indent}${openTag} />`);
      continue;
    }
    if (children.length === 0) {
      // JSX は自己終了、HTML では <div /> が不正なため空タグペアで出力する
      lines.push(mode === 'jsx' ? `${indent}${openTag} />` : `${indent}${openTag}></${name}>`);
      continue;
    }
    // 単一テキスト子はインライン化を試みる
    if (children.length === 1 && children[0].kind === 'text') {
      const inline = `${indent}${openTag}>${escapeText(children[0].text)}</${name}>`;
      if (inline.length <= INLINE_MAX_LENGTH) {
        lines.push(inline);
        continue;
      }
    }
    lines.push(`${indent}${openTag}>`);
    lines.push(...printNodes(children, depth + 1, mode));
    lines.push(`${indent}</${name}>`);
  }
  return lines;
};

/** テキストノードの中身を整形用に正規化（空白のみなら null = 出力しない） */
const normalizeText = (raw: string | null): string[] => {
  if (!raw) return [];
  // 改行で区切られた複数行テキストは行ごとに出力する
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
};

// ---------------------------------------------------------------------------
// HTML → JSX
// ---------------------------------------------------------------------------

/** `-bd` のような bare クラス（boolean prop） */
const BARE_PROP_RE = /^-([a-zA-Z][a-zA-Z-]*)$/;

/** class 属性の 1 トークンの分類結果（元の並び順を保ったまま実体化するための中間表現） */
type ClassUnit =
  | { type: 'base'; key: string; value: string; token: string }
  | { type: 'bp'; key: string; bp: string; slot: number; token: string }
  | { type: 'bool'; key: string; token: string }
  | { type: 'hov'; value: string }
  | { type: 'util'; value: string }
  | { type: 'set'; value: string }
  | { type: 'rest'; token: string };

const htmlElementToJsx = (el: Element): PrintableElement => {
  const tag = el.tagName.toLowerCase();
  const classTokens = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

  // 1. コンポーネント名の決定
  let name = '';
  const headAttrs: string[] = []; // level / as
  const layoutIndex = classTokens.findIndex((t) => Object.hasOwn(LAYOUT_CLASS_TO_COMPONENT, t));
  const headingMatch = tag.match(/^h([1-6])$/);

  if (layoutIndex !== -1) {
    name = LAYOUT_CLASS_TO_COMPONENT[classTokens[layoutIndex]];
    classTokens.splice(layoutIndex, 1);
    if (tag !== 'div') headAttrs.push(attrToString('as', tag));
  } else if (headingMatch) {
    name = 'Heading';
    headAttrs.push(attrToString('level', headingMatch[1]));
  } else if (tag === 'p') {
    name = 'Text';
  }

  // 2. パス1: class トークンを分類し、style 属性を宣言リストへ分解する
  const units: ClassUnit[] = classTokens.map((token): ClassUnit => {
    const hovMatch = token.match(/^-hov:(.+)$/);
    if (hovMatch) return { type: 'hov', value: hovMatch[1] };
    const utilMatch = token.match(/^u--(.+)$/);
    if (utilMatch) return { type: 'util', value: utilMatch[1] };
    const setMatch = token.match(/^set--(.+)$/);
    if (setMatch) return { type: 'set', value: setMatch[1] };
    const parsed = parsePropToken(token);
    if (parsed) return { type: 'base', key: parsed[0], value: parsed[1], token };
    const bpMatch = token.match(BP_CLASS_RE);
    if (bpMatch && isBpProp(bpMatch[1])) {
      return { type: 'bp', key: bpMatch[1], bp: bpMatch[2], slot: BP_KEYS.indexOf(bpMatch[2]) + 1, token };
    }
    // bare クラス（-bd 等）は boolean prop へ（-hov は PROPS 外なので rest = className 保持）
    const bareMatch = token.match(BARE_PROP_RE);
    if (bareMatch && Object.hasOwn(PROPS, bareMatch[1])) {
      return { type: 'bool', key: bareMatch[1], token };
    }
    return { type: 'rest', token };
  });

  const styleRaw = el.getAttribute('style');
  // style がパース不能な要素は集約しない（class・style とも素通しで往復安定を保つ）
  const styleDecls = styleRaw === null ? [] : parseStyleDecls(styleRaw);

  // 3. パス2: BP クラスを持つ prop ごとに配列 prop への集約を試みる（往復ガード付き）
  const aggregated = new Map<string, BpAggregation>();
  const varAggregated = new Map<string, VarAggregation>();
  if (styleDecls !== null) {
    interface KeyEntry {
      base: { value: string; token: string } | null;
      baseCount: number;
      boolCount: number;
      bps: { bp: string; slot: number; token: string }[];
    }
    const byKey = new Map<string, KeyEntry>();
    for (const unit of units) {
      if (unit.type !== 'base' && unit.type !== 'bp' && unit.type !== 'bool') continue;
      let entry = byKey.get(unit.key);
      if (!entry) {
        entry = { base: null, baseCount: 0, boolCount: 0, bps: [] };
        byKey.set(unit.key, entry);
      }
      if (unit.type === 'base') {
        entry.baseCount += 1;
        entry.base ??= { value: unit.value, token: unit.token };
      } else if (unit.type === 'bool') {
        entry.boolCount += 1;
      } else {
        entry.bps.push({ bp: unit.bp, slot: unit.slot, token: unit.token });
      }
    }
    for (const [key, entry] of byKey) {
      // bare クラス（boolean prop）と BP クラスが同居する場合は集約しない
      // （集約すると同名の boolean prop と配列 prop が重複して不正な JSX になる）
      if (entry.bps.length === 0 || entry.baseCount > 1 || entry.boolCount > 0) continue;
      const result = tryAggregateBpProp(key, entry.base, entry.bps, styleDecls);
      if (result) aggregated.set(key, result);
    }
    // bare クラス単独（`-p` + `--p`）はスペース区切り値の prop へ戻す
    for (const [key, entry] of byKey) {
      if (entry.boolCount !== 1 || entry.bps.length > 0 || entry.baseCount > 0) continue;
      const result = tryAggregateVarProp(key, styleDecls);
      if (result) varAggregated.set(key, result);
    }
  }
  const consumedDeclNames = new Set([...aggregated.values(), ...varAggregated.values()].flatMap((a) => a.declNames));

  // 4. unit 列を元の並び順で属性へ実体化する。
  //    集約された prop はその prop の最初の出現位置に配列 prop として出す。
  //    -hov:{val} は hov prop（文字列形式）へ。複数トークンは空白結合し、
  //    最初のトークンの位置に hov 属性を出す（連続して書かれていれば往復で順序が保たれる）
  const propAttrs: string[] = [];
  const restClassTokens: string[] = [];
  const hovValues: string[] = [];
  let hovAttrIndex = -1;
  // u--{name} / set--{name} クラスは util / set prop（空白区切りで複数可）へ。
  // hov と同じく最初の出現位置に属性を出す
  const utilValues: string[] = [];
  let utilAttrIndex = -1;
  const setValues: string[] = [];
  let setAttrIndex = -1;
  const emittedAggregations = new Set<string>();
  for (const unit of units) {
    if (unit.type === 'hov') {
      if (hovValues.length === 0) hovAttrIndex = propAttrs.length;
      hovValues.push(unit.value);
      continue;
    }
    if (unit.type === 'util') {
      if (utilValues.length === 0) utilAttrIndex = propAttrs.length;
      utilValues.push(unit.value);
      continue;
    }
    if (unit.type === 'set') {
      if (setValues.length === 0) setAttrIndex = propAttrs.length;
      setValues.push(unit.value);
      continue;
    }
    if ((unit.type === 'base' || unit.type === 'bp') && aggregated.has(unit.key)) {
      if (!emittedAggregations.has(unit.key)) {
        emittedAggregations.add(unit.key);
        propAttrs.push(printJsxBpArrayAttr(unit.key, aggregated.get(unit.key)!.values));
      }
      continue;
    }
    if (unit.type === 'base') {
      propAttrs.push(attrToString(unit.key, unit.value));
      continue;
    }
    if (unit.type === 'bool') {
      // `--{prop}` を伴う bare クラスは値付き prop（`p="10 20"`）へ、それ以外は boolean prop（`bd` 等）
      const varAgg = varAggregated.get(unit.key);
      propAttrs.push(varAgg ? attrToString(unit.key, varAgg.value) : unit.key);
      continue;
    }
    // 集約されなかった BP クラス（変数なし等）とその他のクラスは className へ
    restClassTokens.push(unit.token);
  }
  // hov / util / set の挿入は出現位置の後ろ側から行う（先に前方へ挿入すると後方の index がズレるため）
  const pendingAttrs: { index: number; attr: string }[] = [];
  if (hovValues.length > 0) pendingAttrs.push({ index: hovAttrIndex, attr: attrToString('hov', hovValues.join(' ')) });
  if (utilValues.length > 0) pendingAttrs.push({ index: utilAttrIndex, attr: attrToString('util', utilValues.join(' ')) });
  if (setValues.length > 0) pendingAttrs.push({ index: setAttrIndex, attr: attrToString('set', setValues.join(' ')) });
  pendingAttrs.sort((a, b) => b.index - a.index);
  for (const pending of pendingAttrs) {
    propAttrs.splice(pending.index, 0, pending.attr);
  }

  // Lism prop クラスを持つがコンポーネントに割り当てられなかったタグは
  // span なら <Inline>（デフォルトタグ = span）、それ以外は <Lism as="tag">
  if (!name) {
    if (propAttrs.length > 0) {
      if (tag === 'span') {
        name = 'Inline';
      } else {
        name = 'Lism';
        if (tag !== 'div') headAttrs.push(attrToString('as', tag));
      }
    } else {
      name = tag;
    }
  }

  const attrs = [...headAttrs, ...propAttrs];
  if (restClassTokens.length > 0) {
    attrs.push(attrToString('className', restClassTokens.join(' ')));
  }
  // style: 集約で宣言を消費した場合は残余を正準形で出し、全消費なら省略。集約なしなら素通し
  if (styleRaw !== null) {
    if (consumedDeclNames.size > 0) {
      const leftover = (styleDecls ?? []).filter((d) => !consumedDeclNames.has(d.name));
      if (leftover.length > 0) attrs.push(attrToString('style', serializeStyleDecls(leftover)));
    } else {
      attrs.push(attrToString('style', styleRaw));
    }
  }
  // class / style 以外の属性はそのまま引き継ぐ（順序保持）
  for (const attr of [...el.attributes]) {
    if (attr.name === 'class' || attr.name === 'style') continue;
    attrs.push(attrToString(attr.name, attr.value));
  }

  return { name, attrs, children: htmlNodesToPrintable(el.childNodes), isVoid: VOID_TAGS.has(tag) };
};

const htmlNodesToPrintable = (nodes: NodeListOf<ChildNode>): PrintableNode[] => {
  const result: PrintableNode[] = [];
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const line of normalizeText(node.textContent)) {
        result.push({ kind: 'text', text: line });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      result.push({ kind: 'element', el: htmlElementToJsx(node as Element) });
    }
    // コメント等は無視
  }
  return result;
};

/** HTML文字列を Lism コンポーネント表記の JSX に変換する */
export function htmlToJsx(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  return printNodes(htmlNodesToPrintable(template.content.childNodes), 0, 'jsx').join('\n');
}

// ---------------------------------------------------------------------------
// JSX → HTML
// ---------------------------------------------------------------------------

/** 変換不能な構文を表す内部例外 */
class JsxConvertError extends Error {}

const jsxElementToHtml = (el: Element): PrintableElement => {
  const name = el.tagName; // XMLパースなので大文字小文字が保持される
  const isComponent = /^[A-Z]/.test(name);

  // 属性を順序付きで取り出す
  const attrs = [...el.attributes].map((a) => ({ name: a.name, value: a.value }));
  const takeAttr = (attrName: string): string | null => {
    const i = attrs.findIndex((a) => a.name === attrName);
    if (i === -1) return null;
    return attrs.splice(i, 1)[0].value;
  };

  // 1. タグ名の決定
  let tag = '';
  let layoutClass = '';
  if (isComponent) {
    if (Object.hasOwn(COMPONENT_TO_LAYOUT_CLASS, name)) {
      layoutClass = COMPONENT_TO_LAYOUT_CLASS[name];
      tag = takeAttr('as') ?? 'div';
    } else if (name === 'Heading') {
      const level = takeAttr('level') ?? '2';
      if (!/^[1-6]$/.test(level)) throw new JsxConvertError(`invalid heading level: ${level}`);
      tag = `h${level}`;
    } else if (name === 'Text') {
      tag = takeAttr('as') ?? 'p';
    } else if (name === 'Inline') {
      tag = takeAttr('as') ?? 'span';
    } else if (name === 'Lism') {
      tag = takeAttr('as') ?? 'div';
    } else {
      throw new JsxConvertError(`unknown component: ${name}`);
    }
  } else {
    tag = name;
  }
  // `as={[...]}` / `as` のように as がマーカー値になった場合はタグ名として不正
  if (tag.includes(BP_ARRAY_MARKER) || tag.includes(BOOL_MARKER)) {
    throw new JsxConvertError('invalid as value');
  }

  // 2. props → class トークン（+ 配列 prop は style 変数へ展開）
  const classTokens: string[] = layoutClass ? [layoutClass] : [];
  const restAttrs: string[] = [];
  let classNameTokens: string[] = [];
  const utilTokens: string[] = [];
  const setTokens: string[] = [];
  const bpStyleDecls: StyleDecl[] = [];
  let jsxStyleValue: string | null = null;
  for (const attr of attrs) {
    if (attr.value === BOOL_MARKER) {
      // preprocessJsxAttrs が書き換えた値なし属性（boolean prop）。
      // PROPS にある prop のみ bare クラスへ（本物の `val === true` → `-{prop}` と同じ規則）
      if (!Object.hasOwn(PROPS, attr.name)) {
        throw new JsxConvertError(`valueless attribute is not supported: ${attr.name}`);
      }
      classTokens.push(`-${attr.name}`);
    } else if (attr.value.startsWith(BP_ARRAY_MARKER)) {
      // preprocessJsxAttrs が書き換えた配列 prop（`p={[20, 40, 50]}`）。bp:1 の prop のみ対応
      // （className / style / hov / bp 非対応 prop への配列はここで変換不能になる）
      if (!isBpProp(attr.name)) throw new JsxConvertError(`responsive array is not supported for prop: ${attr.name}`);
      let parsed: unknown;
      try {
        parsed = JSON.parse(attr.value.slice(BP_ARRAY_MARKER.length));
      } catch {
        throw new JsxConvertError(`broken responsive array for prop: ${attr.name}`);
      }
      if (!Array.isArray(parsed) || !parsed.every((v) => v === null || typeof v === 'number' || typeof v === 'string')) {
        throw new JsxConvertError(`broken responsive array for prop: ${attr.name}`);
      }
      const expansion = expandBpProp(attr.name, parsed as BpSlotValue[]);
      classTokens.push(...expansion.classTokens);
      bpStyleDecls.push(...expansion.styleDecls);
    } else if (attr.name === 'className' || attr.name === 'class') {
      classNameTokens = classNameTokens.concat(attr.value.split(/\s+/).filter(Boolean));
    } else if (Object.hasOwn(PROPS, attr.name)) {
      // スペースを含む値はクラス名にできないため、本物と同じく `-{prop}` + `--{prop}` の組で出力する
      if (/\s/.test(attr.value)) {
        const expansion = expandVarProp(attr.name, attr.value);
        classTokens.push(...expansion.classTokens);
        bpStyleDecls.push(...expansion.styleDecls);
      } else {
        classTokens.push(`-${attr.name}:${attr.value}`);
      }
    } else if (attr.name === 'hov') {
      // 文字列形式の hov（空白区切り。カンマ互換）を -hov:{val} クラスへ展開（本物の splitValues と同じ分割規則）
      for (const value of attr.value.split(/[,\s]+/)) {
        if (!value) continue;
        classTokens.push(`-hov:${value}`);
      }
    } else if (attr.name === 'util') {
      // util prop（空白区切り。カンマ互換）を u--{name} クラスへ展開（本物の mergeSet と同じ分割規則）。
      // `-` prefix の除外指定は base の無い単発利用では意味を持たないため変換不能として扱う
      for (const value of attr.value.split(/[,\s]+/)) {
        if (!value) continue;
        if (value.startsWith('-')) throw new JsxConvertError(`unsupported util value: ${value}`);
        utilTokens.push(`u--${value}`);
      }
    } else if (attr.name === 'set') {
      // set prop を set--{name} クラスへ展開（util と同じ mergeSet の分割規則・除外指定も同様に非対応）
      for (const value of attr.value.split(/[,\s]+/)) {
        if (!value) continue;
        if (value.startsWith('-')) throw new JsxConvertError(`unsupported set value: ${value}`);
        setTokens.push(`set--${value}`);
      }
    } else if (attr.name === 'style') {
      jsxStyleValue = attr.value;
    } else {
      restAttrs.push(attrToString(attr.name, attr.value));
    }
  }
  // class の組み立ては本物（getLismProps の buildClassName）と同じ出力順に合わせる:
  // [className] [primitiveClass（レイアウト）] [setClasses] [uClasses] [propClasses...]。
  // この順序で書かれた HTML が正準形となり、往復で保たれる
  classTokens.splice(layoutClass ? 1 : 0, 0, ...setTokens, ...utilTokens);
  classTokens.unshift(...classNameTokens);

  const outAttrs: string[] = [];
  if (classTokens.length > 0) outAttrs.push(attrToString('class', classTokens.join(' ')));
  // style: 生成した BP 変数（prop の出現順 × sm→md→lg 順）を先頭に、JSX 側の style 宣言を後ろへ連結
  if (bpStyleDecls.length > 0) {
    let merged = bpStyleDecls;
    if (jsxStyleValue !== null) {
      const jsxDecls = parseStyleDecls(jsxStyleValue);
      // パース不能な style と配列 prop の共存は宣言をマージできないため変換不能
      if (jsxDecls === null) throw new JsxConvertError('unparsable style attribute with responsive array prop');
      merged = [...bpStyleDecls, ...jsxDecls];
    }
    outAttrs.push(attrToString('style', serializeStyleDecls(merged)));
  } else if (jsxStyleValue !== null) {
    outAttrs.push(attrToString('style', jsxStyleValue));
  }
  outAttrs.push(...restAttrs);

  return { name: tag, attrs: outAttrs, children: jsxNodesToPrintable(el.childNodes), isVoid: VOID_TAGS.has(tag) };
};

const jsxNodesToPrintable = (nodes: NodeListOf<ChildNode>): PrintableNode[] => {
  const result: PrintableNode[] = [];
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const line of normalizeText(node.textContent)) {
        result.push({ kind: 'text', text: line });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      result.push({ kind: 'element', el: jsxElementToHtml(node as Element) });
    }
  }
  return result;
};

/** 属性名・タグ名を構成できる文字（引用符・区切り記号以外） */
const isAttrNameChar = (ch: string): boolean => !/[\s"'=<>/{}]/.test(ch);
const isWs = (ch: string): boolean => /\s/.test(ch);

/**
 * XML パースの前処理: 開始タグ内の属性を走査し、XML で表現できない 2 形式だけを書き換える。
 * - `={[...]}`（配列 prop）→ `="<BP_ARRAY_MARKER + JSON>"`
 * - 値なし属性（`bd` 等の boolean prop）→ `="<BOOL_MARKER>"`
 * どちらにも当てはまらない構文（その他の `{}` 式・引用符なし値 等）は書き換えず
 * そのまま残す（→ XML パースエラー → null → last-good 維持）。
 */
const preprocessJsxAttrs = (source: string): string => {
  let out = '';
  let i = 0;
  const len = source.length;
  while (i < len) {
    const ch = source[i];
    if (ch !== '<') {
      out += ch;
      i += 1;
      continue;
    }
    // コメントは丸ごとコピー（内部を属性として扱わない）
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      if (end === -1) {
        out += source.slice(i);
        break;
      }
      out += source.slice(i, end + 3);
      i = end + 3;
      continue;
    }
    // 閉じタグ・宣言・処理命令は属性を持たないため '>' までコピー
    if (source[i + 1] === '/' || source[i + 1] === '!' || source[i + 1] === '?') {
      const end = source.indexOf('>', i);
      if (end === -1) {
        out += source.slice(i);
        break;
      }
      out += source.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    // 開始タグ: '<' + タグ名をコピーしてから属性を走査する
    out += ch;
    i += 1;
    while (i < len && isAttrNameChar(source[i])) {
      out += source[i];
      i += 1;
    }
    while (i < len) {
      while (i < len && isWs(source[i])) {
        out += source[i];
        i += 1;
      }
      if (i >= len) break;
      const c = source[i];
      if (c === '>') {
        out += c;
        i += 1;
        break;
      }
      if (!isAttrNameChar(c)) {
        // '/'（自己終了）や不正構文はそのままコピー（不正は後段の XML パースで弾かれる）
        out += c;
        i += 1;
        continue;
      }
      // 属性名
      let name = '';
      while (i < len && isAttrNameChar(source[i])) {
        name += source[i];
        i += 1;
      }
      // '=' までの空白（XML は `name = "value"` を許容する）
      let ws = '';
      while (i < len && isWs(source[i])) {
        ws += source[i];
        i += 1;
      }
      if (source[i] !== '=') {
        // 値なし属性 → boolean prop マーカー
        out += `${name}="${BOOL_MARKER}"${ws}`;
        continue;
      }
      out += name + ws + '=';
      i += 1;
      while (i < len && isWs(source[i])) {
        out += source[i];
        i += 1;
      }
      const v = source[i];
      if (v === '"' || v === "'") {
        // 引用値は閉じ引用符までコピー（内部の `<` `>` `={` を解釈しない）
        out += v;
        i += 1;
        while (i < len && source[i] !== v) {
          out += source[i];
          i += 1;
        }
        if (i < len) {
          out += source[i];
          i += 1;
        }
        continue;
      }
      if (v === '{') {
        const parsed = parseBpArrayExpr(source, i);
        if (parsed) {
          out += `"${escapeAttr(BP_ARRAY_MARKER + JSON.stringify(parsed[0]))}"`;
          i = parsed[1];
          continue;
        }
      }
      // 配列リテラルとして読めない `{}` 式・引用符なし値はそのまま次ループでコピーされる
    }
  }
  return out;
};

/**
 * JSX文字列を HTML に変換する。
 * パース不能・未知のコンポーネント等、変換できない場合は null（呼び出し側は last-good を維持）。
 */
export function jsxToHtml(jsx: string): string | null {
  // XMLとして厳密にパースする（不正なJSXはここで弾かれる）。複数ルート対応のためラップする。
  // 配列 prop（`p={[...]}`）だけは XML で表現できないため、パース可能な形へ前処理する
  const doc = new DOMParser().parseFromString(`<jsx-root>${preprocessJsxAttrs(jsx)}</jsx-root>`, 'text/xml');
  if (doc.querySelector('parsererror')) return null;

  try {
    return printNodes(jsxNodesToPrintable(doc.documentElement.childNodes), 0, 'html').join('\n');
  } catch (e) {
    if (e instanceof JsxConvertError) return null;
    throw e;
  }
}
