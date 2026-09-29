import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import setTabs, { setTabsForAstro } from './setTabs';

// Tab.astro / Panel.astro が出力するマークアップを模したフィクスチャ
const FIXTURE = `
  <div class="b--tabs">
    <div class="b--tabs_list" role="tablist">
      <button class="b--tabs_tab" type="button" role="tab" id="panel1-tab" aria-controls="panel1" aria-selected="true" tabindex="0"></button>
      <button class="b--tabs_tab" type="button" role="tab" id="panel2-tab" aria-controls="panel2" aria-selected="false" tabindex="-1"></button>
      <button class="b--tabs_tab" type="button" role="tab" id="panel3-tab" aria-controls="panel3" aria-selected="false" tabindex="-1"></button>
    </div>
    <div id="panel1" class="b--tabs_panel" role="tabpanel" aria-labelledby="panel1-tab" tabindex="0"></div>
    <div id="panel2" class="b--tabs_panel" role="tabpanel" aria-labelledby="panel2-tab" tabindex="0" hidden></div>
    <div id="panel3" class="b--tabs_panel" role="tabpanel" aria-labelledby="panel3-tab" tabindex="0" hidden></div>
  </div>
`;

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
  history.replaceState({}, '', '/');
});

afterEach(() => {
  history.replaceState({}, '', '/');
});

const getEls = () => {
  const tabs = document.querySelector<HTMLElement>('.b--tabs')!;
  const tabBtns = Array.from(tabs.querySelectorAll<HTMLElement>('[role="tab"]'));
  const panels = Array.from(tabs.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  return { tabs, tabBtns, panels };
};

const pressKey = (el: HTMLElement, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
};

// 指定インデックス（0始まり）だけが選択状態になっていることを検証
const expectSelected = (index: number) => {
  const { tabBtns, panels } = getEls();
  tabBtns.forEach((btn, i) => {
    expect(btn).toHaveAttribute('aria-selected', i === index ? 'true' : 'false');
    expect(btn).toHaveAttribute('tabindex', i === index ? '0' : '-1');
  });
  panels.forEach((panel, i) => {
    if (i === index) {
      expect(panel).not.toHaveAttribute('hidden');
    } else {
      expect(panel).toHaveAttribute('hidden');
    }
  });
};

describe('setTabs / クリック', () => {
  it('非選択 tab を click すると aria-selected / tabindex / hidden が切り替わる', () => {
    const { tabs, tabBtns } = getEls();
    setTabs(tabs);

    tabBtns[1].click();

    expectSelected(1);
  });

  it('既選択 tab を click しても状態は維持される', () => {
    const { tabs, tabBtns } = getEls();
    setTabs(tabs);

    tabBtns[0].click();

    expectSelected(0);
  });

  it('選択中の tab が存在しない状態でも click で選択できる', () => {
    const { tabs, tabBtns, panels } = getEls();
    // 初期状態を「どのタブも未選択」に崩す
    tabBtns.forEach((btn) => {
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
    });
    panels.forEach((panel) => panel.setAttribute('hidden', ''));
    setTabs(tabs);

    tabBtns[2].click();

    expectSelected(2);
  });

  it('aria-controls が無い tab を click しても例外で落ちない', () => {
    const { tabs } = getEls();

    const extraBtn = document.createElement('button');
    extraBtn.className = 'b--tabs_tab';
    extraBtn.setAttribute('role', 'tab');
    extraBtn.setAttribute('aria-selected', 'false');
    tabs.querySelector('.b--tabs_list')!.appendChild(extraBtn);

    setTabs(tabs);

    expect(() => extraBtn.click()).not.toThrow();
    expect(extraBtn).toHaveAttribute('aria-selected', 'true');
  });
});

describe('setTabs / キーボード操作（水平・既定）', () => {
  it('ArrowRight で次のタブへ移動し、フォーカスと選択が連動する', () => {
    const { tabs, tabBtns } = getEls();
    setTabs(tabs);

    const event = pressKey(tabBtns[0], 'ArrowRight');

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tabBtns[1]);
    expectSelected(1);
  });
});

describe('setTabs / キーボード操作（aria-orientation="vertical"）', () => {
  // tablist に vertical を宣言してから setTabs する
  const setVerticalTabs = () => {
    const els = getEls();
    els.tabs.querySelector('[role="tablist"]')!.setAttribute('aria-orientation', 'vertical');
    setTabs(els.tabs);
    return els;
  };

  it('ArrowDown で次、ArrowUp で前のタブへ移動する', () => {
    const { tabBtns } = setVerticalTabs();

    const down = pressKey(tabBtns[0], 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tabBtns[1]);
    expectSelected(1);

    pressKey(tabBtns[1], 'ArrowUp');
    expect(document.activeElement).toBe(tabBtns[0]);
    expectSelected(0);
  });
});

describe('setTabs / ディープリンク', () => {
  it('?lism-tab=panel2 で panel2 が選択状態になる', () => {
    const { tabs } = getEls();

    history.replaceState({}, '', '/?lism-tab=panel2');
    setTabs(tabs);

    expectSelected(1);
  });

  it('存在しない id を ?lism-tab= に指定しても何も起きない', () => {
    const { tabs } = getEls();

    history.replaceState({}, '', '/?lism-tab=no-such-panel');
    setTabs(tabs);

    expectSelected(0);
  });

  it('?lism-tab= が無い URL では初期状態のまま', () => {
    const { tabs } = getEls();
    setTabs(tabs);

    expectSelected(0);
  });
});

describe('setTabs / 二重初期化の防止', () => {
  it('同じ要素を2回初期化しても、1回の click でハンドラは1回だけ動く', () => {
    const { tabs, tabBtns } = getEls();
    setTabs(tabs);
    setTabs(tabs);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    tabBtns[1].dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expectSelected(1);
  });

  it('初期化済みの要素を再初期化しても、ディープリンクで選択を戻さない', () => {
    const { tabs, tabBtns } = getEls();

    history.replaceState({}, '', '/?lism-tab=panel2');
    setTabs(tabs);
    tabBtns[2].click();
    setTabs(tabs);

    expectSelected(2);
  });
});

describe('setTabsForAstro', () => {
  it('読み込み時点の要素をすぐ初期化する', () => {
    setTabsForAstro();

    getEls().tabBtns[1].click();

    expectSelected(1);
  });

  it('body を差し替えて astro:page-load を発火させると、新しい要素が動く', () => {
    setTabsForAstro();

    document.body.innerHTML = FIXTURE;
    document.dispatchEvent(new Event('astro:page-load'));
    getEls().tabBtns[1].click();

    expectSelected(1);
  });

  it('astro:page-load で再初期化しても、1回の click でハンドラは1回だけ動く', () => {
    setTabsForAstro();
    document.dispatchEvent(new Event('astro:page-load'));

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    getEls().tabBtns[1].dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
