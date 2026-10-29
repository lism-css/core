import type { ViewerPage } from 'virtual:lism-mockup/pages';

export interface PageGroup {
  key: string;
  label: string;
  pages: ViewerPage[];
}

const DEFAULT_GROUP_KEY = '__lism-mockup:default__';
const DEFAULT_GROUP_LABEL = 'Pages';

/**
 * Groups pages by `category`, keeping the incoming order.
 *
 * `pages` arrives already sorted for display (order ascending, then id), so
 * relying on insertion order keeps `mockup.config.json`'s `order` meaningful both
 * between and inside groups. Pages without a category share one default group.
 */
export function groupPages(pages: ViewerPage[]): PageGroup[] {
  const groups = new Map<string, PageGroup>();

  for (const page of pages) {
    const category = page.category?.trim();
    const key = category ? category : DEFAULT_GROUP_KEY;

    const existing = groups.get(key);
    if (existing) {
      existing.pages.push(page);
      continue;
    }

    groups.set(key, {
      key,
      label: category ? category : DEFAULT_GROUP_LABEL,
      pages: [page],
    });
  }

  return [...groups.values()];
}
