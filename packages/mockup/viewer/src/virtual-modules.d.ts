/**
 * Ambient declarations for the virtual modules that the `lism-mockup` vite plugins
 * supply to the bundled viewer.
 *
 * The viewer never reads the data directory directly: everything it knows about
 * a mockup comes through these modules.
 */

declare module 'virtual:lism-mockup/pages' {
  /** A single mockup page, ready to be rendered by the viewer. */
  export interface ViewerPage {
    /** Page id: path relative to `pages/` without extension (e.g. `admin/users`). */
    id: string;
    /** Display label (defaults to the page id on the CLI side). */
    label: string;
    /** Optional nav group. Pages without a category share a default group. */
    category?: string;
    /** Dynamic import of the page module. Its default export is the component. */
    load: () => Promise<{ default: import('react').ComponentType }>;
  }

  /** Pages in display order (`order` ascending, then id lexicographic). */
  export const pages: ViewerPage[];

  /** `title` from `mockup.config.json`. Undefined when the mockup does not set one. */
  export const title: string | undefined;
}

/** Token CSS generated from the mockup's `tokens.json`. Imported for its side effect. */
declare module 'virtual:lism-mockup/tokens.css';

declare module 'virtual:lism-mockup/tokens' {
  /** One resolved design token, mirroring what the generated token CSS declares. */
  export interface ViewerToken {
    /** Token key inside its group (e.g. `brand`, `20`). */
    key: string;
    /** CSS custom property name (e.g. `--brand`). */
    varName: string;
    /** Value as it appears in the generated token CSS (numbers are stringified). */
    value: string;
    /** How the mockup's `tokens.json` affected this token. */
    source: 'default' | 'overridden' | 'custom';
  }

  /**
   * One section of the tokens view (e.g. `color`, `color (dark)`).
   *
   * A dark section is a section of its own, so a group can appear twice: `id` is
   * what tells the two apart, while `group` stays the token group both list.
   */
  export interface ViewerTokenGroup {
    /** Unique key of the section: DOM id source and React key (e.g. `color`, `color--dark`). */
    id: string;
    /** Token group the section lists, which also picks the preview shape (e.g. `color`). */
    group: string;
    /** Heading text (e.g. `color`, `color (dark)`). */
    label: string;
    /** Whether the section lists the dark values, and must render inside the dark scope. */
    isDark?: boolean;
    /**
     * Custom property prefix shared by the group's tokens (`--fz--`; `--s` for
     * `space`, `--` for the color groups). Shown once next to the heading, so
     * the rows list keys only. Empty when the keys are full var names already.
     */
    varPrefix: string;
    /**
     * Structural variables (from the `vars` group) that the group's values are
     * computed from — `--L` for the palette, `--fz-mol` for `fz`. Their keys are
     * the full var names. Shown on a compact line above the token list, not as
     * rows of it.
     */
    structuralVars?: ViewerToken[];
    tokens: ViewerToken[];
  }

  /**
   * Sections in merged-config order, holding every token the viewer's CSS actually
   * defines. Keys whose value is the `'-'` sentinel (or empty) are omitted, the
   * same rule the token CSS generation applies. A group whose values the mockup's
   * `tokens.dark.json` changes is followed by its dark section.
   */
  export const tokenGroups: ViewerTokenGroup[];

  /** Scope class the dark token CSS declares (`set--dark`). */
  export const darkScopeClass: string;
}

/** Plain CSS imports (`lism-css/main.css`, local files). */
declare module '*.css';
