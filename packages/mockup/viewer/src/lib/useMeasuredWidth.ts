import { useEffect, useRef, useState, type RefObject } from 'react';

/** Attach `ref` to the element to measure (`forwardedRef` on Lism components). `width` is its content width in px, `0` until the first observation. */
export interface MeasuredWidth<T extends Element> {
  ref: RefObject<T | null>;
  width: number;
}

/**
 * Measures the content width of an element with a `ResizeObserver`.
 *
 * The gallery scales its previews by the ratio between the card and the fixed
 * embed width, and a card can be resized without the window changing (the
 * sidebar is toggleable), so the width has to be observed rather than derived
 * from the viewport.
 */
export function useMeasuredWidth<T extends Element = HTMLElement>(): MeasuredWidth<T> {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // `observe()` delivers the current size right away, so there is no need to
    // seed the state with a separate measurement.
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
