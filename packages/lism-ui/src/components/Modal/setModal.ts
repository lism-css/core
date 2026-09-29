import { waitAnimation } from '../../helper/animation';

/*
 * dialog を showModal() で開くと背景スクロールがロックされ、ページのスクロールバーが消える。
 * スクロールバーが実幅を持つ環境では、その幅分 viewport が広がってレイアウトが横にがたつく。
 * これを防ぐため、開いている間だけ html に scrollbar-gutter: stable を当ててスクロールバー幅を予約する。
 * Modal は同時に1つだけ開く前提なので、状態は「適用前の値」1つだけ保持する（null = 未適用）。
 */
let savedScrollbarGutter: string | null = null;

/**
 * dialog を showModal() する直前に呼ぶ。
 *   Point: 判定・適用は showModal() の前に行う。showModal() 後はスクロールがロックされて
 *          clientWidth が変わり、スクロールバーの有無を正しく判定できなくなる。
 */
const lockScrollbarGutter = (): void => {
  if (savedScrollbarGutter !== null) return; // すでに適用中
  const root = document.documentElement;
  // window幅 > html の表示幅 → スクロールバーが実幅を持っている場合だけ適用する
  if (window.innerWidth > root.clientWidth) {
    savedScrollbarGutter = root.style.scrollbarGutter; // 元の inline style を保持して後で復元する
    root.style.scrollbarGutter = 'stable';
  }
};

/**
 * dialog を close() した直後に呼ぶ。
 *   Point: 復元は close() の後に行う。close() 前に戻すと、まだスクロールバーが無い状態で
 *          gutter を外すことになり、close() 直後のスクロールバー復活と二重にがたつく。
 */
const unlockScrollbarGutter = (): void => {
  if (savedScrollbarGutter === null) return; // 未適用なら何もしない
  document.documentElement.style.scrollbarGutter = savedScrollbarGutter;
  savedScrollbarGutter = null;
};

/**
 * 同一ドキュメント内のハッシュ移動（`#id`、または現在ページのURL + `#id`）へのリンクか。
 * 解析できない href は origin 等が空文字になるため不一致として扱われる。
 */
const isInPageLink = (link: HTMLAnchorElement): boolean =>
  link.href.includes('#') && link.origin === location.origin && link.pathname === location.pathname && link.search === location.search;

/*
 * 再初期化で重ねて登録しないよう、登録済みの要素を記録する。
 * modal外にある開くトリガーは、modalと別に記録する。
 * transition:persist で片方だけが残っても、遷移先の新しい要素を登録するため。
 */
const modalOpeners = new WeakMap<HTMLDialogElement, (trigger: HTMLElement) => void>();
const registeredOpenTriggers = new WeakSet<HTMLElement>();

// 片方だけが入れ替わっても新しいmodalを開けるよう、対象のmodalはクリック時に探す。
function onOpenTriggerClick(e: Event): void {
  const trigger = e.currentTarget as HTMLElement;
  const modal = document.getElementById(trigger.getAttribute('data-modal-open') ?? '');
  if (modal instanceof HTMLDialogElement) modalOpeners.get(modal)?.(trigger);
}

/** dialogの開閉、トリガー状態の復元、背景クリック、ページ内リンク、Esc操作を設定する。 */
export function setEvent(target: HTMLElement): void {
  // 対象がない、またはidがない場合は処理を終了
  if (!target || !target.id) return;

  // フォーカストラップ・背景のinert化・Escクローズ等をネイティブ dialog に依存しているため、dialog 要素のみサポートする
  if (!(target instanceof HTMLDialogElement)) return;

  const modal = target;

  // openボタンにイベント登録
  document.querySelectorAll<HTMLElement>(`[data-modal-open="${modal.id}"]`).forEach((trigger) => {
    if (registeredOpenTriggers.has(trigger)) return;
    registeredOpenTriggers.add(trigger);
    trigger.addEventListener('click', onOpenTriggerClick);
  });

  if (modalOpeners.has(modal)) return;

  // オープンした時のトリガー要素を記憶する（data属性を戻すため）
  let theTrigger: HTMLElement | null = null;

  // モーダルを閉じるトリガーを取得
  const closeTriggers = modal.querySelectorAll<HTMLElement>(`[data-modal-close="${modal.id}"]`);

  // scrollbar幅を固定してdialogを開き、次フレームで開始属性を付ける。
  const openDialog = () => {
    // rAF前の連打によるshowModal()の二重実行を防ぐため、open属性で判定する。
    if (modal.hasAttribute('open')) return;

    lockScrollbarGutter();
    modal.showModal();

    // 次フレームで data-is-open を付与（CSS側でフェードインアニメーション開始）
    // closeイベントより遅いrAFが属性を戻さないよう、開いていることを確認する。
    requestAnimationFrame(() => {
      if (!modal.open) return;
      modal.dataset.isOpen = '1';
    });
  };

  // 開始属性を外し、終了アニメーション後にdialogを閉じる。
  const closeDialog = async (): Promise<void> => {
    // すでに閉じている場合は何もしない
    if (!modal.hasAttribute('data-is-open')) {
      return;
    }

    // data-is-open 属性を削除（CSS側でフェードアウトアニメーション開始）
    modal.removeAttribute('data-is-open');

    // アニメーション完了を待機
    await waitAnimation(modal);

    // アニメーション終了後、dialog を閉じる
    modal.close();
    unlockScrollbarGutter();
  };

  // openボタンのクリックで呼ばれる処理
  modalOpeners.set(modal, (trigger) => {
    // button側にもdata属性付与
    trigger.dataset.targetOpened = '1';
    theTrigger = trigger; // close() 時にdata属性削除するために記憶

    // モーダルを開く
    openDialog();
  });

  // closeボタンにイベント登録
  closeTriggers.forEach((trigger) => {
    trigger?.addEventListener('click', () => {
      void closeDialog();
    });
  });

  // 内側から余白へドラッグしたclickで閉じないよう、pointerdownも余白だった場合だけ閉じる。
  let isPointerDownOnBackdrop = false;
  modal.addEventListener('pointerdown', (e) => {
    isPointerDownOnBackdrop = e.target === modal;
  });
  modal.addEventListener('click', (e) => {
    if (isPointerDownOnBackdrop && e.target === modal) {
      void closeDialog();
    }
    isPointerDownOnBackdrop = false;
  });

  // ページ内リンクはページ遷移が起きず dialog が残るため、クリックで閉じる（遷移自体は妨げない）。
  // 修飾キー付き・別タブ向け・他のハンドラで preventDefault されたクリックは遷移しないので対象外。
  //   Point: preventDefault の判定は伝播完了後の macrotask で行う。React の onClick は root へ委譲され
  //          この listener より後に走るため同期では検知できず、microtask は実クリックだと listener 間で
  //          実行されるため不十分。
  modal.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element | null)?.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self')) return;
    if (!isInPageLink(link)) return;
    setTimeout(() => {
      if (!e.defaultPrevented) void closeDialog();
    }, 0);
  });

  // closeDialog()以外の経路でも後処理するため、冪等な復元をcloseイベントへ集約する。
  modal.addEventListener('close', () => {
    modal.removeAttribute('data-is-open');
    unlockScrollbarGutter();
    if (theTrigger) {
      theTrigger.removeAttribute('data-target-opened');
      theTrigger = null;
    }
  });

  // ESCキーで閉じた時もアニメーションを実行する処理
  modal.addEventListener('cancel', (e) => {
    e.preventDefault(); // デフォルトの即時 close() を防ぐ
    void closeDialog(); // 自分で用意したクローズ処理
  });
}

const setModal = () => {
  // modalを開いたままClientRouterで遷移すると、closeイベントが発火せず予約状態だけが残る。
  // htmlの属性は遷移先の値に置き換わっているため、遷移元の値を書き戻さずに破棄する。
  if (!document.querySelector('.b--modal[open]')) savedScrollbarGutter = null;

  const modals = document.querySelectorAll('.b--modal');
  modals?.forEach((target) => {
    setEvent(target as HTMLElement);
  });
};

/**
 * ページ内の全モーダルを初期化する（Astro用）
 *   Point: ClientRouterでの遷移後は script が再実行されないため、astro:page-load でも初期化する。
 *          ClientRouterが無いページでは astro:page-load が発火しないため、すぐ初期化する処理も必要。
 */
export const setModalForAstro = (): void => {
  setModal();
  document.addEventListener('astro:page-load', setModal);
};

export default setModal;
