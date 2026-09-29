import { waitFrame, waitAnimation, maybePauseAnimation } from '../../helper/animation';

// hidden を付け外しする時の値
let ACCORDION_HIDDEN_VALUE = 'until-found';

type AccordionElements = {
  heading: HTMLElement;
  button: HTMLElement;
  panel: HTMLElement;
  content: HTMLElement;
};

// アコーディオン要素から必要な要素を取得
const getAccordionElements = (accordionItem: HTMLElement): AccordionElements => {
  const heading = accordionItem.querySelector<HTMLElement>('.b--accordion_heading')!;
  const panel = accordionItem.querySelector<HTMLElement>('.b--accordion_panel')!;
  return {
    heading,
    button: heading.querySelector<HTMLElement>('.b--accordion_button')!,
    panel,
    content: panel.querySelector<HTMLElement>('.b--accordion_content')!,
  };
};

// 親に data-allow-multiple がついていなければ、展開中のアコーディオンを閉じる
const maybeCloseOpenedItems = (accordionItem: HTMLElement): void => {
  const parent = accordionItem.parentNode as HTMLElement | null;
  if (!parent) return;

  if (parent.hasAttribute('data-allow-multiple')) return;

  parent.querySelectorAll<HTMLElement>(':scope > [data-opened]').forEach((_a) => void closeAccordion(_a));
};

async function openAccordion(accordionItem: HTMLElement): Promise<void> {
  const { panel, content, button } = getAccordionElements(accordionItem);

  maybePauseAnimation(panel);
  panel.removeAttribute('hidden');
  await waitFrame();

  accordionItem.style.setProperty('--_panelH', `${content.offsetHeight}px`);
  await waitFrame();

  accordionItem.setAttribute('data-opened', '');
  button.setAttribute('aria-expanded', 'true');

  const status = await waitAnimation(panel);

  if ('canceled' !== status) {
    accordionItem.style.removeProperty('--_panelH');
  }
}

async function closeAccordion(accordionItem: HTMLElement): Promise<void> {
  const { panel, button } = getAccordionElements(accordionItem);

  maybePauseAnimation(panel);
  accordionItem.style.setProperty('--_panelH', `${panel.offsetHeight}px`);
  await waitFrame();

  accordionItem.removeAttribute('data-opened');
  button.setAttribute('aria-expanded', 'false');
  accordionItem.style.removeProperty('--_panelH');

  const status = await waitAnimation(panel);

  if ('canceled' !== status) {
    panel.setAttribute('hidden', ACCORDION_HIDDEN_VALUE);
  }
}

function toggleAccordion(accordionItem: HTMLElement): void {
  if (accordionItem.hasAttribute('data-opened')) {
    void closeAccordion(accordionItem);
  } else {
    maybeCloseOpenedItems(accordionItem);
    void openAccordion(accordionItem);
  }
}

// イベント登録済みのアイテム。再初期化で重ねて登録しないよう記録する。
const registeredItems = new WeakSet<HTMLElement>();

/**
 * 個別のアコーディオンにイベントをセット（React用にクリーンアップ関数を返す）
 */
export const setEvent = (accordionItem: HTMLElement): (() => void) => {
  if (registeredItems.has(accordionItem)) return () => undefined;

  const { button, panel } = getAccordionElements(accordionItem);
  registeredItems.add(accordionItem);

  if (panel.hasAttribute('hidden')) {
    ACCORDION_HIDDEN_VALUE = panel.getAttribute('hidden') ?? 'until-found';
  }

  const _clickEvent = (e: Event): void => {
    e.preventDefault();
    toggleAccordion(accordionItem);
  };

  const _beforematchEvent = (e: Event): void => {
    e.preventDefault();
    toggleAccordion(accordionItem);
  };

  button.addEventListener('click', _clickEvent);
  panel.addEventListener('beforematch', _beforematchEvent);

  return () => {
    button.removeEventListener('click', _clickEvent);
    panel.removeEventListener('beforematch', _beforematchEvent);
    // 解除後は再登録できるよう記録も消す（ReactのStrictModeは「登録→解除→登録」の順に呼ぶ）
    registeredItems.delete(accordionItem);
  };
};

/**
 * ページ内の全アコーディオンにイベントをセット
 */
const setAccordion = (): void => {
  const accordionAll = document.querySelectorAll<HTMLElement>('.b--accordion_item');
  accordionAll.forEach((accordionItem) => {
    setEvent(accordionItem);
  });
};

/**
 * ページ内の全アコーディオンを初期化する（Astro用）
 *   Point: ClientRouterでの遷移後は script が再実行されないため、astro:page-load でも初期化する。
 *          ClientRouterが無いページでは astro:page-load が発火しないため、すぐ初期化する処理も必要。
 */
export const setAccordionForAstro = (): void => {
  setAccordion();
  document.addEventListener('astro:page-load', setAccordion);
};

export default setAccordion;
