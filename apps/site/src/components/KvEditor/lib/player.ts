// AIシナリオの再生エンジン（mode: 'ai' のチャット型デモ）。
// 「Ask AI to...」クリックで全ステップを順に一気に再生する。
// - 各ステップ: ユーザー発話（入力欄でタイピング → 送信で吹き出し）→ AI発話（タイピング）→ コード書き換え（ハンクごとの diff タイピング）
// - アクティブタブの表記で再生する（resultCode は HTML。JSXタブでは htmlToJsx で変換してタイピング）
// - 再生中のエディター操作・タブ切替・Ask 再クリックは即中断（書きかけのまま残し "Interrupted" + Resume を表示）。Resume は止まった位置の続きから再生する
// - 全ステップ完了 → "Done" 行を表示。再クリックでチャットをクリアし初期コードへ戻して最初から
// - prefers-reduced-motion: タイピングを省略し、結果を即時適用する
// コード書き換えアニメの実体は code-anim.ts（loop.ts と共有）
import type { ScenarioStep } from '../scenario';
import { AbortedError, createCodeAnimator, sleep } from './code-anim';
import type { EditorApi } from './editor';
import { initScrollHint } from './scroll-hint';
import { STRINGS } from './strings';

// idle は初期状態（未再生）。全ステップを再生し終えると done になる
type PlayerStatus = 'idle' | 'playing' | 'interrupted' | 'done';

// ステップ内のフェーズ。中断→再開で「止まった瞬間」の続きから再生するために使う
type StepPhase = 'user' | 'ai' | 'code';

// タイピング・ポーズの速度設定（ms）。コード書き換え系の速度は code-anim.ts に集約している
const USER_TYPE_INTERVAL = 30;
const AI_TYPE_INTERVAL = 22;
const PAUSE_BEFORE_SEND = 300; // 入力欄タイピング完了 → 送信までの「間」
const PAUSE_BEFORE_AI = 400;
const PAUSE_BEFORE_CODE = 500;
const PAUSE_BETWEEN_STEPS = 1400; // ステップ間の「間」（最後のステップの後には置かない）
const PAUSE_REDUCED_MOTION = 900; // reduced-motion 時のステップ間の「間」

interface PlayerOptions {
  editor: EditorApi;
  messages: HTMLElement;
  placeholder: HTMLElement;
  playButtons: HTMLButtonElement[];
  // 再生ボタン内の文言要素（ボタンと 1 対 1）。タイピング演出はすべてのボタンへ反映する
  askTexts: HTMLElement[];
  // SR向けの隠しライブリージョン。null でも再生は動く（告知だけがスキップされる）
  liveRegion: HTMLElement | null;
  // 言語別のデータは editor.ts が解決して注入する（このモジュールは言語を知らない）
  initialHtml: string;
  scenario: ScenarioStep[];
}

export function createPlayer({ editor, messages, placeholder, playButtons, askTexts, liveRegion, initialHtml, scenario }: PlayerOptions): void {
  let status: PlayerStatus = 'idle';
  let currentStep = 0;
  let controller: AbortController | null = null;
  // 中断時にどのフェーズにいたか（再開はここから続ける）
  let resumePhase: StepPhase = 'user';
  // 中断→再開で継続する吹き出し（新規生成か途中継続かを判断するために参照を保持）
  let aiBubble: HTMLElement | null = null;
  // "Interrupted" ステータス行。再開時にこの行だけを取り除く
  let interruptedRow: HTMLElement | null = null;
  // 入力欄トリガーのプレースホルダー文言（送信・中断時にここへ戻す）
  const askPlaceholders = new Map(askTexts.map((el) => [el, el.textContent ?? '']));

  // コード書き換えアニメ（diff タイピング・reveal スクロール・所要時間上限つき復元）の共有エンジン
  const animator = createCodeAnimator(editor);
  const prefersReducedMotion = (): boolean => animator.prefersReducedMotion();

  // SRへの告知。タイピング演出の途中経過は流さず、確定した文言だけをここから告知する。
  // 一度空にしてから rAF で本文を設定することで、連続して同一文言でも読み上げられる
  const announce = (text: string): void => {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    requestAnimationFrame(() => {
      liveRegion.textContent = text;
    });
  };

  // 再生中の Ask ボタンはクリックで「停止（中断）」として機能するため、
  // aria-label を切り替えて実態を伝える（機能し続けるボタンなので aria-disabled は不正確で使わない）。
  // 元のラベルは初期化時に控えておき、再生を抜けたら復元する
  const defaultPlayLabels = new Map(playButtons.map((button) => [button, button.getAttribute('aria-label')]));
  const setPlayButtonsStopLabel = (playing: boolean): void => {
    for (const button of playButtons) {
      const label = playing ? STRINGS.stopDemo : defaultPlayLabels.get(button);
      if (label == null) {
        button.removeAttribute('aria-label');
      } else {
        button.setAttribute('aria-label', label);
      }
    }
  };

  const isJsxTab = (): boolean => editor.getActiveTab() === 'jsx';

  const appendBubble = (kind: 'user' | 'ai'): HTMLElement => {
    const bubble = document.createElement('p');
    bubble.className = `c--kvEditor_msg is--${kind}`;
    messages.appendChild(bubble);
    return bubble;
  };

  // スクロール余地を示す上下端のフェード。手動スクロールは scroll イベントで追従する
  const updateScrollHint = initScrollHint(messages);

  const scrollMessages = (): void => {
    messages.scrollTop = messages.scrollHeight;
    // 既に末尾にいる状態でコンテンツが増えると scroll イベントが発火しないため明示的に更新する
    updateScrollHint();
  };

  /** 入力欄トリガーに1文字ずつタイピングする（送信前の演出） */
  const typeIntoAsk = async (text: string, signal: AbortSignal): Promise<void> => {
    for (const el of askTexts) {
      el.classList.add('is--typing');
      el.textContent = '';
    }
    for (const char of text) {
      for (const el of askTexts) el.textContent += char;
      await sleep(USER_TYPE_INTERVAL, signal);
    }
  };

  const resetAsk = (): void => {
    for (const el of askTexts) {
      el.classList.remove('is--typing');
      el.textContent = askPlaceholders.get(el) ?? '';
    }
  };

  const typeMessage = async (bubble: HTMLElement, text: string, interval: number, signal: AbortSignal): Promise<void> => {
    if (prefersReducedMotion()) {
      bubble.textContent = text;
      scrollMessages();
      return;
    }
    // 既存テキストが目標の先頭一致なら続き（中断からの再開）、不一致（タブ切替等）なら打ち直す
    if (!text.startsWith(bubble.textContent ?? '')) bubble.textContent = '';
    // 絵文字などのサロゲートペアを割らないよう、UTF-16 単位ではなくコードポイント単位で進める
    const chars = [...text];
    for (let i = [...(bubble.textContent ?? '')].length; i < chars.length; i++) {
      bubble.textContent += chars[i];
      scrollMessages();
      await sleep(interval, signal);
    }
  };

  // resume: このステップをどのフェーズから始めるか。中断→再開で「止まった瞬間」の続きを再生する
  const playStep = async (stepIndex: number, signal: AbortSignal, resume: StepPhase): Promise<void> => {
    const step = scenario[stepIndex];

    // ユーザー発話フェーズ: 入力欄でタイピング → 送信（プレースホルダーに戻し、吹き出しへ全文一括表示）
    // 再開が 'ai' / 'code' の場合は既に完了済みなのでスキップし、吹き出しはそのまま残す
    if (resume === 'user') {
      aiBubble = null;
      if (!prefersReducedMotion()) {
        await typeIntoAsk(step.userMessage, signal);
        await sleep(PAUSE_BEFORE_SEND, signal);
        resetAsk();
      }
      const userBubble = appendBubble('user');
      userBubble.textContent = step.userMessage;
      scrollMessages();
      announce(step.userMessage);
      // ユーザー吹き出しを出した時点で user フェーズは完了。以降のポーズ中の中断は ai から再開する
      // （ポーズ後に更新すると、ポーズ中の中断で user 吹き出しを二重生成してしまう）
      resumePhase = 'ai';
      await sleep(PAUSE_BEFORE_AI, signal);
    }

    // AI発話フェーズ: タブの表記に合わせた文言を使う（JSX版が未定義ならHTML版で代用）
    if (resume === 'user' || resume === 'ai') {
      // 中断で途中まで打った吹き出しがあれば再利用し、なければ生成する
      aiBubble ??= appendBubble('ai');
      const aiText = isJsxTab() ? (step.aiMessageJsx ?? step.aiMessage) : step.aiMessage;
      await typeMessage(aiBubble, aiText, AI_TYPE_INTERVAL, signal);
      // タイピング完了（reduced-motion の即時表示も含む）後に全文を告知する（途中経過は流さない）
      announce(aiText);
      // AI発話を打ち終えた時点で ai フェーズは完了。以降のポーズ中の中断は code から再開する
      resumePhase = 'code';
      await sleep(PAUSE_BEFORE_CODE, signal);
    }

    // コード書き換えフェーズ: animateCode は「現在のビュー → 目標コード」の差分で書き換えるため、
    // 中断で残った部分コードから呼び直すだけで続きから再生される（snapTo で巻き戻さない）。
    // ステップ開始コード（前ステップの resultCode。最初のステップは初期コード）は、
    // アニメが長すぎる場合の復元先として渡す
    const stepStartCode = stepIndex === 0 ? initialHtml : scenario[stepIndex - 1].resultCode;
    await animator.animateCode(step.resultCode, stepStartCode, signal);
  };

  // 中断ステータス行の Resume ボタンから参照するため先に器だけ用意する
  // NOTE: 実体は後段で定義（run と相互参照のため）。呼び出しは常にユーザー操作時なので初期化済み
  let onPlayClick: () => void = () => {};

  const appendStatusRow = (labelText: string): HTMLElement => {
    const row = document.createElement('p');
    row.className = 'c--kvEditor_status';
    const label = document.createElement('span');
    label.className = 'c--kvEditor_statusLabel';
    label.textContent = labelText;
    row.appendChild(label);
    messages.appendChild(row);
    return row;
  };

  const showInterrupted = (): void => {
    const row = appendStatusRow(STRINGS.interrupted);
    row.classList.add('is--interrupted');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'c--kvEditor_statusBtn';
    button.textContent = STRINGS.resume;
    button.addEventListener('click', () => onPlayClick());
    row.appendChild(button);
    // 再開時にこの行だけを取り除く（吹き出し・書きかけコードは残す）
    interruptedRow = row;
    scrollMessages();
  };

  const run = async (fromStep: number, fromPhase: StepPhase): Promise<void> => {
    controller = new AbortController();
    const { signal } = controller;
    status = 'playing';
    setPlayButtonsStopLabel(true);
    placeholder.hidden = true;

    try {
      for (let i = fromStep; i < scenario.length; i++) {
        // 位置は「間」の前に確定する。ステップ間ポーズ中に中断しても、再開時に次ステップ i を保持するため
        currentStep = i;
        if (i === fromStep) {
          // 再開する最初のステップは中断フェーズから続ける
          resumePhase = fromPhase;
        } else {
          // 次ステップは頭から。間の中断に備えて先にフェーズを確定してからポーズを置く
          resumePhase = 'user';
          await sleep(prefersReducedMotion() ? PAUSE_REDUCED_MOTION : PAUSE_BETWEEN_STEPS, signal);
        }
        await playStep(i, signal, resumePhase);
      }
      // 完了の明示。done 後の再クリックでチャットごとクリアされる
      appendStatusRow(STRINGS.done);
      scrollMessages();
      status = 'done';
      setPlayButtonsStopLabel(false);
      announce(STRINGS.done);
      // デモが書き換えたコードを戻せるよう、リセット提案を出す
      // （最後の snapTo が通知を消しているので、ここで出し直す）
      editor.syncRestorePrompt();
    } catch (e) {
      // 中断: エディターは書きかけの状態をそのまま残す（仕様）。
      // 入力欄はプレースホルダーへ戻し、チャットへ Resume の導線を出す。
      // 想定外の例外でも同様に復旧させる（status が 'playing' のままだと
      // 再生ボタンも Resume も効かず UI がロックされるため）。Resume で再試行できる
      resetAsk();
      showInterrupted();
      status = 'interrupted';
      setPlayButtonsStopLabel(false);
      announce(STRINGS.interrupted);
      // 想定外の例外は握り潰さず再 throw する（開発中にバグへ気づけるようにする）
      if (!(e instanceof AbortedError)) throw e;
    }
  };

  const interrupt = (): void => {
    if (status !== 'playing') return;
    controller?.abort();
    status = 'interrupted';
  };

  // 再生中のエディター操作・タブ切替で即中断する（Ask ボタンのクリックは onPlayClick 側で停止として扱う）
  editor.textarea.addEventListener('pointerdown', interrupt);
  editor.textarea.addEventListener('focus', interrupt);
  // 再生開始時に textarea へフォーカスが残っていると focus / pointerdown は発火しない
  // （Safari / Firefox はボタンのクリックでフォーカスを移さない）。キー入力そのものも中断トリガーにする。
  // 再生中の書き換えは value への代入なので beforeinput は発火せず、自分の描画で中断することはない
  editor.textarea.addEventListener('beforeinput', interrupt);
  for (const button of editor.tabButtons) {
    button.addEventListener('click', interrupt);
  }

  onPlayClick = (): void => {
    // 再生中のクリックは「停止」として扱う（textarea フォーカス・タブ切替と同じ即中断）。
    // abort → catch 節の復旧処理で "Interrupted" 行 + Resume の導線が出る
    if (status === 'playing') {
      interrupt();
      return;
    }

    // 入力直後に再生を始めると、張られたままの構文チェック（デバウンス評価）がデモ中に発火して
    // 古い判定のスナックバーを出すため、再生に入る前に破棄する
    editor.resetSyntaxCheck();

    if (status === 'interrupted') {
      // "Interrupted" 行だけを取り除き、吹き出し・書きかけコードは残したまま
      // 中断したフェーズの続きから再生する（止まった瞬間から再開）
      interruptedRow?.remove();
      interruptedRow = null;
      void run(currentStep, resumePhase);
      return;
    }

    if (status === 'done') {
      // 全ステップ完了後: チャットをクリアし初期コードへ戻して最初から
      messages.innerHTML = '';
      updateScrollHint(); // クリアでフェード高さを 0 に戻す（前回分の残留を防ぐ）
      animator.snapTo(initialHtml);
      animator.ensureEditorVisible();
      void run(0, 'user');
      return;
    }

    // idle（初回）: 最初から一気に再生する。
    // コードはスナップせず、現在のエディター内容から resultCode へ diff タイピングする
    // （ただしエディターが空のときは、全文タイピングの冗長さを避けるため初期コードへ即時復元してから再生する）
    if (editor.getViewText().trim() === '') {
      animator.snapTo(initialHtml);
      animator.ensureEditorVisible();
    }
    void run(0, 'user');
  };
  for (const button of playButtons) {
    button.addEventListener('click', onPlayClick);
  }
}
