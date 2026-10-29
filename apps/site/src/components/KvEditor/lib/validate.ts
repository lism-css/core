// エディター入力の保護。
// - MAX_CODE_LENGTH: 毎キー入力で走るハイライト・変換・ヒーロー描画の負荷上限（クラッシュ防止）
// - findHtmlIssue: スタック式の軽量タグバランスチェック。
//   ブラウザの HTML パーサーは寛容で「不正」を返さないため、閉じ漏れ等の
//   よくあるミスだけを自前で検知してスナックバー表示に使う（描画は止めない）。
//   WHATWG の省略可能な終了タグ（<p>a<p>b 等の暗黙クローズ）は valid として扱う。

/** エディターの最大入力文字数 */
export const MAX_CODE_LENGTH = 2_000;

/** 終了タグを持たない void 要素（convert.ts の自己閉じ出力と定義を共有する） */
export const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'source', 'track', 'wbr']);

// 中身をタグとして解釈しない raw text 要素（<textarea> 内の a < b 等を誤検知しないよう閉じタグまでスキップする）
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title']);

// WHATWG の省略可能な終了タグ（optional end tags）のうち「次の開始タグで暗黙に閉じる」ルール:
// スタックトップの要素が開いたままでも、IMPLIED_BY_START.get(トップ) に含まれる開始タグが
// 来たら暗黙で閉じられたと見なす（<p>a<p>b / <li>a<li>b 等をブラウザと同様に valid とする）。
// キーの参照はユーザー入力のタグ名なので、プロトタイプ汚染を避けるため Record ではなく Map を使う
const IMPLIED_BY_START = new Map<string, ReadonlySet<string>>([
  // prettier-ignore
  ['p', new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'])],
  ['li', new Set(['li'])],
  ['dt', new Set(['dt', 'dd'])],
  ['dd', new Set(['dt', 'dd'])],
  ['option', new Set(['option', 'optgroup'])],
  ['optgroup', new Set(['optgroup'])],
  ['tr', new Set(['tr'])],
  ['td', new Set(['td', 'th', 'tr'])],
  ['th', new Set(['td', 'th', 'tr'])],
  ['thead', new Set(['tbody', 'tfoot'])],
  ['tbody', new Set(['tbody', 'tfoot'])],
  ['rt', new Set(['rt', 'rp'])],
  ['rp', new Set(['rt', 'rp'])],
]);

// 親要素の終了タグ・入力末尾に到達したとき、終了タグを省略したまま暗黙で閉じてよい要素
// （<div><p>a</div> や、<p>hello で終わる入力を valid とする）
// prettier-ignore
const OMITTABLE_AT_END = new Set(['p', 'li', 'dt', 'dd', 'option', 'optgroup', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup', 'rt', 'rp']);

/**
 * タグの終わり `>` の位置と、自己終了スラッシュの有無を返す（見つからなければ end: -1）。
 * 属性値の内側と外側を区別することで、値に含まれる文字を区切りと誤認しない:
 * - `<a href=https://example.com/>` … 末尾の `/` は引用符なし値の一部（自己終了ではない）
 * - `<div title=it's>` … 引用符なし値の中の `'` は引用符の開始ではない
 */
const scanTag = (code: string, from: number): { end: number; selfClosing: boolean } => {
  let quote = ''; // 引用符付き値の中なら、その引用符
  let inUnquoted = false; // 引用符なし値の中か
  let afterEquals = false; // `=` を読んだ直後（値の開始待ち）
  let selfClosing = false;
  for (let i = from; i < code.length; i++) {
    const ch = code[i];
    if (quote) {
      if (ch === quote) quote = '';
      continue;
    }
    if (inUnquoted) {
      // 引用符なし値は空白で終わる（`>` は値の途中でもタグを閉じる）
      if (ch === '>') return { end: i, selfClosing: false };
      if (/\s/.test(ch)) inUnquoted = false;
      continue;
    }
    if (ch === '>') return { end: i, selfClosing };
    if (afterEquals && !/\s/.test(ch)) {
      afterEquals = false;
      if (ch === '"' || ch === "'") quote = ch;
      else inUnquoted = true;
      continue;
    }
    if (ch === '=') afterEquals = true;
    // 直前の文字が `/` のまま `>` に到達したときだけ自己終了とみなす
    selfClosing = ch === '/';
  }
  return { end: -1, selfClosing: false };
};

/**
 * HTMLのタグ対応をチェックし、問題があれば診断用メッセージを、なければ null を返す。
 * 検知対象: 書きかけのタグ / 閉じ漏れ / 対応しない閉じタグ / 未終了コメント
 * 戻り値の文言は内部用の短い英語（表示側は一律 'Invalid HTML syntax' を使う）
 */
export function findHtmlIssue(code: string): string | null {
  const stack: string[] = [];
  let i = 0;

  while (i < code.length) {
    const lt = code.indexOf('<', i);
    if (lt === -1) break;

    if (code.startsWith('<!--', lt)) {
      const end = code.indexOf('-->', lt + 4);
      if (end === -1) return 'unterminated comment';
      i = end + 3;
      continue;
    }

    const next = code[lt + 1] ?? '';
    // `a < b` のような地の文の `<` はタグとして扱わない（ブラウザと同じ扱い）
    if (!/[a-zA-Z/!]/.test(next)) {
      i = lt + 1;
      continue;
    }

    const { end: gt, selfClosing } = scanTag(code, lt + 1);
    if (gt === -1) return 'incomplete tag';

    const raw = code.slice(lt + 1, gt);
    i = gt + 1;

    // doctype 等はスキップ
    if (raw.startsWith('!')) continue;

    const isClose = raw.startsWith('/');
    const nameMatch = (isClose ? raw.slice(1) : raw).match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
    if (!nameMatch) return 'malformed tag';
    const tag = nameMatch[1].toLowerCase();

    if (isClose) {
      if (!stack.includes(tag)) return `stray closing </${tag}>`;
      // 対応する開始タグまでの間にある、終了タグを省略できる要素は暗黙で閉じる（<div><p>a</div> 等）
      while (stack[stack.length - 1] !== tag) {
        if (!OMITTABLE_AT_END.has(stack[stack.length - 1])) return `unclosed <${stack[stack.length - 1]}>`;
        stack.pop();
      }
      stack.pop();
      continue;
    }

    // 開始タグ: 開いたままの要素がこのタグで暗黙に閉じるなら閉じる（<p>a<p>b / <table><tr><td>a<tr> 等は連鎖）。
    // <hr> 等の void 要素も <p> を閉じるため、push の要否より先に評価する
    while (stack.length > 0 && IMPLIED_BY_START.get(stack[stack.length - 1])?.has(tag)) {
      stack.pop();
    }
    if (VOID_TAGS.has(tag)) continue;
    // 自己終了スラッシュが効くのは SVG / MathML（外来コンテンツ）だけ。
    // HTML 要素の `<div/>` はブラウザと同じく開始タグとして扱う（`<div/>x</div>` を不正としない）
    if (selfClosing && (tag === 'svg' || tag === 'math' || stack.includes('svg') || stack.includes('math'))) continue;
    if (RAW_TEXT_TAGS.has(tag)) {
      // raw text 要素の中身はタグとして解釈せず、対応する閉じタグまでスキップする
      const close = new RegExp(`</${tag}\\b`, 'i').exec(code.slice(i));
      if (!close) return `unclosed <${tag}>`;
      const closeGt = code.indexOf('>', i + close.index);
      if (closeGt === -1) return 'incomplete tag';
      i = closeGt + 1;
      continue;
    }
    stack.push(tag);
  }

  // 終了タグを省略できる要素（p, li 等）は入力末尾まで開いたままでも valid
  const unclosed = stack.filter((tag) => !OMITTABLE_AT_END.has(tag));
  if (unclosed.length > 0) return `unclosed <${unclosed[unclosed.length - 1]}>`;
  return null;
}
