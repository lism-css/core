// コード書き換えアニメの共有エンジン。
// チャット型AIデモ（player.ts）とライブループ再生（loop.ts）の両方がこのモジュールを使う。
// - 全文置換ではなく、行単位の LCS（diffLineHunks）で変更ハンクを検出し、ハンク内も
//   トークン単位の編集列（diffTokenEdits）へ分解して「必要な箇所だけ」を順に書き換える
//   （例: `l--flex` → `l--stack` の行は flex→stack・-jc:center 削除・-g の値変更の3編集になり、
//   間の無変更クラスは巻き込まない）
// - フレーム反映は editor.setViewText()（表示のみ）。ヒーローへの反映はハンク確定ごとの
//   editor.commitView() と完了時の snapTo（editor.setCode）で行い、タイピング途中の
//   不完全なコード（クラスの書きかけ等）で崩れた瞬間がヒーローに描画されるのを防ぐ
import { htmlToJsx } from './convert';
import { charBoundary, diffTokenEdits, diffLineHunks, type CodeRange, type LineHunk } from './diff';
import type { EditorApi } from './editor';

// タイピング速度・ポーズ（ms）
const CODE_DELETE_INTERVAL = 48;
const CODE_INSERT_INTERVAL = 72;
const CODE_DELETE_CHUNK = 2;
const PAUSE_BETWEEN_EDITS = 350; // 離れた編集箇所（ハンク）へ移る間
const PAUSE_BETWEEN_MICRO_EDITS = 200; // ハンク内でカーソルを次の変更トークンへ移す間
const PAUSE_AFTER_REVEAL = 300; // 編集位置へのスクロールを見せてから書き換え始めるまでの間
const PAUSE_BEFORE_EDIT = 400;
const PAUSE_FLASH_TO_APPLY = 120; // 反映フラッシュの点灯からヒーロー反映までの間（「保存 → 結果が変わる」の因果を見せる）
const MAX_CODE_ANIM_MS = 12000; // 書き換えアニメの想定所要時間の上限。超える場合はステップ開始コードへ復元してから再生する

/** 再生の中断（AbortController の abort）を表す。想定内の脱出なので呼び出し側は握り潰してよい */
export class AbortedError extends Error {}

export const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new AbortedError());
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AbortedError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });

/** 変更ブロック（複数行の文字列）を前後の行に挟んで全文を組み立てる。空文字は行として出力しない */
const joinBlocks = (before: string[], middle: string, after: string[]): string =>
  [...before, ...(middle === '' ? [] : [middle]), ...after].join('\n');

export interface CodeAnimator {
  /** matchMedia の live な .matches を返す（再生中の設定変更にも追従する） */
  prefersReducedMotion(): boolean;
  /** HTMLモデルとアクティブタブの表示を同時に確定する（JSXタブの表記変換は setCode 側で行われる） */
  snapTo(html: string): void;
  /** リセット系のスナップでヒーローが縮み、エディターがビューポート外へ出た場合に上下中央へ戻す */
  ensureEditorVisible(): void;
  /**
   * 「現在のビュー → targetHtml」の diff タイピング。アクティブタブの表記で再生し、完了時に snapTo で確定する。
   * 想定所要時間が上限を超える場合は stepStartHtml へ即時復元してから再生する
   */
  animateCode(targetHtml: string, stepStartHtml: string, signal: AbortSignal): Promise<void>;
}

interface CodeAnimatorOptions {
  /**
   * reveal（編集位置の可視化）でページ側のスクロールを許可するか（既定: true）。
   * 自動ループ再生はユーザーのスクロール位置を奪わないよう false にする（textarea 内部のスクロールのみ行う）
   */
  scrollWindowOnReveal?: boolean;
  /** 長時間アニメの開始コード復元後（ensureEditorVisible）にページ側のスクロールを許可するか（既定: true）。理由は scrollWindowOnReveal と同じ */
  scrollWindowOnRestore?: boolean;
  /** 削除する文字範囲を編集前に示す。純追加は挿入位置を渡す。 */
  onBeforeEdit?: (range: CodeRange) => void;
  /** ヒーロー反映直前に、変更後の文字範囲を示す。純削除は削除位置を渡す。 */
  onApply?: (ranges: CodeRange[]) => void;
  onClearHighlights?: () => void;
}

export function createCodeAnimator(
  editor: EditorApi,
  { scrollWindowOnReveal = true, scrollWindowOnRestore = true, onBeforeEdit, onApply, onClearHighlights }: CodeAnimatorOptions = {}
): CodeAnimator {
  // MediaQueryList は 1 回だけ生成して使い回す（.matches は live なので再生中の設定変更にも追従する）
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = (): boolean => reducedMotionQuery.matches;

  const isJsxTab = (): boolean => editor.getActiveTab() === 'jsx';

  const editorRoot = editor.textarea.closest<HTMLElement>('[data-kv-editor]');

  const ensureEditorVisible = (): void => {
    if (!editorRoot) return;
    // ヒーローの再描画（snapTo → setCode → renderHero）は rAF スロットルされているため、
    // snapTo 直後に同期で測るとまだ縮む前のレイアウトになる。ここで rAF を予約すれば
    // 先に予約済みの renderHero と同じフレームのより後ろで実行され、
    // getBoundingClientRect() が再レイアウトを強制するので縮小後の位置を正しく測れる
    requestAnimationFrame(() => {
      const rect = editorRoot.getBoundingClientRect();
      if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
      editorRoot.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  };

  const snapTo = (html: string): void => {
    editor.setCode(html);
  };

  /**
   * 1ハンク分の書き換えアニメ。前後の行（before / after）は固定し、変更ブロック内を
   * トークン単位の編集列（diffTokenEdits）に分けて「必要な箇所だけ」を左から順に書き換える
   */
  const animateHunk = async (before: string[], after: string[], fromBlock: string, toBlock: string, signal: AbortSignal): Promise<CodeRange[]> => {
    const edits = diffTokenEdits(fromBlock, toBlock);
    if (edits.length === 0) return [];
    const frame = (middle: string): void => editor.setViewText(joinBlocks(before, middle, after));
    const blockOffset = before.reduce((offset, line) => offset + line.length + 1, 0);

    for (const [index, { head, removed, inserted, tail }] of edits.entries()) {
      if (signal.aborted) throw new AbortedError();
      if (index > 0) await sleep(PAUSE_BETWEEN_MICRO_EDITS, signal);
      // 同じ長い行に離れた変更があっても、各編集位置を見せる。
      const headLines = head.split('\n');
      const scrolled = editor.revealPosition(before.length + headLines.length - 1, headLines[headLines.length - 1], scrollWindowOnReveal);
      if (scrolled) await sleep(PAUSE_AFTER_REVEAL, signal);
      if (onBeforeEdit) {
        const start = blockOffset + head.length;
        const codeLength = editor.getViewText().length;
        onBeforeEdit({ start: Math.min(codeLength, start), end: Math.min(codeLength, start + removed.length) });
        await sleep(PAUSE_BEFORE_EDIT, signal);
        onClearHighlights?.();
      }
      // 削除フェーズ（後ろから消す）。切る位置はサロゲートペアを割らない境界へ丸める
      for (let len = removed.length - CODE_DELETE_CHUNK; len > 0; len -= CODE_DELETE_CHUNK) {
        frame(head + removed.slice(0, charBoundary(removed, len)) + tail);
        await sleep(CODE_DELETE_INTERVAL, signal);
      }
      if (removed.length > 0) {
        frame(head + tail);
        await sleep(CODE_DELETE_INTERVAL, signal);
      }
      for (let len = 1; len <= inserted.length; len++) {
        frame(head + inserted.slice(0, charBoundary(inserted, len)) + tail);
        await sleep(CODE_INSERT_INTERVAL, signal);
      }
    }
    const codeLength = joinBlocks(before, toBlock, after).length;
    return edits.map(({ head, inserted }) => ({
      start: Math.min(codeLength, blockOffset + head.length),
      end: Math.min(codeLength, blockOffset + head.length + inserted.length),
    }));
  };

  /** ハンク列の書き換えアニメの想定所要時間（ms）。reveal 待ち等の細かいポーズは含めない（目的は桁の判定） */
  const estimateCodeAnimMs = (fromLines: string[], toLines: string[], hunks: LineHunk[]): number => {
    let total = Math.max(0, hunks.length - 1) * PAUSE_BETWEEN_EDITS;
    for (const hunk of hunks) {
      const fromBlock = fromLines.slice(hunk.fromStart, hunk.fromEnd).join('\n');
      const toBlock = toLines.slice(hunk.toStart, hunk.toEnd).join('\n');
      const edits = diffTokenEdits(fromBlock, toBlock);
      total += Math.max(0, edits.length - 1) * PAUSE_BETWEEN_MICRO_EDITS;
      if (onBeforeEdit) total += edits.length * PAUSE_BEFORE_EDIT;
      for (const { removed, inserted } of edits) {
        total += Math.ceil(removed.length / CODE_DELETE_CHUNK) * CODE_DELETE_INTERVAL + inserted.length * CODE_INSERT_INTERVAL;
      }
    }
    return total;
  };

  const animateCodeImpl = async (targetHtml: string, stepStartHtml: string, signal: AbortSignal): Promise<void> => {
    // タイピングはアクティブタブの表記で行い、完了時に snapTo でHTMLモデルを確定する
    // （JSXタブではタイピング途中が不正なJSXになるため、フレーム反映は setViewText = 表示のみ）
    const target = isJsxTab() ? htmlToJsx(targetHtml) : targetHtml;
    const from = editor.getViewText();

    // 変化なし・reduced-motion は即時確定のみ（反映フラッシュ演出も出さない）
    if (from === target || prefersReducedMotion()) {
      onClearHighlights?.();
      snapTo(targetHtml);
      return;
    }

    let fromLines = from.split('\n');
    const toLines = target.split('\n');
    let hunks = diffLineHunks(fromLines, toLines);

    // 想定所要時間が上限を超える場合（上限いっぱいの貼り付け・空にしてからの Resume 等）は、
    // ステップ開始コードへ即時復元してから再生する。復元後の diff は
    // シナリオが意図した小さな編集そのものになり、チャット文言とコードの動きが一致する
    if (estimateCodeAnimMs(fromLines, toLines, hunks) > MAX_CODE_ANIM_MS) {
      snapTo(stepStartHtml);
      if (scrollWindowOnRestore) ensureEditorVisible();
      const restored = editor.getViewText();
      // ステップ開始コードと目標が同一（異常系）なら即時確定で終える
      if (restored === target) {
        snapTo(targetHtml);
        return;
      }
      fromLines = restored.split('\n');
      hunks = diffLineHunks(fromLines, toLines);
    }

    let lines = fromLines;
    let lineShift = 0; // 適用済みハンクによる行番号のズレ
    let pendingRanges: CodeRange[] = [];
    for (const [index, hunk] of hunks.entries()) {
      if (index > 0) await sleep(PAUSE_BETWEEN_EDITS, signal);
      const start = hunk.fromStart + lineShift;
      const end = hunk.fromEnd + lineShift;
      const before = lines.slice(0, start);
      const after = lines.slice(end);
      const toBlock = toLines.slice(hunk.toStart, hunk.toEnd);
      const appliedRanges = await animateHunk(before, after, lines.slice(start, end).join('\n'), toBlock.join('\n'), signal);
      if (signal.aborted) throw new AbortedError();
      pendingRanges.push(...appliedRanges);
      lines = [...before, ...toBlock, ...after];
      lineShift += hunk.toEnd - hunk.toStart - (hunk.fromEnd - hunk.fromStart);
      // ハンク完了 = 1つの編集の確定。ここでヒーローへ反映する。
      // JSXタブでは閉じタグ側のハンクが未適用など変換できない途中状態がありうるため、反映できる時だけ行う。
      // 演出があるときは書き換えた行のフラッシュを先に点灯し、ひと呼吸置いてから反映する
      //（反映されないのに光ると嘘になるため、可否は canCommitView で先に判定する）
      if (editor.canCommitView()) {
        if (onApply) {
          // JSXの開閉タグなど、先のハンクで反映できなかった変更もまとめて示す。
          onApply(pendingRanges);
          await sleep(PAUSE_FLASH_TO_APPLY, signal);
        }
        editor.commitView();
        pendingRanges = [];
      }
    }
    // JSXタブで全ハンクが変換不能だった稀なケースも、ここでの確定で必ず反映される（演出なしを許容）
    snapTo(targetHtml);
  };

  const animateCode = async (targetHtml: string, stepStartHtml: string, signal: AbortSignal): Promise<void> => {
    if (signal.aborted) throw new AbortedError();
    // 中断した再生の後処理が、直後に始まった再生のハイライトを消さないよう同期で解除する。
    const clearOnAbort = (): void => onClearHighlights?.();
    signal.addEventListener('abort', clearOnAbort, { once: true });
    try {
      await animateCodeImpl(targetHtml, stepStartHtml, signal);
    } catch (error) {
      if (!signal.aborted) onClearHighlights?.();
      throw error;
    } finally {
      signal.removeEventListener('abort', clearOnAbort);
    }
  };

  return { prefersReducedMotion, snapTo, ensureEditorVisible, animateCode };
}
