import { describe, it, expect, vi, beforeEach } from 'vitest';
import setAccordion, { setEvent, setAccordionForAstro } from './setAccordion';

vi.mock('../../helper/animation', () => ({
  waitFrame: vi.fn(() => Promise.resolve(0)),
  waitAnimation: vi.fn(() => Promise.resolve('finished' as const)),
  maybePauseAnimation: vi.fn(),
}));

import { waitAnimation } from '../../helper/animation';

const FIXTURE = `
  <div>
    <div class="b--accordion_item">
      <div class="b--accordion_heading">
        <button class="b--accordion_button" aria-expanded="false"></button>
      </div>
      <div class="b--accordion_panel" hidden="until-found">
        <div class="b--accordion_content"></div>
      </div>
    </div>
  </div>
`;

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
  vi.mocked(waitAnimation).mockResolvedValue('finished');
});

describe('setEvent', () => {
  it('クリックで item が開く（aria-expanded, data-opened, hidden 解除）', async () => {
    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    const button = item.querySelector<HTMLElement>('.b--accordion_button')!;
    const panel = item.querySelector<HTMLElement>('.b--accordion_panel')!;
    const cleanup = setEvent(item);

    button.click();
    await vi.waitFor(() => {
      expect(item).toHaveAttribute('data-opened');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(panel).not.toHaveAttribute('hidden');
    });

    cleanup();
  });

  it('開いた状態で再クリックすると閉じる', async () => {
    document.body.innerHTML = `
      <div>
        <div class="b--accordion_item" data-opened>
          <div class="b--accordion_heading">
            <button class="b--accordion_button" aria-expanded="true"></button>
          </div>
          <div class="b--accordion_panel">
            <div class="b--accordion_content"></div>
          </div>
        </div>
      </div>
    `;
    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    const button = item.querySelector<HTMLElement>('.b--accordion_button')!;
    const panel = item.querySelector<HTMLElement>('.b--accordion_panel')!;
    const cleanup = setEvent(item);

    button.click();
    await vi.waitFor(() => {
      expect(item).not.toHaveAttribute('data-opened');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(panel).toHaveAttribute('hidden');
    });

    cleanup();
  });

  it('開閉中だけ計測した高さを --_panelH に設定し、完了後にCSSへ戻す', async () => {
    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    const button = item.querySelector<HTMLElement>('.b--accordion_button')!;
    const panel = item.querySelector<HTMLElement>('.b--accordion_panel')!;
    const content = item.querySelector<HTMLElement>('.b--accordion_content')!;
    Object.defineProperty(content, 'offsetHeight', { value: 240 });
    Object.defineProperty(panel, 'offsetHeight', { value: 180 });
    let finishOpening!: (status: 'finished') => void;
    vi.mocked(waitAnimation).mockReturnValueOnce(
      new Promise((resolve) => {
        finishOpening = resolve;
      })
    );
    const cleanup = setEvent(item);

    button.click();
    await vi.waitFor(() => {
      expect(item).toHaveAttribute('data-opened');
      expect(item.style.getPropertyValue('--_panelH')).toBe('240px');
    });

    finishOpening('finished');
    await vi.waitFor(() => {
      expect(item.style.getPropertyValue('--_panelH')).toBe('');
    });

    button.click();
    expect(item.style.getPropertyValue('--_panelH')).toBe('180px');
    await vi.waitFor(() => {
      expect(panel).toHaveAttribute('hidden', 'until-found');
      expect(item.style.getPropertyValue('--_panelH')).toBe('');
    });

    cleanup();
  });

  it('beforematch イベントでもトグルする', async () => {
    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    const panel = item.querySelector<HTMLElement>('.b--accordion_panel')!;
    const cleanup = setEvent(item);

    panel.dispatchEvent(new Event('beforematch'));
    await vi.waitFor(() => {
      expect(item).toHaveAttribute('data-opened');
    });

    cleanup();
  });

  it('初期の hidden 属性値を保存し、閉じる時に同じ値で復元する', async () => {
    document.body.innerHTML = `
      <div>
        <div class="b--accordion_item">
          <div class="b--accordion_heading">
            <button class="b--accordion_button" aria-expanded="false"></button>
          </div>
          <div class="b--accordion_panel" hidden="">
            <div class="b--accordion_content"></div>
          </div>
        </div>
      </div>
    `;
    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    const button = item.querySelector<HTMLElement>('.b--accordion_button')!;
    const panel = item.querySelector<HTMLElement>('.b--accordion_panel')!;
    const cleanup = setEvent(item);

    button.click();
    await vi.waitFor(() => {
      expect(item).toHaveAttribute('data-opened');
      expect(panel).not.toHaveAttribute('hidden');
    });

    button.click();
    await vi.waitFor(() => {
      expect(panel.getAttribute('hidden')).toBe('');
    });

    cleanup();
  });

  it('クリーンアップ後はクリックしてもトグルされない', async () => {
    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    const button = item.querySelector<HTMLElement>('.b--accordion_button')!;
    const panel = item.querySelector<HTMLElement>('.b--accordion_panel')!;
    const cleanup = setEvent(item);

    cleanup();
    button.click();

    // リスナーが残っていれば hidden は同期的に外れるため、まず同期状態を検証する
    expect(panel).toHaveAttribute('hidden', 'until-found');

    // data-opened の付与はマイクロタスク数周後のため、setTimeout で全消化してから検証する
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(item).not.toHaveAttribute('data-opened');
  });

  it('waitAnimation が canceled を返した時、closed 後も hidden が付与されない', async () => {
    vi.mocked(waitAnimation).mockResolvedValueOnce('finished');
    vi.mocked(waitAnimation).mockResolvedValueOnce('canceled');

    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    const button = item.querySelector<HTMLElement>('.b--accordion_button')!;
    const panel = item.querySelector<HTMLElement>('.b--accordion_panel')!;
    const cleanup = setEvent(item);

    button.click();
    await vi.waitFor(() => {
      expect(item).toHaveAttribute('data-opened');
    });

    button.click();
    await vi.waitFor(() => {
      expect(item).not.toHaveAttribute('data-opened');
    });

    expect(panel).not.toHaveAttribute('hidden');

    cleanup();
  });
});

describe('排他制御', () => {
  it('data-allow-multiple がない時、別 item を開くと前の item が閉じる', async () => {
    document.body.innerHTML = `
      <div>
        <div class="b--accordion_item" data-opened>
          <div class="b--accordion_heading">
            <button class="b--accordion_button" aria-expanded="true"></button>
          </div>
          <div class="b--accordion_panel">
            <div class="b--accordion_content"></div>
          </div>
        </div>
        <div class="b--accordion_item">
          <div class="b--accordion_heading">
            <button class="b--accordion_button" aria-expanded="false"></button>
          </div>
          <div class="b--accordion_panel" hidden="until-found">
            <div class="b--accordion_content"></div>
          </div>
        </div>
      </div>
    `;
    const [item1, item2] = document.querySelectorAll<HTMLElement>('.b--accordion_item');
    setEvent(item1);
    setEvent(item2);

    item2.querySelector<HTMLElement>('.b--accordion_button')!.click();
    await vi.waitFor(() => {
      expect(item2).toHaveAttribute('data-opened');
      expect(item1).not.toHaveAttribute('data-opened');
    });
  });

  it('data-allow-multiple がある時、両方開いたまま保てる', async () => {
    document.body.innerHTML = `
      <div data-allow-multiple>
        <div class="b--accordion_item" data-opened>
          <div class="b--accordion_heading">
            <button class="b--accordion_button" aria-expanded="true"></button>
          </div>
          <div class="b--accordion_panel">
            <div class="b--accordion_content"></div>
          </div>
        </div>
        <div class="b--accordion_item">
          <div class="b--accordion_heading">
            <button class="b--accordion_button" aria-expanded="false"></button>
          </div>
          <div class="b--accordion_panel" hidden="until-found">
            <div class="b--accordion_content"></div>
          </div>
        </div>
      </div>
    `;
    const [item1, item2] = document.querySelectorAll<HTMLElement>('.b--accordion_item');
    setEvent(item1);
    setEvent(item2);

    item2.querySelector<HTMLElement>('.b--accordion_button')!.click();
    await vi.waitFor(() => {
      expect(item1).toHaveAttribute('data-opened');
      expect(item2).toHaveAttribute('data-opened');
    });
  });
});

describe('setAccordion (default export)', () => {
  it('document 内の全 .b--accordion_item に登録される', async () => {
    document.body.innerHTML = `
      <div data-allow-multiple>
        <div class="b--accordion_item">
          <div class="b--accordion_heading">
            <button class="b--accordion_button" aria-expanded="false"></button>
          </div>
          <div class="b--accordion_panel" hidden="until-found">
            <div class="b--accordion_content"></div>
          </div>
        </div>
        <div class="b--accordion_item">
          <div class="b--accordion_heading">
            <button class="b--accordion_button" aria-expanded="false"></button>
          </div>
          <div class="b--accordion_panel" hidden="until-found">
            <div class="b--accordion_content"></div>
          </div>
        </div>
      </div>
    `;
    setAccordion();

    const [item1, item2] = document.querySelectorAll<HTMLElement>('.b--accordion_item');

    item1.querySelector<HTMLElement>('.b--accordion_button')!.click();
    await vi.waitFor(() => {
      expect(item1).toHaveAttribute('data-opened');
    });

    item2.querySelector<HTMLElement>('.b--accordion_button')!.click();
    await vi.waitFor(() => {
      expect(item2).toHaveAttribute('data-opened');
    });
  });
});

// 1回の click でハンドラが動いた回数を、preventDefault の呼び出し回数で数える
const countClickHandlerCalls = (button: HTMLElement): number => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  const preventDefault = vi.spyOn(event, 'preventDefault');
  button.dispatchEvent(event);
  return preventDefault.mock.calls.length;
};

describe('二重登録の防止', () => {
  it('同じ item を2回初期化しても、1回の click でハンドラは1回だけ動く', () => {
    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    const button = item.querySelector<HTMLElement>('.b--accordion_button')!;
    setEvent(item);
    setEvent(item);

    expect(countClickHandlerCalls(button)).toBe(1);
  });

  it('クリーンアップ後の再登録は弾かれない（StrictMode の「登録→解除→登録」）', () => {
    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    const button = item.querySelector<HTMLElement>('.b--accordion_button')!;

    setEvent(item)();
    const cleanup = setEvent(item);

    expect(countClickHandlerCalls(button)).toBe(1);

    cleanup();
    expect(countClickHandlerCalls(button)).toBe(0);
  });

  it('弾かれた2回目の戻り値を呼んでも、1回目の登録は解除されない', () => {
    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    const button = item.querySelector<HTMLElement>('.b--accordion_button')!;
    setEvent(item);

    setEvent(item)();

    expect(countClickHandlerCalls(button)).toBe(1);
  });
});

describe('setAccordionForAstro', () => {
  const getButton = () => document.querySelector<HTMLElement>('.b--accordion_button')!;

  it('読み込み時点の要素をすぐ初期化する', () => {
    setAccordionForAstro();

    expect(countClickHandlerCalls(getButton())).toBe(1);
  });

  it('body を差し替えて astro:page-load を発火させると、新しい要素が動く', async () => {
    setAccordionForAstro();

    document.body.innerHTML = FIXTURE;
    document.dispatchEvent(new Event('astro:page-load'));

    const item = document.querySelector<HTMLElement>('.b--accordion_item')!;
    getButton().click();
    await vi.waitFor(() => {
      expect(item).toHaveAttribute('data-opened');
    });
  });

  it('astro:page-load で再初期化しても、1回の click でハンドラは1回だけ動く', () => {
    setAccordionForAstro();
    document.dispatchEvent(new Event('astro:page-load'));

    expect(countClickHandlerCalls(getButton())).toBe(1);
  });
});
