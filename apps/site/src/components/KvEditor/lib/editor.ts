// KVエディターデモのコントローラ。
// - HTML文字列を唯一のモデルとし、エディター編集 → ヒーロー描画をライブ同期する
// - HTML / JSX タブは同一モデルの2つのビュー（双方向変換）
// - shiki は遅延ロードし、読み込み前はプレーンテキストにフォールバック
// - スクロールは textarea だけが行い、ハイライトレイヤーは transform で 1:1 追従する
//   （scrollTop の同期はクランプや innerHTML 差し替え時のリセットでズレるため使わない）
import { getRootLang, isValidLang } from '@/lib/i18n';
import { INITIAL_HTML_BY_LANG, type DemoLang } from '../initial-code';
import { SCENARIO_BY_LANG } from '../scenario';
import { escapeText, htmlToJsx, jsxToHtml } from './convert';
import { sanitize } from './sanitize';
import { MAX_CODE_LENGTH, findHtmlIssue } from './validate';
import { createSnackbar } from './snackbar';
import { STRINGS } from './strings';
import { measureTextWithTabs, splitCodeRanges } from './code-highlights';
import type { CodeRange } from './diff';
import type { EditorLang, highlightSync as HighlightSyncFn } from './highlight';
import { createLoopPlayer } from './loop';
import { createPlayer } from './player';

// 構文チェックはタイピングが止まってから評価する（タグの書きかけを即エラー扱いしないため）
const SYNTAX_CHECK_DEBOUNCE_MS = 800;

// 末尾が改行だと pre 側で最終行が潰れて textarea とズレるため、空白でパディングする
const padTrailingNewline = (code: string): string => (code.endsWith('\n') ? `${code} ` : code);

/** プレイヤーから操作するためのエディターAPI */
export interface EditorApi {
  /** コード全文を置き換える（ヒーロー・ハイライトも更新）。JSXタブ表示中は htmlToJsx で変換した表記を表示する */
  setCode(code: string): void;
  getCode(): string;
  getActiveTab(): EditorLang;
  /**
   * タブをプログラム的に切り替える（表示テキスト・aria 状態も更新される）。
   * タブボタンの click は発火しないため、ループ再生の自動切替が
   * 手動切替のリスナー（loop.ts の中断 → 再開）を巻き込まずに使える
   */
  switchTab(tab: EditorLang): void;
  /** アクティブタブに表示中の生テキスト */
  getViewText(): string;
  /** タイピングアニメの1フレームを反映する（表示のみ。ヒーロー反映は commitView / setCode で行う） */
  setViewText(text: string): void;
  /**
   * 現在の表示テキストをヒーローへ反映する（ハンク確定時にアニメーターが呼ぶ）。
   * JSXタブで変換できない途中状態（閉じタグ側のハンクが未適用等）では何もしない
   */
  commitView(): void;
  /** commitView で反映できる状態か。反映範囲を反映より先に点灯させるための事前判定 */
  canCommitView(): boolean;
  /** 編集前または反映済みの文字範囲を表示する。 */
  highlightRanges(ranges: readonly CodeRange[], phase: 'before' | 'applied'): void;
  clearHighlights(): void;
  /**
   * 編集位置（行番号と行内の先行テキスト）を可視範囲へスクロールする。スクロールが発生したら true。
   * scrollWindow: false で textarea 内部のみスクロールし、ページ側は動かさない
   */
  revealPosition(line: number, linePrefix: string, scrollWindow?: boolean): boolean;
  /** 保留中の構文チェック（デバウンス評価）と表示中の通知を破棄する */
  resetSyntaxCheck(): void;
  /** 初期コードから変わっているかを評価し、リセット提案を出し入れする */
  syncRestorePrompt(): void;
  textarea: HTMLTextAreaElement;
  tabButtons: HTMLButtonElement[];
}

export function initKvEditor(): void {
  const hero = document.querySelector<HTMLElement>('[data-kv-hero]');
  const demo = document.querySelector<HTMLElement>('[data-kv-editor]');
  const textarea = demo?.querySelector<HTMLTextAreaElement>('[data-kv-input]') ?? null;
  const preInner = demo?.querySelector<HTMLElement>('[data-kv-pre-inner]') ?? null;
  if (!hero || !demo || !textarea || !preInner) return;
  const highlights = demo.querySelector<HTMLElement>('[data-kv-highlights]');

  // SSR側（KvEditor.astro）が決めた言語を DOM 経由で受け取る（このスクリプトは全ページ共通バンドル）。
  // siteConfig.langs を情報源とする isValidLang で判定するため、言語追加時にここの修正は不要
  const langAttr = demo.dataset.kvLang ?? '';
  const lang: DemoLang = isValidLang(langAttr) ? langAttr : getRootLang();
  const initialHtml = INITIAL_HTML_BY_LANG[lang];

  // ---- ヒーローの高さ保持（レイアウトシフト防止） --------------------------
  // エディター内容を全削除してもヒーローが潰れず、下のエディターがジャンプしないよう
  // 自然高さを min-height として固定する。高さは em ベースで幅（ブレークポイント）に依存するため、
  // 幅が変わった時だけ再測定する（入力による高さ変化は幅が変わらないので無視される）
  const lockHeroHeight = (): void => {
    // エディターが空でヒーローに要素がない間は再測定しない（フォールバックの 2rem まで縮んで
    // 高さ保持の意図が崩れるため、直前の min-height を維持する）。初期呼び出し時は SSR コンテンツがあるので必ず測定される
    if (hero.childElementCount === 0) return;
    hero.style.minHeight = '';
    hero.style.minHeight = `${hero.offsetHeight}px`;
  };
  lockHeroHeight();
  // Webフォント読み込みで初期測定がズレることがあるため、読み込み完了後に再測定する
  document.fonts.ready.then(lockHeroHeight).catch(() => {});
  let lastHeroWidth = hero.offsetWidth;
  new ResizeObserver(() => {
    if (hero.offsetWidth === lastHeroWidth) return;
    lastHeroWidth = hero.offsetWidth;
    lockHeroHeight();
  }).observe(hero);

  const snackbarEl = demo.querySelector<HTMLElement>('[data-kv-snackbar]');
  const snackbar = snackbarEl ? createSnackbar(snackbarEl) : null;

  const tabButtons = [...demo.querySelectorAll<HTMLButtonElement>('[data-kv-tab]')];
  const htmlTabButton = tabButtons.find((b) => b.dataset.kvTab === 'html') ?? null;
  const jsxTabButton = tabButtons.find((b) => b.dataset.kvTab === 'jsx') ?? null;
  const tabPanel = demo.querySelector<HTMLElement>('#kv-editor-panel');

  // ---- 状態 --------------------------------------------------------------
  const state = {
    html: initialHtml, // 唯一のモデル（常にHTML表記）
    activeTab: 'html' as EditorLang,
    // 各タブの生テキスト（ユーザーの整形を保持する）。stale = モデルから再生成が必要
    tabText: { html: initialHtml, jsx: '' },
    stale: { html: false, jsx: true },
  };

  // ---- ヒーロー描画（rAFスロットル） --------------------------------------
  let heroRenderQueued = false;
  const renderHero = (): void => {
    if (heroRenderQueued) return;
    heroRenderQueued = true;
    requestAnimationFrame(() => {
      heroRenderQueued = false;
      hero.innerHTML = sanitize(state.html);
    });
  };

  // ---- スクロール追従（textarea → ハイライトレイヤー） ----------------------
  // textarea は iOS の自動ズーム回避のため font-size: 16px を scale で縮小している（_kv-editor.scss 参照）。
  // scrollTop / scrollLeft は変形前のローカル座標で返るため、
  // computed transform から縮小率を読み取り、視覚上の移動量へ換算して追従させる。
  // 縮小率（--kvEditor-input-scale）は md ブレークポイントでしか変わらないため、
  // 毎スクロールで computed style を読まずにキャッシュし、境界を跨いだ時だけ再取得する
  let inputScale = 1;
  let rerenderHighlights = (): void => {};
  const syncScroll = (): void => {
    const transform = `translate3d(${-textarea.scrollLeft * inputScale}px, ${-textarea.scrollTop * inputScale}px, 0)`;
    preInner.style.transform = transform;
    if (highlights) highlights.style.transform = transform;
  };
  const updateInputScale = (): void => {
    const transform = getComputedStyle(textarea).transform;
    inputScale = transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
    syncScroll();
    rerenderHighlights();
  };
  updateInputScale();
  window.matchMedia('(min-width: 800px)').addEventListener('change', updateInputScale);
  textarea.addEventListener('scroll', syncScroll, { passive: true });

  // ---- 再生アニメの編集位置を可視範囲へスクロール ---------------------------
  // モバイルでは書き換え箇所がスクロール範囲外にあり演出が見えないことがあるため、
  // プレイヤーがハンクの書き換え前に呼ぶ。scrollTop/Left・clientWidth/Height・
  // フォント計測はすべて scale 変形前のローカル座標系で一貫しているのでそのまま計算できる

  // MediaQueryList は 1 回だけ生成して使い回す（.matches は live なので設定変更にも追従する）
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let measureCtx: CanvasRenderingContext2D | null = null;
  const measureTextWidth = (text: string): number => {
    if (text === '') return 0;
    measureCtx ??= document.createElement('canvas').getContext('2d');
    if (!measureCtx) return 0;
    const cs = getComputedStyle(textarea);
    // 等幅前提にせず実測する（行の先行部分に日本語等が混ざっても正確な x を得るため）
    measureCtx.font = `${cs.fontSize} ${cs.fontFamily}`;
    return measureTextWithTabs(text, (plainText) => measureCtx?.measureText(plainText).width ?? 0);
  };

  const revealPosition = (line: number, linePrefix: string, scrollWindow = true): boolean => {
    const cs = getComputedStyle(textarea);
    const lineHeight = parseFloat(cs.lineHeight);
    const x = parseFloat(cs.paddingLeft) + measureTextWidth(linePrefix);
    const y = parseFloat(cs.paddingTop) + line * lineHeight;
    const behavior: ScrollBehavior = reducedMotionQuery.matches ? 'auto' : 'smooth';

    // 先頭でも編集位置とその先の余白が見えるなら、縦横それぞれ先頭へ戻す。
    let top = textarea.scrollTop;
    const vMargin = lineHeight * 2;
    if (y + lineHeight <= textarea.clientHeight - vMargin) {
      top = 0;
    } else if (y < top + vMargin || y + lineHeight > top + textarea.clientHeight - vMargin) {
      top = Math.max(0, y - textarea.clientHeight / 3);
    }
    // 横: 編集は開始位置から右へ伸びていくため、開始位置が幅の 60% より右
    //（= 編集の続きを見せる余白が足りない）なら、左 1/4 の位置に来るようスクロールする
    let left = textarea.scrollLeft;
    if (x <= textarea.clientWidth * 0.6) {
      left = 0;
    } else if (x < left + 24 || x > left + textarea.clientWidth * 0.6) {
      left = Math.max(0, x - textarea.clientWidth / 4);
    }

    let scrolled = false;
    if (top !== textarea.scrollTop || left !== textarea.scrollLeft) {
      textarea.scrollTo({ top, left, behavior });
      scrolled = true;
    }

    // ページ側のスクロール（ai モードの SP では、エディター下のパネルを見ている間に
    // 編集行がビューポート外へ出うるため window 側も追従させる）。
    // 編集行の視覚位置 = textarea の画面上の位置 + （内部スクロール適用後の行オフセット × scale）
    if (scrollWindow) {
      const rect = textarea.getBoundingClientRect();
      const scale = rect.width / textarea.offsetWidth;
      const visualY = rect.top + (y - top) * scale;
      const visualLineH = lineHeight * scale;
      if (visualY < 0 || visualY + visualLineH > window.innerHeight) {
        window.scrollBy({ top: visualY - window.innerHeight * 0.35, behavior });
        scrolled = true;
      }
    }
    return scrolled;
  };

  // ---- 編集範囲のハイライト ------------------------------------------------
  let highlightState: { ranges: CodeRange[]; phase: 'before' | 'applied' } | null = null;

  const clearHighlights = (): void => {
    highlightState = null;
    highlights?.removeAttribute('data-kv-highlight-phase');
    highlights?.replaceChildren();
  };

  const renderCodeHighlights = (): void => {
    if (!highlights || !highlightState) return;
    const cs = getComputedStyle(textarea);
    const lineHeight = parseFloat(cs.lineHeight);
    const paddingTop = parseFloat(cs.paddingTop);
    const paddingLeft = parseFloat(cs.paddingLeft);
    const fragment = document.createDocumentFragment();
    for (const segment of splitCodeRanges(textarea.value, highlightState.ranges)) {
      const linePrefix = textarea.value.slice(segment.lineStart, segment.start);
      const throughRange = textarea.value.slice(segment.lineStart, segment.end);
      const startX = measureTextWidth(linePrefix);
      const endX = measureTextWidth(throughRange);
      // 測った文字範囲を外側で固定し、内側のinsetはCSSで調整できるようにする。
      const rect = document.createElement('span');
      rect.className = 'c--kvEditor_highlightRect';
      rect.style.left = `${(paddingLeft + startX) * inputScale}px`;
      rect.style.top = `${(paddingTop + segment.line * lineHeight) * inputScale}px`;
      rect.style.width = `${segment.marker ? 2 : Math.max(2, (endX - startX) * inputScale)}px`;
      rect.style.height = `${lineHeight * inputScale}px`;
      const highlight = document.createElement('span');
      highlight.className = 'c--kvEditor_highlight';
      rect.append(highlight);
      fragment.append(rect);
    }
    highlights.replaceChildren(fragment);
  };

  rerenderHighlights = renderCodeHighlights;
  new ResizeObserver(renderCodeHighlights).observe(textarea);
  document.fonts.ready.then(renderCodeHighlights).catch(() => {});
  reducedMotionQuery.addEventListener('change', (event) => {
    if (event.matches) clearHighlights();
  });

  const highlightRanges = (ranges: readonly CodeRange[], phase: 'before' | 'applied'): void => {
    clearHighlights();
    if (!highlights || ranges.length === 0 || reducedMotionQuery.matches) return;
    highlightState = { ranges: ranges.map(({ start, end }) => ({ start, end })), phase };
    renderCodeHighlights();
    if (phase === 'applied') void highlights.offsetWidth;
    highlights.setAttribute('data-kv-highlight-phase', phase);
  };
  highlights?.addEventListener('animationend', (event) => {
    if (event.target === highlights && highlightState?.phase === 'applied') clearHighlights();
  });

  // ---- シンタックスハイライト（遅延ロード、初期化後は同期実行） --------------
  let highlightSyncFn: typeof HighlightSyncFn | null = null;

  // ユーザー入力に対しては同期で描画する。textarea は color: transparent で、
  // 見えている文字はこのオーバーレイそのものなので、1 フレームでも遅らせると
  // caret だけが先に進んだ状態が見えてしまう
  const renderHighlight = (): void => {
    const code = padTrailingNewline(textarea.value);
    const out = highlightSyncFn?.(code, state.activeTab) ?? null;
    preInner.innerHTML = out ?? `<span class="fallback">${escapeText(code)}</span>`;
    // innerHTML 差し替え後もスクロール位置を必ず一致させる
    syncScroll();
    rerenderHighlights();
  };

  // 再生アニメのフレームが短い間隔で続くため、1フレームに複数回走らないようまとめる。
  // こちらは caret が動かない（プログラム的な書き換え）ので、遅らせても見え方は変わらない
  let highlightRenderQueued = false;
  const queueHighlight = (): void => {
    if (highlightRenderQueued) return;
    highlightRenderQueued = true;
    requestAnimationFrame(() => {
      highlightRenderQueued = false;
      renderHighlight();
    });
  };

  // 初期表示はSSR済みなので、shiki本体はアイドル時に読み込む。
  // 初回操作まで遅らせる案は、読み込み前に打鍵されると全文が一度プレーンテキストへ落ちるため見送った
  // ハイライターの準備完了（ライブループ再生の自動開始が待つ）。読み込み失敗時も resolve する
  //（失敗してもプレーンテキストのフォールバックで再生自体は成立するため、待ち続けない）
  let highlightReadyResolve: () => void = () => {};
  const highlightReady = new Promise<void>((resolve) => {
    highlightReadyResolve = resolve;
  });
  const loadHighlighter = (): void => {
    void import('./highlight')
      .then(async (mod) => {
        await mod.preloadHighlighter();
        highlightSyncFn = mod.highlightSync;
        renderHighlight();
      })
      // 読み込み失敗（再デプロイ後の古いチャンク・オフライン等）はプレーンテキスト表示のまま続行する
      .catch(() => {})
      .finally(() => highlightReadyResolve());
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadHighlighter);
  } else {
    setTimeout(loadHighlighter, 1500);
  }

  // ---- 入力・タブ切替 -----------------------------------------------------
  // 構文エラー中のタブに warning 色のインジケーターを付ける（data-invalid 属性。CSS は両タブ共通）
  const setTabInvalid = (button: HTMLButtonElement | null, invalid: boolean): void => {
    if (!button) return;
    if (invalid) {
      button.setAttribute('data-invalid', '');
    } else {
      button.removeAttribute('data-invalid');
    }
  };
  const setHtmlInvalid = (invalid: boolean): void => setTabInvalid(htmlTabButton, invalid);
  const setJsxInvalid = (invalid: boolean): void => setTabInvalid(jsxTabButton, invalid);

  // 構文エラーの invalid 状態を入力要素自体にも紐付ける（タブの warning 色・スナックバーは視覚のみのため）
  const setTextareaInvalid = (invalid: boolean): void => {
    if (invalid) {
      textarea.setAttribute('aria-invalid', 'true');
    } else {
      textarea.removeAttribute('aria-invalid');
    }
  };

  // ---- 入力上限（直前の状態へ巻き戻して受け付けない） ------------------------
  // beforeinput 時点（＝変更前）の値とカーソル位置を控えておき、超過したら復元する
  let snapshot = { value: textarea.value, selStart: 0, selEnd: 0 };
  const saveSnapshot = (): void => {
    snapshot = { value: textarea.value, selStart: textarea.selectionStart, selEnd: textarea.selectionEnd };
  };
  const enforceLimit = (): boolean => {
    if (textarea.value.length <= MAX_CODE_LENGTH) return false;
    // 上限超過でも、長さが増えない編集（削除・同長置換）は受け付ける。
    // タブ切替の変換で表示テキストが上限を超えた場合に、削除で上限内へ戻る脱出手段を残すため
    if (textarea.value.length <= snapshot.value.length) return false;
    textarea.value = snapshot.value;
    textarea.setSelectionRange(snapshot.selStart, snapshot.selEnd);
    snackbar?.show(STRINGS.characterLimit(MAX_CODE_LENGTH));
    return true;
  };
  textarea.addEventListener('beforeinput', (e) => {
    if (!e.isComposing) saveSnapshot();
  });
  // IME変換中の巻き戻しは入力を壊すため、確定時にまとめて判定する
  textarea.addEventListener('compositionstart', saveSnapshot);
  textarea.addEventListener('compositionend', () => {
    if (enforceLimit()) processInput();
  });

  // ---- Tabキーでのインデント操作（キーボードトラップ回避付き） ---------------
  // コードエディターとして Tab で 2 スペース（プリンタの整形ルールと同じ）を挿入し、
  // Shift+Tab でアウトデント（各行の行頭から先頭のスペースを最大 2 つ削除）する。
  // WCAG 2.1.2（キーボードトラップ禁止）のための脱出手段（KvEditor.astro の sr-only ヒントで案内）:
  // - キーボード遷移（Tab）で入った直後はキャプチャ無効 = 素通りできる。編集を始めたら有効化
  // - Esc → 直後の Tab / Shift+Tab は既定のフォーカス移動に任せる
  let tabCaptureEnabled = false;

  // 複数行の execCommand ループ中は input イベントごとの処理（変換・全文ハイライト）を抑止する。
  // 行数ぶんの同期全文ハイライトが 1 回の Tab 押下で走ってメインスレッドが固まるのを防ぐため、
  // ループ完了後に 1 回だけ processInput を呼ぶ
  let suppressInputEvents = false;

  const insertIndent = (): void => {
    // undo 履歴を保持するため execCommand を優先する。成功すれば beforeinput / input が発火し、
    // 既存のスナップショット・上限チェック・processInput のパイプラインがそのまま機能する
    if (typeof document.execCommand === 'function' && document.execCommand('insertText', false, '  ')) return;
    // フォールバック: input イベントが発火しないため、上限チェック・反映・スナップショットを手動で行う
    const nextLength = textarea.value.length - (textarea.selectionEnd - textarea.selectionStart) + 2;
    if (nextLength > MAX_CODE_LENGTH) {
      snackbar?.show(STRINGS.characterLimit(MAX_CODE_LENGTH));
      return;
    }
    textarea.setRangeText('  ', textarea.selectionStart, textarea.selectionEnd, 'end');
    processInput();
    saveSnapshot();
  };

  // 選択範囲に触れる各行の行頭位置を昇順で返す（選択なしならキャレット行のみ）。
  // 選択があり selectionEnd がちょうど行頭にある場合、その行は含めない（一般的なエディターの慣習）
  const getSelectedLineStarts = (): number[] => {
    const value = textarea.value;
    const { selectionStart: selStart, selectionEnd: selEnd } = textarea;
    const effectiveEnd = selEnd > selStart && value[selEnd - 1] === '\n' ? selEnd - 1 : selEnd;
    const starts: number[] = [selStart <= 0 ? 0 : value.lastIndexOf('\n', selStart - 1) + 1];
    for (let nl = value.indexOf('\n', starts[0]); nl !== -1 && nl < effectiveEnd; nl = value.indexOf('\n', nl + 1)) {
      starts.push(nl + 1);
    }
    return starts;
  };

  // 複数行選択時の Tab: 選択を置換せず、選択範囲に触れる各行の行頭に 2 スペースを挿入する
  const indentSelectedLines = (): void => {
    const { selectionStart: selStart, selectionEnd: selEnd } = textarea;
    const lineStarts = getSelectedLineStarts();
    if (textarea.value.length + lineStarts.length * 2 > MAX_CODE_LENGTH) {
      snackbar?.show(STRINGS.characterLimit(MAX_CODE_LENGTH));
      return;
    }
    // undo 履歴を保持するため execCommand を優先する（複数行の編集が行ごとの undo ステップに分かれるのは許容）。
    // 行オフセットがずれないよう、最後の行から先頭行へ逆順に処理する
    suppressInputEvents = true;
    try {
      for (let i = lineStarts.length - 1; i >= 0; i--) {
        const ls = lineStarts[i];
        textarea.setSelectionRange(ls, ls);
        if (typeof document.execCommand === 'function' && document.execCommand('insertText', false, '  ')) continue;
        // フォールバック: input イベントは発火しないが、反映はループ後の processInput で同様に行われる
        textarea.setRangeText('  ', ls, ls, 'end');
      }
    } finally {
      suppressInputEvents = false;
    }
    processInput();
    // 選択範囲を論理的に同じ位置へ復元する
    textarea.setSelectionRange(selStart + 2, selEnd + lineStarts.length * 2);
    saveSnapshot();
  };

  // Shift+Tab のアウトデント: 選択範囲に触れる各行（選択なしならキャレット行）の行頭から
  // 先頭のスペースを最大 2 つ削除する。削除するものがない行はスキップする
  const outdentSelectedLines = (): void => {
    const value = textarea.value;
    const { selectionStart: selStart, selectionEnd: selEnd } = textarea;
    const lineStarts = getSelectedLineStarts();
    const removeCounts: number[] = lineStarts.map((ls) => (value.startsWith('  ', ls) ? 2 : value[ls] === ' ' ? 1 : 0));
    const removedTotal = removeCounts.reduce((sum, n) => sum + n, 0);
    // 全行に削除対象がなければ何もしない（preventDefault 済みなのでフォーカスは移動しない = 挙動の予測可能性を保つ）
    if (removedTotal === 0) return;
    // execCommand 優先・逆順処理は indentSelectedLines と同じ
    suppressInputEvents = true;
    try {
      for (let i = lineStarts.length - 1; i >= 0; i--) {
        if (removeCounts[i] === 0) continue;
        const ls = lineStarts[i];
        textarea.setSelectionRange(ls, ls + removeCounts[i]);
        if (typeof document.execCommand === 'function' && document.execCommand('delete')) continue;
        textarea.setRangeText('', ls, ls + removeCounts[i], 'end');
      }
    } finally {
      suppressInputEvents = false;
    }
    processInput();
    // 選択範囲を論理的に同じ位置へ復元する。削除範囲の内側にあった端点が
    // その行の（削除後の）行頭より前へ行かないようクランプする
    const newSelStart = Math.max(lineStarts[0], selStart - removeCounts[0]);
    const lastLineNewStart = lineStarts[lineStarts.length - 1] - (removedTotal - removeCounts[removeCounts.length - 1]);
    const newSelEnd = Math.max(newSelStart, lastLineNewStart, selEnd - removedTotal);
    textarea.setSelectionRange(newSelStart, newSelEnd);
    saveSnapshot();
  };

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Esc でキャプチャを解除する（直後の Tab / Shift+Tab は既定のフォーカス移動 = 脱出手段）
      tabCaptureEnabled = false;
      return;
    }
    if (e.key === 'Tab') {
      if (e.isComposing || !tabCaptureEnabled) return;
      e.preventDefault();
      if (e.shiftKey) {
        outdentSelectedLines();
      } else if (textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).includes('\n')) {
        indentSelectedLines();
      } else {
        insertIndent();
      }
      return;
    }
    // 修飾キー単独以外のキーが押されたらアーム（キーボード遷移で入った後や Esc 解除後に、編集を始めた場合）
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) tabCaptureEnabled = true;
  });
  // クリック（pointerdown）由来のフォーカスだけ即キャプチャする。キーボード遷移（Tab）で
  // 通りすがっただけのユーザーは捕まえず、上のキー入力アームで編集を始めるまで素通りさせる
  let focusedByPointer = false;
  textarea.addEventListener('pointerdown', () => {
    // フォーカス済みの textarea をクリックして編集位置を選んだ場合（focus は発火しない）も編集意図とみなす
    tabCaptureEnabled = true;
    focusedByPointer = true;
  });
  textarea.addEventListener('focus', () => {
    tabCaptureEnabled = focusedByPointer;
    focusedByPointer = false;
  });
  // フォーカス済みへの pointerdown で focus が発火しなかった場合のフラグ残りを、離脱時に掃除する
  textarea.addEventListener('blur', () => {
    focusedByPointer = false;
  });

  // ---- 構文チェック・空チェック（デバウンス評価 → スナックバー） -------------
  let syntaxTimer: ReturnType<typeof setTimeout> | undefined;
  let syntaxReported = false; // 正常→不正の遷移時だけ表示する（不正のまま連発させない）
  // 実体は setCode に依存するため後段で定義する（呼び出しはデバウンス発火時なので初期化済み）
  let restoreInitialCode: () => void = () => {};

  // 初期コードのタブ別の表示テキスト。JSX 版は初回参照時にだけ変換する
  let initialJsxText: string | null = null;
  const initialViewText = (): string => {
    if (state.activeTab === 'html') return initialHtml;
    initialJsxText ??= htmlToJsx(initialHtml);
    return initialJsxText;
  };
  /** 表示中のコードが初期コードから変わっているか（空も「変更あり」に含まれる） */
  const isModified = (): boolean => textarea.value !== initialViewText();

  // リセット提案（ボタンのみ・初期コードへ戻すまで表示）。タブ切替でも維持するため関数化
  const showRestorePrompt = (): void => {
    snackbar?.showAction(STRINGS.restoreInitialCode, () => restoreInitialCode());
  };

  const syncRestorePrompt = (): void => {
    if (isModified()) showRestorePrompt();
    else snackbar?.hideAction();
  };

  const scheduleSyntaxCheck = (): void => {
    clearTimeout(syntaxTimer);
    syntaxTimer = setTimeout(() => {
      // 空になったらリセット提案（ボタン付き・初期コードへ戻すまで表示）
      if (textarea.value.trim() === '') {
        // 空は構文エラーではないので、警告表示は消し、次に不正になったら改めて知らせる
        setTextareaInvalid(false);
        setHtmlInvalid(false);
        syntaxReported = false;
        showRestorePrompt();
        return;
      }
      // 表示は端的に（findHtmlIssue の詳細理由はテスト・デバッグ用で、表示には使わない）
      let issue: string | null = null;
      if (state.activeTab === 'html') {
        issue = findHtmlIssue(textarea.value) ? STRINGS.invalidHtml : null;
        // HTMLタブの invalid 状態はデバウンス評価が唯一の判定箇所（JSXタブは processInput で即時判定済み）。
        // スナックバーは遷移時の1回だが、タブの warning 色は不正な間は付き続ける（永続的な手がかり）
        setTextareaInvalid(issue !== null);
        setHtmlInvalid(issue !== null);
      } else {
        // JSXタブの invalid 表示は processInput で即時に付けているので、ここはスナックバー用の再判定のみ
        issue = jsxToHtml(textarea.value) === null ? STRINGS.invalidJsx : null;
      }
      if (issue && !syntaxReported) snackbar?.show(issue);
      syntaxReported = issue !== null;
      // 初期コードから変わっていればリセット提案を出す（構文警告とは別の行として共存する）
      syncRestorePrompt();
    }, SYNTAX_CHECK_DEBOUNCE_MS);
  };
  // 古いメッセージの誤表示を防ぐため、タブ切替・プログラム的な書き換え時に呼ぶ。エラー表示は両タブぶんまとめて消す（呼び出し側で片方を補わせない）
  const resetSyntaxCheck = (): void => {
    clearTimeout(syntaxTimer);
    syntaxReported = false;
    setTextareaInvalid(false);
    setHtmlInvalid(false);
    setJsxInvalid(false);
    snackbar?.hide();
  };

  const processInput = (): void => {
    clearHighlights();
    const text = textarea.value;
    state.tabText[state.activeTab] = text;
    // 提案の出し入れはデバウンス評価に任せる（打鍵のたびに出し直すとちらつくため）
    scheduleSyntaxCheck();

    if (state.activeTab === 'html') {
      state.html = text;
      state.stale.jsx = true;
    } else {
      const converted = jsxToHtml(text);
      if (converted === null) {
        // 不正なJSXの間は last-good モデルを維持する
        setJsxInvalid(true);
        setTextareaInvalid(true);
        renderHighlight();
        return;
      }
      setJsxInvalid(false);
      setTextareaInvalid(false);
      state.html = converted;
      state.stale.html = true;
    }
    renderHero();
    renderHighlight();
  };
  textarea.addEventListener('input', (e) => {
    // 複数行インデントの execCommand ループ中は抑止（ループ側が完了後に 1 回だけ処理する）
    if (suppressInputEvents) return;
    if (!e.isComposing && enforceLimit()) return;
    processInput();
  });

  const switchTab = (tab: EditorLang): void => {
    if (tab === state.activeTab) return;
    clearHighlights();
    state.activeTab = tab;

    // モデルから再生成が必要なタブはここで変換する
    const regenerated = state.stale[tab];
    if (state.stale[tab]) {
      state.tabText[tab] = tab === 'jsx' ? htmlToJsx(state.html) : state.html;
      state.stale[tab] = false;
    }
    textarea.value = state.tabText[tab];
    resetSyntaxCheck();
    // 元のタブへ戻ったとき、保持していた生テキストが不正なままなら warning 表示を復元する
    // （モデルから再生成したテキストは常に有効＝プリンタ出力なので再評価不要。resetSyntaxCheck 後に行うこと）
    if (tab === 'jsx' && !regenerated && jsxToHtml(textarea.value) === null) {
      setJsxInvalid(true);
      setTextareaInvalid(true);
    }
    if (tab === 'html' && !regenerated && findHtmlIssue(textarea.value)) {
      setHtmlInvalid(true);
      setTextareaInvalid(true);
    }
    // 変更されたままタブを切り替えた場合は、リセット提案を消さずに引き継ぐ
    syncRestorePrompt();
    saveSnapshot();

    for (const button of tabButtons) {
      const selected = button.dataset.kvTab === tab;
      button.setAttribute('aria-selected', String(selected));
      // roving tabindex: 選択タブだけを Tab キーのフォーカス順に含める
      button.tabIndex = selected ? 0 : -1;
      if (selected) tabPanel?.setAttribute('aria-labelledby', button.id);
    }
    renderHighlight();
    syncScroll();
  };
  for (const button of tabButtons) {
    button.addEventListener('click', () => switchTab(button.dataset.kvTab as EditorLang));
    // ARIAタブパターンの矢印キー操作（automatic activation: フォーカス移動と同時に切替）。
    // switchTab を直接呼ばず .click() を経由することで、player.ts の中断リスナー等の
    // クリックにぶら下がる既存処理もすべて発火させる
    button.addEventListener('keydown', (e) => {
      const index = tabButtons.indexOf(button);
      let target: HTMLButtonElement | undefined;
      if (e.key === 'ArrowLeft') {
        target = tabButtons[(index - 1 + tabButtons.length) % tabButtons.length];
      } else if (e.key === 'ArrowRight') {
        target = tabButtons[(index + 1) % tabButtons.length];
      } else if (e.key === 'Home') {
        target = tabButtons[0];
      } else if (e.key === 'End') {
        target = tabButtons[tabButtons.length - 1];
      }
      if (!target) return;
      e.preventDefault();
      target.focus();
      target.click();
    });
  }

  // ---- 検索モーダルのデリゲーション ----------------------------------------
  // lism-ui の setModal は初期化時に [data-modal-open] へ直接バインドするため、
  // ヒーローを innerHTML で書き換えるとリスナーが失われる。
  // クリックをヒーロー外の常設トリガー（ヘッダー）へ転送して機能を維持する。
  hero.addEventListener('click', (e) => {
    // 修飾キー付きクリック（新規タブで開く等）はブラウザ標準の挙動（href への遷移）に任せる
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-modal-open]');
    if (!trigger || !hero.contains(trigger)) return;
    const modalId = trigger.getAttribute('data-modal-open');
    if (!modalId) return;
    // modalId はユーザー入力由来なのでセレクタ文字列へ埋め込まず、走査して値で突き合わせる
    const persistent = [...document.querySelectorAll<HTMLElement>('[data-modal-open]')].find(
      (el) => el.getAttribute('data-modal-open') === modalId && !hero.contains(el)
    );
    if (!persistent) return;
    e.preventDefault();
    persistent.click();
  });

  // ---- コードのプログラム的な書き換え --------------------------------------
  // 表示テキストは呼び出し側へ委ねず、ここで一括して決める（表示とモデルの乖離を作らないため）
  const setCode = (code: string): void => {
    const viewText = state.activeTab === 'jsx' ? htmlToJsx(code) : code;
    if (textarea.value !== viewText) clearHighlights();
    state.html = code;
    state.tabText.html = code;
    state.stale.html = false;
    if (state.activeTab === 'jsx') {
      state.tabText.jsx = viewText;
      state.stale.jsx = false;
      textarea.value = viewText;
    } else {
      state.stale.jsx = true;
      textarea.value = code;
    }
    resetSyntaxCheck();
    saveSnapshot();
    renderHero();
    renderHighlight();
  };

  // タイピングアニメの1フレーム反映（表示のみ）。
  // タイピング途中は書きかけの不完全なコードになり、ヒーローに崩れた瞬間が描画されてしまうため
  // フレームではヒーローを更新しない（反映はハンク確定ごとの commitView と完了時の setCode で行う）
  const setViewText = (text: string): void => {
    if (textarea.value !== text) clearHighlights();
    state.tabText[state.activeTab] = text;
    textarea.value = text;
    if (state.activeTab === 'html') {
      // HTML表記は部分的でもモデルとして保持できるため同期だけしておく（描画はしない）
      state.html = text;
      state.stale.jsx = true;
    }
    saveSnapshot();
    queueHighlight();
  };

  const commitView = (): void => {
    if (state.activeTab === 'html') {
      // モデルは setViewText がフレームごとに同期済みなのでヒーロー描画のみ
      renderHero();
      return;
    }
    const converted = jsxToHtml(textarea.value);
    if (converted === null) return;
    state.html = converted;
    state.stale.html = true;
    renderHero();
  };

  const canCommitView = (): boolean => state.activeTab === 'html' || jsxToHtml(textarea.value) !== null;

  // リセット提案スナックバーの「Restore initial code」ボタン
  // NOTE: scheduleSyntaxCheck から参照されるが、呼び出しは常に初期化完了後（デバウンス発火時）
  restoreInitialCode = (): void => {
    setCode(initialHtml);
    // フォーカスを非表示になったボタンに残さず、編集を続けられるようエディターへ戻す
    textarea.focus({ preventScroll: true });
  };

  // ---- プレイヤー接続 ------------------------------------------------------
  const editorApi: EditorApi = {
    setCode,
    getCode: () => state.html,
    getActiveTab: () => state.activeTab,
    switchTab,
    getViewText: () => textarea.value,
    setViewText,
    commitView,
    canCommitView,
    highlightRanges,
    clearHighlights,
    revealPosition,
    resetSyntaxCheck,
    syncRestorePrompt,
    textarea,
    tabButtons,
  };

  // デモの提示モードは SSR 側（KvEditor.astro の DEMO_MODE）が決め、data 属性で受け取る。
  // 'live': チャット演出なしの自動ループ再生（▶/⏸ トグル）。'ai': AIアシスタント風のチャットデモ
  if (demo.dataset.kvMode === 'live') {
    const toggleButtons = [...demo.querySelectorAll<HTMLButtonElement>('[data-kv-loop-toggle]')];
    // ▶/⏸ トグルは自動で動き続けるデモの停止手段（WCAG 2.2.2）なので、無ければ再生しない
    if (toggleButtons.length > 0) {
      createLoopPlayer({
        editor: editorApi,
        root: demo,
        // ホバー一時停止はコード編集領域だけを対象にする（バーの ▶/⏸ トグルを含めない）。
        // パネルが引けない場合も textarea なら必ずバーの外側なので、そちらへ退避する
        hoverTarget: tabPanel ?? textarea,
        toggleButtons,
        ready: highlightReady,
        initialHtml,
        scenario: SCENARIO_BY_LANG[lang],
      });
    }
    return;
  }

  const messages = demo.querySelector<HTMLElement>('[data-kv-messages]');
  const placeholder = demo.querySelector<HTMLElement>('[data-kv-placeholder]');
  const playButtons = [...demo.querySelectorAll<HTMLButtonElement>('[data-kv-play]')];
  // 文言要素は再生ボタンの中にあるので、ボタンごとに引く（ボタンが増えても対応が漏れない）
  const askTexts = playButtons
    .map((button) => button.querySelector<HTMLElement>('[data-kv-ask-text]'))
    .filter((el): el is HTMLElement => el !== null);
  // SR向けの隠しライブリージョン（確定文言のみを告知する）。無くても再生自体は動く
  const liveRegion = demo.querySelector<HTMLElement>('[data-kv-live]');
  if (messages && placeholder && askTexts.length > 0) {
    createPlayer({ editor: editorApi, messages, placeholder, playButtons, askTexts, liveRegion, initialHtml, scenario: SCENARIO_BY_LANG[lang] });
  }
}
