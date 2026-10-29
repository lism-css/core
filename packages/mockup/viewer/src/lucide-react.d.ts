/**
 * Ambient declaration for `lucide-react`, for the bundled viewer only.
 *
 * The CLI resolves `lucide-react` to a virtual module instead of the real package (see
 * `src/vite/lucide-icons.ts`), so there is no package on disk to read types from.
 *
 * The declarations users get are generated from that same icon data
 * (`src/vite/lucide-types.ts` → `types/lucide-react.d.ts`), which is where the full,
 * always-current list of ~4,000 icon names lives. This file is not that list: the viewer
 * is type-checked before the package is built, so it cannot depend on a build artefact.
 * It only has to cover what the viewer itself imports — when a viewer component starts
 * using another icon, add one line below and the compiler points straight at the name.
 */
declare module 'lucide-react' {
  import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react';

  /** Props every icon accepts: any SVG attribute plus lucide's own sizing props. */
  export interface LucideProps extends Partial<SVGProps<SVGSVGElement>> {
    /** Rendered as both `width` and `height`. Defaults to `24`. */
    size?: string | number;
    /** Shorthand for the `stroke` attribute. Defaults to `currentColor`. */
    color?: string;
    /** Keeps the stroke visually the same thickness when `size` changes. */
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

  /** Icons the bundled viewer imports. */
  export const ChevronsLeftIcon: LucideIcon;
  export const ChevronsRightIcon: LucideIcon;
  export const ComponentIcon: LucideIcon;
  export const GalleryVerticalEndIcon: LucideIcon;
  export const PaletteIcon: LucideIcon;
}
