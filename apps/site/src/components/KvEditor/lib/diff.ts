// シナリオ再生のコード書き換えアニメで使う diff 計算。
// - diffLineHunks: 要素列の LCS で変更ハンクを列挙する。行配列なら行単位（<Flex>→<Stack> のように
//   開始タグと閉じタグが離れて変わっても、間の無変更行を巻き込まない）、トークン配列ならトークン単位
// - diffCode: 共通の先頭・末尾を除いた差分（数字の連なりは分断しない。理由は実装内）
// - diffTokenEdits: ハンク内を空白区切りトークンの LCS でさらに分割し、必要な箇所だけを順に書き換える編集列を返す

export interface CodeDiff {
  head: string;
  removed: string;
  inserted: string;
  tail: string;
}

/** 表示コードのUTF-16範囲。endは含まず、startとendが同じなら挿入・削除位置を示す。 */
export interface CodeRange {
  start: number;
  end: number;
}

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

const isDigit = (ch: string | undefined): boolean => ch !== undefined && ch >= '0' && ch <= '9';

/**
 * サロゲートペアを割らない位置まで index を戻す。
 * JS の文字列は UTF-16 単位なので、絵文字などの途中で切ると片割れ（U+FFFD 表示）になる
 */
export const charBoundary = (text: string, index: number): number =>
  index > 0 && index < text.length && isHighSurrogate(text.charCodeAt(index - 1)) && isLowSurrogate(text.charCodeAt(index)) ? index - 1 : index;

/** 共通のprefix/suffixを保持したまま差分部分だけを書き換えるためのdiff計算 */
export const diffCode = (from: string, to: string): CodeDiff => {
  let prefix = 0;
  const maxPrefix = Math.min(from.length, to.length);
  while (prefix < maxPrefix && from[prefix] === to[prefix]) prefix++;
  // 共通部分の末尾がサロゲートの片割れにならないよう手前へ戻す
  prefix = charBoundary(from, prefix);

  let suffix = 0;
  const maxSuffix = Math.min(from.length, to.length) - prefix;
  while (suffix < maxSuffix && from[from.length - 1 - suffix] === to[to.length - 1 - suffix]) suffix++;
  // 末尾側の切れ目が下位サロゲートから始まる場合は 1 つ縮めてペアを保つ
  if (suffix > 0 && isLowSurrogate(from.charCodeAt(from.length - suffix))) suffix--;

  // 数字の連なり（クラス値の数値など）は分断しない: `-fw:700` → `-fw:800` を「7 → 8」の
  // 1文字置換にするとアニメが一瞬で終わり何が起きたか読み取れないため、数値のどこかが
  // 変わる場合は連なり全体を削除 → 再タイプの対象へ広げる。数字に隣接するだけの編集
  //（変わる側の文字が数字でない）は広げない
  while (prefix > 0 && isDigit(from[prefix - 1]) && (isDigit(from[prefix]) || isDigit(to[prefix]))) prefix--;
  while (suffix > 0 && isDigit(from[from.length - suffix]) && (isDigit(from[from.length - suffix - 1]) || isDigit(to[to.length - suffix - 1])))
    suffix--;

  return {
    head: from.slice(0, prefix),
    removed: from.slice(prefix, from.length - suffix),
    inserted: to.slice(prefix, to.length - suffix),
    tail: from.slice(from.length - suffix),
  };
};

/** 変更のまとまり。fromLines[fromStart, fromEnd) を toLines[toStart, toEnd) に置き換える */
export interface LineHunk {
  fromStart: number;
  fromEnd: number;
  toStart: number;
  toEnd: number;
}

/** 文字列列のLCSで変更ハンクを列挙する（対象は高々数十要素なので O(m*n) で十分） */
export const diffLineHunks = (fromLines: string[], toLines: string[]): LineHunk[] => {
  const m = fromLines.length;
  const n = toLines.length;

  // dp[i][j] = fromLines[i:] と toLines[j:] のLCS長
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = fromLines[i] === toLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // LCSパスをたどり、一致行以外の連続区間を1ハンクにまとめる
  const hunks: LineHunk[] = [];
  let i = 0;
  let j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && fromLines[i] === toLines[j]) {
      i++;
      j++;
      continue;
    }
    const fromStart = i;
    const toStart = j;
    while (i < m || j < n) {
      if (i < m && j < n && fromLines[i] === toLines[j]) break;
      if (j >= n || (i < m && dp[i + 1][j] >= dp[i][j + 1])) i++;
      else j++;
    }
    hunks.push({ fromStart, fromEnd: i, toStart, toEnd: j });
  }
  return hunks;
};

/** 空白の連続も1トークンとして保持する分割（join('') で元の文字列に戻る） */
const tokenize = (text: string): string[] => text.split(/(\s+)/).filter((token) => token !== '');

/** トークン列を「(先行する区切り +) 単語」のユニット列へまとめる（join('') で元に戻る） */
const groupUnits = (tokens: string[]): string[] => {
  const units: string[] = [];
  let current = '';
  let hasWord = false;
  for (const token of tokens) {
    if (/^\s/.test(token) && hasWord) {
      units.push(current);
      current = token;
      hasWord = false;
    } else {
      current += token;
      hasWord ||= !/^\s/.test(token);
    }
  }
  if (current !== '') units.push(current);
  return units;
};

/**
 * ハンク内のユニットを左から1対1の組にし、余った側はまとめて1つの挿入 / 削除にする。
 * LCS はタイブレーク次第で「置換 + 隣接する削除 / 挿入」を1ハンクに併合することがあり
 * （シナリオの進行方向と巻き戻しで併合のされ方が逆になる）、そのままだと1つの大きな
 * 書き換えに見えてしまうため、ユニット単位の編集へ分け直して方向によらず同じ分割にする
 */
const pairHunkUnits = (fromUnits: string[], toUnits: string[]): [from: string, to: string][] => {
  const pairs: [string, string][] = [];
  const pairCount = Math.min(fromUnits.length, toUnits.length);
  for (let k = 0; k < pairCount; k++) pairs.push([fromUnits[k], toUnits[k]]);
  const fromRest = fromUnits.slice(pairCount).join('');
  const toRest = toUnits.slice(pairCount).join('');
  if (fromRest !== '' || toRest !== '') pairs.push([fromRest, toRest]);
  return pairs;
};

/**
 * ブロック内をトークン単位の編集列に分解する（「必要な箇所だけを順に書き換える」ためのdiff）。
 * 各編集はそれまでの編集を適用した後の全文に対する置換で、
 * head + removed + tail = 適用前 / head + inserted + tail = 適用後。
 * 変更トークンのまとまり（ハンク）をさらにユニットの組へ分け、組ごとに diffCode で
 * 共通の先頭・末尾を保持する（例: クラス値 `-g:15` → `-g:20` は `15` → `20` の置換になる）
 */
export const diffTokenEdits = (from: string, to: string): CodeDiff[] => {
  const fromTokens = tokenize(from);
  const toTokens = tokenize(to);
  const edits: CodeDiff[] = [];
  let head = ''; // 適用済み範囲（to 側の表記 + ハンク間の共通トークン）
  let fromIndex = 0;
  for (const hunk of diffLineHunks(fromTokens, toTokens)) {
    head += fromTokens.slice(fromIndex, hunk.fromStart).join('');
    const tailAfterHunk = fromTokens.slice(hunk.fromEnd).join('');
    const pieces = pairHunkUnits(groupUnits(fromTokens.slice(hunk.fromStart, hunk.fromEnd)), groupUnits(toTokens.slice(hunk.toStart, hunk.toEnd)));
    for (const [index, [fromPiece, toPiece]] of pieces.entries()) {
      const inner = diffCode(fromPiece, toPiece);
      if (inner.removed === '' && inner.inserted === '') {
        head += toPiece; // 差分のない組（ユニットが偶然一致）は編集を出さない
        continue;
      }
      // 同一ハンク内の未処理の組は from 側の表記のまま tail に残る
      const restFrom = pieces
        .slice(index + 1)
        .map(([fromRest]) => fromRest)
        .join('');
      edits.push({
        head: head + inner.head,
        removed: inner.removed,
        inserted: inner.inserted,
        tail: inner.tail + restFrom + tailAfterHunk,
      });
      head += toPiece;
    }
    fromIndex = hunk.fromEnd;
  }
  return edits;
};
