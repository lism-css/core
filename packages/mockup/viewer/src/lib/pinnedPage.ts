import type { ViewerPage } from 'virtual:lism-mockup/pages';

/**
 * Page id the viewer pins next to its own screens.
 *
 * `pages/components.jsx` (the UI parts index) documents the mockup instead of
 * being one of its screens, so it is lifted out of the sidebar groups and the
 * gallery and shown in its own group below the token list. A mockup without it
 * gets no entry.
 */
export const PINNED_PAGE_ID = 'components';

/** Fixed by the viewer: any `label` / `category` / `order` written for the pinned page in `mockup.config.json` is ignored (see `splitPinnedPage()`). */
const PINNED_PAGE_LABEL = 'UI Parts';

export interface SplitPages {
  all: ViewerPage[];
  pinned: ViewerPage | null;
  screens: ViewerPage[];
}

/** Separates the pinned page from the mockup's own screens. */
export function splitPinnedPage(pages: ViewerPage[]): SplitPages {
  // The viewer decides where the pinned page goes, so its own `category` is dropped
  // along with the label being fixed: whatever `mockup.config.json` says about it, it
  // can never end up in a category group. (`order` never reaches the viewer — the CLI
  // only uses it to sort `pages`, and the pinned page is lifted out of that list here.)
  const all = pages.map((page) => (page.id === PINNED_PAGE_ID ? { ...page, label: PINNED_PAGE_LABEL, category: undefined } : page));

  return {
    all,
    pinned: all.find((page) => page.id === PINNED_PAGE_ID) ?? null,
    screens: all.filter((page) => page.id !== PINNED_PAGE_ID),
  };
}
