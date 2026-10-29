import type { MouseEvent } from 'react';
import { AutoColumns, Box, Flex, Heading, Inline, Layer, Stack } from 'lism-css/react';
import type { ViewerPage } from 'virtual:lism-mockup/pages';

import type { PageGroup } from '../lib/groupPages';
import { isModifiedClick } from '../lib/isModifiedClick';
import { useMeasuredWidth } from '../lib/useMeasuredWidth';
import { buildEmbedSrc, buildPageHref } from '../lib/useViewerRoute';

/**
 * Viewport the preview is laid out at before it is scaled down.
 *
 * Mockup pages are authored for a desktop viewport, so the iframe has to keep a
 * desktop-sized layout viewport: shrinking the iframe itself would make every
 * page switch to its narrow layout instead of showing the design being reviewed.
 */
const EMBED_WIDTH = 1280;
const EMBED_HEIGHT = 800;

/** Width a card keeps before the grid drops a column. */
const CARD_MIN_WIDTH = '280px';

interface GalleryViewProps {
  /** The mockup's own screens by category. The pinned page is not one of them — see `lib/pinnedPage`. */
  groups: PageGroup[];
  /** Opens the single page view — the same destination the card links point at. */
  onOpenPage: (pageId: string) => void;
}

/** Default view: every page side by side, each inside its own iframe (why: see `App.tsx`). */
export default function GalleryView({ groups, onOpenPage }: GalleryViewProps) {
  return (
    <Stack p="30" g="40">
      {groups.map((group) => (
        <Stack key={group.key} as="section" g="20">
          <Heading level="2" fz="xs" fw="bold" c="text-2" tt="uppercase" lts="l">
            {group.label}
          </Heading>
          {/* Breakpoint-free grid: the sidebar can be toggled, so the space the
              cards get changes without the viewport changing. */}
          <AutoColumns cols={CARD_MIN_WIDTH} g="30">
            {group.pages.map((page) => (
              <GalleryCard key={page.id} page={page} onOpenPage={onOpenPage} />
            ))}
          </AutoColumns>
        </Stack>
      ))}
    </Stack>
  );
}

interface GalleryCardProps {
  page: ViewerPage;
  onOpenPage: (pageId: string) => void;
}

function GalleryCard({ page, onOpenPage }: GalleryCardProps) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const href = buildPageHref(page.id);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    onOpenPage(page.id);
  };

  return (
    <Stack g="10">
      <Flex as="a" href={href} onClick={handleClick} ai="baseline" g="10" fxw="wrap" fz="s" fw="bold" td="none" hov="underline" ovw="anywhere">
        {page.label}
        <Inline fz="2xs" fw="normal" c="text-2" ff="mono">
          {page.id}
        </Inline>
      </Flex>
      {/* `l--frame` is deliberately not used here: it stretches its direct media
          child to the box size, which is exactly what the scaled preview must not
          do. The wrapper only provides the clipped, correctly proportioned area. */}
      <Box forwardedRef={ref} pos="relative" ar={`${EMBED_WIDTH}/${EMBED_HEIGHT}`} ov="hidden" bgc="base" bd bdrs="20">
        {/* Rendering before the width is known would load the page at the wrong
            scale, so the iframe waits for the first measurement. */}
        {width > 0 && (
          <iframe
            src={buildEmbedSrc(page.id)}
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
            style={{
              display: 'block',
              width: EMBED_WIDTH,
              height: EMBED_HEIGHT,
              // The base reset caps media at `max-inline-size: 100%`, which would
              // shrink the layout viewport instead of scaling the rendered page.
              maxInlineSize: 'none',
              transform: `scale(${width / EMBED_WIDTH})`,
              transformOrigin: 'top left',
              // Input must never reach the embedded document: this is a picture
              // of the page, not a usable copy of it.
              pointerEvents: 'none',
            }}
          />
        )}
        {/* Transparent hit area, so the whole preview opens the page. It is kept
            out of the tab order and of the a11y tree because the label above
            already exposes the same destination. Overlaying instead of wrapping
            the iframe also keeps the markup valid (`<a>` takes no iframe). */}
        <Layer as="a" href={href} onClick={handleClick} tabIndex={-1} aria-hidden="true" />
      </Box>
    </Stack>
  );
}
