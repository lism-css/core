import { useEffect, useState } from 'react';

export const PAGE_QUERY_KEY = 'page';
export const VIEW_QUERY_KEY = 'view';
export const EMBED_QUERY_KEY = 'embed';

/** `?view=` value of the token list. Pages are addressed with `?page=` instead. */
const TOKENS_VIEW_VALUE = 'tokens';

const EMBED_ON_VALUE = '1';

/**
 * What the viewer currently shows.
 *
 * `embed` only exists on the page route: it is the mode the gallery loads inside
 * its iframes, where the page must own the whole viewport again.
 */
export type ViewerRoute = { view: 'gallery' } | { view: 'tokens' } | { view: 'page'; pageId: string; embed: boolean };

export function readRouteFromUrl(): ViewerRoute {
  const params = new URLSearchParams(window.location.search);

  // `?page=` wins over `?view=`: a page is always addressed by its id, so an
  // unknown `?view=` value next to it must not hide the page.
  const pageId = params.get(PAGE_QUERY_KEY);
  if (pageId !== null) {
    return { view: 'page', pageId, embed: params.get(EMBED_QUERY_KEY) === EMBED_ON_VALUE };
  }

  return params.get(VIEW_QUERY_KEY) === TOKENS_VIEW_VALUE ? { view: 'tokens' } : { view: 'gallery' };
}

/**
 * Builds a same-document URL from the current one.
 *
 * Everything the route does not own (pathname, hash, unrelated query parameters)
 * is kept, so the viewer can be served from any path.
 */
function buildHref(update: (params: URLSearchParams) => void): string {
  const url = new URL(window.location.href);
  update(url.searchParams);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildPageHref(pageId: string): string {
  return buildHref((params) => {
    params.set(PAGE_QUERY_KEY, pageId);
    params.delete(VIEW_QUERY_KEY);
    params.delete(EMBED_QUERY_KEY);
  });
}

export function buildGalleryHref(): string {
  return buildHref((params) => {
    params.delete(PAGE_QUERY_KEY);
    params.delete(EMBED_QUERY_KEY);
    params.delete(VIEW_QUERY_KEY);
  });
}

export function buildTokensHref(): string {
  return buildHref((params) => {
    params.set(VIEW_QUERY_KEY, TOKENS_VIEW_VALUE);
    params.delete(PAGE_QUERY_KEY);
    params.delete(EMBED_QUERY_KEY);
  });
}

export function buildEmbedSrc(pageId: string): string {
  return buildHref((params) => {
    params.set(PAGE_QUERY_KEY, pageId);
    params.set(EMBED_QUERY_KEY, EMBED_ON_VALUE);
    params.delete(VIEW_QUERY_KEY);
  });
}

export interface ViewerRouteState {
  route: ViewerRoute;
  openPage: (pageId: string) => void;
  openGallery: () => void;
  openTokens: () => void;
}

/**
 * Keeps the displayed view in sync with the URL.
 *
 * - Navigating pushes a history entry, so every screen has a shareable URL.
 * - `popstate` (Back / Forward) re-reads the URL instead of keeping local state.
 * - A URL without parameters already is the gallery, so nothing is ever rewritten
 *   with `replaceState`. An unknown page id is left untouched as well, so typos
 *   stay visible to the user instead of silently redirecting.
 */
export function useViewerRoute(): ViewerRouteState {
  const [route, setRoute] = useState<ViewerRoute>(readRouteFromUrl);

  useEffect(() => {
    const handlePopState = () => setRoute(readRouteFromUrl());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Plain functions, not `useCallback`: these are only ever passed to components
  // that render with their parent anyway (none of them is memoized) and none of
  // them is a dependency of an effect, so a stable identity would buy nothing.
  const navigate = (href: string) => {
    // Re-selecting the current screen must not stack duplicate history entries.
    if (href === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;

    window.history.pushState(null, '', href);
    setRoute(readRouteFromUrl());
  };

  const openPage = (pageId: string) => navigate(buildPageHref(pageId));
  const openGallery = () => navigate(buildGalleryHref());
  const openTokens = () => navigate(buildTokensHref());

  return { route, openPage, openGallery, openTokens };
}
