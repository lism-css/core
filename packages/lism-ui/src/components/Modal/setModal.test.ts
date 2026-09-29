import { describe, it, expect, vi, beforeEach } from 'vitest';
import setModal, { setEvent, setModalForAstro } from './setModal';

vi.mock('../../helper/animation', () => ({
  waitAnimation: vi.fn(() => Promise.resolve('finished' as const)),
}));

import { waitAnimation } from '../../helper/animation';

const FIXTURE = `
  <dialog id="m1" class="b--modal">
    <button data-modal-close="m1"></button>
  </dialog>
  <button data-modal-open="m1"></button>
`;

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
  vi.mocked(waitAnimation).mockResolvedValue('finished');
});

describe('setEvent (dialog 要素)', () => {
  it('open トリガーで showModal が呼ばれ open 属性が付き、次フレームで data-is-open が付く', async () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    const showModalSpy = vi.spyOn(modal, 'showModal');
    setEvent(modal);

    trigger.click();
    await vi.waitFor(() => {
      expect(modal).toHaveAttribute('open');
      expect(modal.dataset.isOpen).toBe('1');
      expect(trigger.dataset.targetOpened).toBe('1');
    });

    expect(showModalSpy).toHaveBeenCalledTimes(1);
  });

  it('close トリガーで data-is-open が消え、waitAnimation 後に閉じる', async () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    setEvent(modal);

    trigger.click();
    await vi.waitFor(() => {
      expect(modal.dataset.isOpen).toBe('1');
    });

    document.querySelector<HTMLElement>('[data-modal-close="m1"]')!.click();
    await vi.waitFor(() => {
      expect(modal).not.toHaveAttribute('data-is-open');
      expect(modal).not.toHaveAttribute('open');
      expect(trigger.dataset.targetOpened).toBeUndefined();
    });
  });

  it('余白クリック（pointerdown / click ともにターゲットが modal）で閉じる', async () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    setEvent(modal);

    trigger.click();
    await vi.waitFor(() => {
      expect(modal.dataset.isOpen).toBe('1');
    });

    modal.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.waitFor(() => {
      expect(modal).not.toHaveAttribute('data-is-open');
      expect(modal).not.toHaveAttribute('open');
    });
  });

  it('モーダル内で pointerdown した後の余白 click では閉じない（ドラッグ誤爆防止）', async () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    const innerBtn = document.querySelector<HTMLElement>('[data-modal-close="m1"]')!;
    setEvent(modal);

    trigger.click();
    await vi.waitFor(() => {
      expect(modal.dataset.isOpen).toBe('1');
    });

    // モーダル内でドラッグ（テキスト選択等）を開始し、余白で離して click のターゲットが modal になったケース
    innerBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(modal.dataset.isOpen).toBe('1');
    expect(modal).toHaveAttribute('open');
  });

  it('closeDialog を経由せず閉じられた場合（form method="dialog" 等）も後始末される', async () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    setEvent(modal);

    trigger.click();
    await vi.waitFor(() => {
      expect(modal.dataset.isOpen).toBe('1');
    });

    // closeDialog() を経由しないネイティブの close()（form method="dialog" の送信相当）
    modal.close();

    await vi.waitFor(() => {
      expect(modal).not.toHaveAttribute('data-is-open');
      expect(modal).not.toHaveAttribute('open');
      expect(trigger.dataset.targetOpened).toBeUndefined();
    });
  });

  it('開いた直後（data-is-open 付与前）に閉じられた場合、次フレーム以降も data-is-open は付かない', async () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    setEvent(modal);

    // open の rAF が実行される前に、closeDialog() を経由しない close() が走るケース
    trigger.click();
    modal.close();

    // rAF を2フレーム分待って、保留中の rAF が属性を戻していないことを確認する
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    expect(modal).not.toHaveAttribute('data-is-open');
    expect(modal).not.toHaveAttribute('open');
    expect(trigger.dataset.targetOpened).toBeUndefined();
  });

  it('cancel イベントで preventDefault され、closeDialog が走る', async () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    setEvent(modal);

    trigger.click();
    await vi.waitFor(() => {
      expect(modal.dataset.isOpen).toBe('1');
    });

    const cancelEvent = new Event('cancel', { cancelable: true });
    modal.dispatchEvent(cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    await vi.waitFor(() => {
      expect(modal).not.toHaveAttribute('data-is-open');
    });
  });

  it('連打防止: 既に open 中に再度 open トリガーを click しても showModal は 1 回のみ', async () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    const showModalSpy = vi.spyOn(modal, 'showModal');
    setEvent(modal);

    trigger.click();
    await vi.waitFor(() => {
      expect(modal.dataset.isOpen).toBe('1');
    });

    trigger.click();
    await Promise.resolve();

    expect(showModalSpy).toHaveBeenCalledTimes(1);
  });

  it('連打防止: 同一フレーム内（data-is-open 付与前）の連続 click でも showModal は 1 回のみ', async () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    const showModalSpy = vi.spyOn(modal, 'showModal');
    setEvent(modal);

    trigger.click();
    trigger.click();

    expect(showModalSpy).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => {
      expect(modal.dataset.isOpen).toBe('1');
    });
  });
});

describe('setEvent (モーダル内のリンククリック)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <dialog id="m1" class="b--modal">
        <a id="link" href="#section"><span id="link-inner">link</span></a>
      </dialog>
      <button data-modal-open="m1"></button>
    `;
  });

  const openModal = async (): Promise<HTMLDialogElement> => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    setEvent(modal);
    document.querySelector<HTMLElement>('[data-modal-open="m1"]')!.click();
    await vi.waitFor(() => {
      expect(modal.dataset.isOpen).toBe('1');
    });
    return modal;
  };

  const clickLink = (target: Element, init: MouseEventInit = {}): MouseEvent => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };

  // 閉じる判定は click 後の macrotask で行われるため、「閉じない」ことの確認はそれが流れてから行う
  const flushDeferredClose = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

  it('ページ内リンクの click で閉じ、遷移は妨げない', async () => {
    const modal = await openModal();

    const event = clickLink(document.querySelector<HTMLAnchorElement>('#link')!);

    expect(event.defaultPrevented).toBe(false);
    await vi.waitFor(() => {
      expect(modal).not.toHaveAttribute('data-is-open');
      expect(modal).not.toHaveAttribute('open');
    });
  });

  it('リンク内側の要素を click しても閉じる', async () => {
    const modal = await openModal();

    clickLink(document.querySelector<HTMLElement>('#link-inner')!);

    await vi.waitFor(() => {
      expect(modal).not.toHaveAttribute('open');
    });
  });

  it('別ページへのリンクでは閉じない', async () => {
    const modal = await openModal();
    const link = document.querySelector<HTMLAnchorElement>('#link')!;
    link.setAttribute('href', '/other-page');
    // jsdom はハッシュ以外の遷移を未実装としてエラー出力するため、modal 側の判定後（window バブル）に抑止する
    const stopNavigation = (e: Event) => e.preventDefault();
    window.addEventListener('click', stopNavigation);

    clickLink(link);
    await flushDeferredClose();

    window.removeEventListener('click', stopNavigation);
    expect(modal.dataset.isOpen).toBe('1');
    expect(modal).toHaveAttribute('open');
  });

  it.each([
    ['target="_blank" のリンク', { target: '_blank' }, {}],
    ['修飾キー付き click', {}, { metaKey: true }],
  ])('%s では閉じない', async (_label, attrs, init) => {
    const modal = await openModal();
    const link = document.querySelector<HTMLAnchorElement>('#link')!;
    Object.entries(attrs).forEach(([k, v]) => link.setAttribute(k, v));

    clickLink(link, init);
    await flushDeferredClose();

    expect(modal.dataset.isOpen).toBe('1');
    expect(modal).toHaveAttribute('open');
  });

  it('リンク自身のハンドラで preventDefault 済みの click では閉じない', async () => {
    const modal = await openModal();
    const link = document.querySelector<HTMLAnchorElement>('#link')!;
    link.addEventListener('click', (e) => e.preventDefault());

    clickLink(link);
    await flushDeferredClose();

    expect(modal.dataset.isOpen).toBe('1');
    expect(modal).toHaveAttribute('open');
  });

  it('dialog より外側の bubble listener（React の root 委譲相当）で preventDefault された click では閉じない', async () => {
    const modal = await openModal();
    const link = document.querySelector<HTMLAnchorElement>('#link')!;
    document.body.addEventListener('click', (e) => e.preventDefault(), { once: true });

    clickLink(link);
    await flushDeferredClose();

    expect(modal.dataset.isOpen).toBe('1');
    expect(modal).toHaveAttribute('open');
  });
});

describe('setEvent (早期 return ケース)', () => {
  it('id が無い modal は何もしない', () => {
    document.body.innerHTML = `<dialog class="b--modal"></dialog>`;
    const modal = document.querySelector<HTMLDialogElement>('dialog')!;

    setEvent(modal);
    expect(modal).not.toHaveAttribute('open');
  });

  it('dialog 以外の要素はサポートせず、イベントを登録しない', async () => {
    document.body.innerHTML = `
      <div id="m2" class="b--modal">
        <button data-modal-close="m2"></button>
      </div>
      <button data-modal-open="m2"></button>
    `;
    const modal = document.querySelector<HTMLElement>('#m2')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m2"]')!;
    setEvent(modal);

    trigger.click();
    await Promise.resolve();

    expect(modal).not.toHaveAttribute('open');
    expect(modal.dataset.isOpen).toBeUndefined();
  });
});

describe('setModal (default export)', () => {
  it('document 内の .b--modal 全件に登録される', async () => {
    document.body.innerHTML = `
      <dialog id="m1" class="b--modal">
        <button data-modal-close="m1"></button>
      </dialog>
      <dialog id="m2" class="b--modal">
        <button data-modal-close="m2"></button>
      </dialog>
      <button data-modal-open="m1"></button>
      <button data-modal-open="m2"></button>
    `;
    setModal();

    document.querySelector<HTMLElement>('[data-modal-open="m1"]')!.click();
    await vi.waitFor(() => {
      expect(document.querySelector('#m1')).toHaveAttribute('open');
    });

    document.querySelector<HTMLElement>('[data-modal-open="m2"]')!.click();
    await vi.waitFor(() => {
      expect(document.querySelector('#m2')).toHaveAttribute('open');
    });
  });
});

describe('二重登録の防止', () => {
  it('同じ modal を2回初期化しても、イベントを重ねて登録しない', () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    const closeTrigger = document.querySelector<HTMLElement>('[data-modal-close="m1"]')!;
    const spies = [modal, trigger, closeTrigger].map((el) => vi.spyOn(el, 'addEventListener'));

    setEvent(modal);
    const counts = spies.map((spy) => spy.mock.calls.length);
    setEvent(modal);

    expect(counts.every((count) => count > 0)).toBe(true);
    expect(spies.map((spy) => spy.mock.calls.length)).toEqual(counts);
  });

  it('modal だけが残った場合（transition:persist）、新しいトリガーを登録する', async () => {
    const modal = document.querySelector<HTMLDialogElement>('#m1')!;
    setEvent(modal);

    document.querySelector('[data-modal-open="m1"]')!.remove();
    document.body.insertAdjacentHTML('beforeend', '<button data-modal-open="m1"></button>');
    const newTrigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    setEvent(modal);

    newTrigger.click();
    await vi.waitFor(() => {
      expect(modal.dataset.isOpen).toBe('1');
      expect(newTrigger.dataset.targetOpened).toBe('1');
    });

    modal.close();
    expect(newTrigger.dataset.targetOpened).toBeUndefined();
  });

  it('トリガーだけが残った場合（transition:persist）、新しい modal を開く', async () => {
    const oldModal = document.querySelector<HTMLDialogElement>('#m1')!;
    const trigger = document.querySelector<HTMLElement>('[data-modal-open="m1"]')!;
    const oldShowModalSpy = vi.spyOn(oldModal, 'showModal');
    setEvent(oldModal);

    oldModal.remove();
    document.body.insertAdjacentHTML('beforeend', '<dialog id="m1" class="b--modal"></dialog>');
    const newModal = document.querySelector<HTMLDialogElement>('#m1')!;
    setEvent(newModal);

    trigger.click();
    await vi.waitFor(() => {
      expect(newModal.dataset.isOpen).toBe('1');
    });
    expect(oldShowModalSpy).not.toHaveBeenCalled();
  });
});

describe('setModalForAstro', () => {
  it('読み込み時点の要素をすぐ初期化する', async () => {
    setModalForAstro();

    document.querySelector<HTMLElement>('[data-modal-open="m1"]')!.click();
    await vi.waitFor(() => {
      expect(document.querySelector('#m1')).toHaveAttribute('open');
    });
  });

  it('body を差し替えて astro:page-load を発火させると、新しい要素が動く', async () => {
    setModalForAstro();

    document.body.innerHTML = FIXTURE;
    document.dispatchEvent(new Event('astro:page-load'));

    document.querySelector<HTMLElement>('[data-modal-open="m1"]')!.click();
    await vi.waitFor(() => {
      expect(document.querySelector('#m1')).toHaveAttribute('open');
    });
  });

  it('modal を開いたまま遷移しても、遷移先で scrollbar-gutter を予約できる', () => {
    const root = document.documentElement;
    // jsdom は clientWidth が 0 のため、スクロールバーが実幅を持つ環境として扱われる
    setModalForAstro();
    document.querySelector<HTMLElement>('[data-modal-open="m1"]')!.click();
    expect(root.style.scrollbarGutter).toBe('stable');

    // ClientRouter の遷移を模す: close イベントを経ずに body が入れ替わり、html の属性も遷移先のものになる
    document.body.innerHTML = FIXTURE;
    root.removeAttribute('style');
    document.dispatchEvent(new Event('astro:page-load'));

    document.querySelector<HTMLElement>('[data-modal-open="m1"]')!.click();
    expect(root.style.scrollbarGutter).toBe('stable');
  });
});
