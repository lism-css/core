import { useEffect, useState } from 'react';

/**
 * Where the "currently read" line sits, as a percentage of the scroll area's
 * height. A section becomes current once its top edge has passed this line.
 */
const READING_LINE_PERCENT = 30;

/**
 * How far a band reaches past the scroll area, in px.
 *
 * An entry is only delivered when a section enters or leaves a band, so a band
 * that ended near the content could be jumped over within one frame (Home / End,
 * a long smooth scroll) and the crossing missed. Both bands are therefore
 * open-ended on the side the sections come from.
 * That makes them an overshoot, not a true half-plane: "not intersecting" alone
 * does not say which side the section is on. Only the end band needs to know, so
 * it reads the side off the entry's geometry (see `endObserver`).
 */
const BAND_OVERSHOOT = '100000px';

/**
 * Everything above the reading line. A section intersects this band exactly
 * while its top edge is above the line, so `isIntersecting` is the answer to
 * "has this section started?" without measuring anything.
 */
const READING_BAND_MARGIN = `${BAND_OVERSHOOT} 0px -${100 - READING_LINE_PERCENT}% 0px`;

/**
 * Everything below the scroll area. `-100%` pulls the top edge down onto the
 * bottom of the scroll area, so a section intersects this band exactly while its
 * bottom edge is still out of sight — leaving it means the end is on screen.
 */
const END_BAND_MARGIN = `-100% 0px ${BAND_OVERSHOOT} 0px`;

/**
 * The element the sections scroll inside, which is the `root` both observers get.
 *
 * The viewer scrolls a `<main>` within a fixed-height shell rather than the
 * document itself. With the implicit (viewport) root, every measurement would be
 * clipped by that `<main>`, so the band below it — the one the last section
 * relies on — could never be reached. Looking the container up from the section
 * keeps this hook free of any knowledge about the viewer's layout.
 *
 * `null` means "no scroll container above": then the document itself scrolls and
 * the implicit root is the right one.
 */
function findScrollRoot(element: Element): Element | null {
  for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') return parent;
  }
  return null;
}

/**
 * Tracks which of the given sections the reader is on.
 *
 * `ids` must be a stable array (a module constant or a memoized value): it is
 * the effect's dependency, so a new array on every render would re-subscribe
 * every render.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (ids.length === 0) {
      setActiveId(null);
      return;
    }

    // Which sections have started, keyed by id. Only the observers write here,
    // and each entry already carries the geometry, so no layout is ever forced.
    const hasStarted = new Map<string, boolean>();
    let isEndOnScreen = false;

    const update = () => {
      // The current section is the last one that started above the reading
      // line. Before the first one reaches it, the first section stays current.
      let current = ids[0];
      for (const id of ids) {
        if (hasStarted.get(id) === true) current = id;
      }

      // The last section can be too short to ever reach the reading line, so it
      // also counts as current once its end is on screen.
      if (isEndOnScreen) current = ids[ids.length - 1];

      setActiveId(current ?? null);
    };

    // An id whose section is not in the document is skipped rather than treated
    // as a section at the top of the page: the caller lists the sections it
    // renders, and one of them may simply not be mounted.
    const sections = ids.map((id) => document.getElementById(id)).filter((section) => section !== null);
    if (sections.length === 0) {
      update();
      return;
    }

    const root = findScrollRoot(sections[0]);

    const readingObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          hasStarted.set(entry.target.id, entry.isIntersecting);
        }
        update();
      },
      { root, rootMargin: READING_BAND_MARGIN }
    );
    for (const section of sections) readingObserver.observe(section);

    // The rule above is about the last id, not about the last *rendered*
    // section: if that id has no element, the rule simply does not apply.
    const endSection = document.getElementById(ids[ids.length - 1]);
    const endObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!entry) return;
        // Leaving the band means the end is on screen only when the section left
        // it upwards. A section further below than the band reaches is also
        // reported as not intersecting, so the side has to be read off the
        // geometry the entry already carries (no layout is forced by this).
        // `rootBounds` is null only when the root is unreachable, in which case
        // there is nothing sensible to compare against and the end is not on screen.
        isEndOnScreen = !entry.isIntersecting && entry.rootBounds !== null && entry.boundingClientRect.bottom <= entry.rootBounds.top;
        update();
      },
      { root, rootMargin: END_BAND_MARGIN }
    );
    if (endSection !== null) endObserver.observe(endSection);

    // Both observers report the state of every section they watch as soon as
    // they start, so there is nothing to seed by hand, and they keep reporting
    // on resize and reflow as well — no scroll or resize listener needed.
    return () => {
      readingObserver.disconnect();
      endObserver.disconnect();
    };
  }, [ids]);

  return activeId;
}
