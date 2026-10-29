/*
 * Viewer shell and view switching.
 *
 * The URL decides what is on screen (see lib/useViewerRoute):
 *   - gallery (no parameters) … every screen at once, one iframe each
 *   - `?view=tokens`          … the generated token list
 *   - `?page=<id>`            … one page, full size, inside the shell
 *   - `?page=<id>&embed=1`    … the same page with no shell at all
 *
 * The gallery has to go through iframes because mockup pages are authored as full
 * pages: they own the viewport with `position: fixed` bars and `100dvh` sections,
 * so several of them cannot share one document. An iframe gives each page the
 * isolated viewport it expects, and the embed mode above is what it loads.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Flex, Group } from 'lism-css/react';
import { pages, title } from 'virtual:lism-mockup/pages';

import EmptyState from './components/EmptyState';
import GalleryView from './components/GalleryView';
import PageView from './components/PageView';
import TokensView, { TOKENS_VIEW_LABEL } from './components/TokensView';
import ViewerNav from './components/ViewerNav';
import { groupPages } from './lib/groupPages';
import { splitPinnedPage } from './lib/pinnedPage';
import { useViewerRoute } from './lib/useViewerRoute';

const DEFAULT_TITLE = 'Lism Mockup';

/** Id used to wire the sidebar's collapse / expand buttons to it (`aria-controls`). */
const NAV_ID = 'mockupViewerNav';

// The pinned page documents the mockup instead of being one of its screens, so it
// gets its own nav entry and stays out of the gallery. It is still a normal page
// otherwise: `?page=` opens it like any other. `pages` is a build-time constant,
// so splitting it once here also keeps the page identities stable across renders.
const { all: allPages, pinned: pinnedPage, screens } = splitPinnedPage(pages);

// The sidebar and the gallery show the same categories, so the grouping is done
// here once rather than by each of them on every render.
const pageGroups = groupPages(screens);

export default function App() {
  const viewerTitle = title?.trim() ? title : DEFAULT_TITLE;

  const { route, openPage, openGallery, openTokens } = useViewerRoute();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const mainRef = useRef<HTMLElement>(null);

  // `find` returns the element from `allPages`, so the identity stays stable across
  // renders and can safely be used as an effect dependency.
  const currentPage = route.view === 'page' ? (allPages.find((page) => page.id === route.pageId) ?? null) : null;

  useEffect(() => {
    if (route.view === 'tokens') {
      document.title = `${TOKENS_VIEW_LABEL} | ${viewerTitle}`;
      return;
    }
    document.title = currentPage ? `${currentPage.label} | ${viewerTitle}` : viewerTitle;
  }, [route.view, currentPage, viewerTitle]);

  useEffect(() => {
    // The same <main> stays mounted across views, so its scroll position would
    // otherwise carry over from the previous screen.
    mainRef.current?.scrollTo({ top: 0 });
  }, [route]);

  // Embedded mode (see the header): no shell, so the page owns the viewport
  // inside the iframe.
  if (route.view === 'page' && route.embed) {
    return currentPage ? <PageView page={currentPage} /> : <EmptyState pages={allPages} requestedPageId={route.pageId} />;
  }

  const renderMain = (): ReactNode => {
    if (route.view === 'tokens') return <TokensView />;
    // With no pages there is nothing to put in the gallery, so the hint that
    // explains how to add one takes its place.
    if (route.view === 'gallery') {
      return screens.length > 0 ? <GalleryView groups={pageGroups} onOpenPage={openPage} /> : <EmptyState pages={screens} requestedPageId={null} />;
    }
    return currentPage ? <PageView page={currentPage} /> : <EmptyState pages={allPages} requestedPageId={route.pageId} />;
  };

  return (
    // The shell owns the viewport: the sidebar stays put while only the page area
    // scrolls. `is--container` is deliberately NOT used anywhere above the page
    // area, because `container-type` would become a containing block for a
    // mockup's `position: fixed` elements.
    // `100dvh` matches the `min-height: 100dvh` the base styles put on <body>,
    // so the document itself never gains a second scrollbar.
    <Flex className="z--mockupViewer" h="100dvh" ov="hidden">
      {/* Collapses into an icon rail instead of unmounting, so `aria-controls`
          stays valid and the primary links stay reachable. */}
      <ViewerNav
        id={NAV_ID}
        title={viewerTitle}
        isOpen={isNavOpen}
        onToggle={() => setIsNavOpen((open) => !open)}
        groups={pageGroups}
        pinnedPage={pinnedPage}
        route={route}
        onOpenGallery={openGallery}
        onOpenTokens={openTokens}
        onOpenPage={openPage}
      />
      {/* No padding / background here: the mockup page must look exactly as authored. */}
      <Group as="main" forwardedRef={mainRef} className="z--mockupViewerMain" pos="relative" fxg="1" ov-y="auto">
        {renderMain()}
      </Group>
    </Flex>
  );
}
