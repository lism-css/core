import type { ReactNode } from 'react';
import { Box, Flex, Inline } from 'lism-css/react';

/**
 * Previews use the token's Property Class where one exists; the rest read `var(--x)`
 * directly, so every shape reflects the actual custom property, including runtime overrides.
 */
interface PreviewSpec {
  /**
   * Where the preview goes.
   * - `column` … the first column of the row, which the group's rows share
   *   through `subgrid`, so the previews line up and can be compared at a
   *   glance. The column is as wide as the widest preview in the group — no
   *   preview declares a width of its own.
   * - `block` … a full-width band under the row, for previews too wide for a
   *   column. Nothing lines up, but the token is shown at its real size.
   */
  placement?: 'column' | 'block';
  /** Cap for a preview whose natural width (e.g. the largest font sizes) would stretch the shared column too far. */
  maxWidth?: string;
  /**
   * Set when the preview column is wide enough to crowd the rest of the row.
   * Those rows wait for `md` before they line their cells up in columns, while
   * every other group manages from `sm`.
   */
  isWide?: boolean;
  /** Overflow behavior for previews whose content can exceed the column. */
  overflow?: 'clip';
  /** Shown next to the group heading when the preview needs a caveat. */
  note?: string;
  render: (tokenKey: string, varName: string) => ReactNode;
}

const SAMPLE_WORDS = ['Text', '文章'] as const;
const INLINE_SAMPLE = 'Text';

/** Colors are the one group whose value is worth showing as a filled square. */
const SWATCH: PreviewSpec = {
  // Bordered, because a swatch matching the page background would be invisible.
  render: (_tokenKey, varName) => <Box w="2em" ar="1/1" bgc={`var(${varName})`} bd bdrs="10" />,
};

/** Bar used by the length-based groups. Longer bar = bigger token. */
function Bar({ length }: { length: string }) {
  return <Box sz={length} max-w="100%" h="0.5rem" bgc="text" bdrs="99" />;
}

const PREVIEWS = new Map<string, PreviewSpec>([
  ['color', SWATCH],
  ['palette', SWATCH],

  [
    'fz',
    {
      maxWidth: '5rem',
      overflow: 'clip',
      // Font sizes are `em`-based, so this resolves against the row's own font
      // size — the same base the page text has.
      render: (tokenKey) => (
        <Inline fz={tokenKey} whs="nowrap">
          Aa
        </Inline>
      ),
    },
  ],
  [
    'ff',
    {
      render: (tokenKey) => (
        <Inline ff={tokenKey} whs="nowrap">
          {INLINE_SAMPLE}
        </Inline>
      ),
    },
  ],
  [
    'fw',
    {
      render: (tokenKey) => (
        <Inline fw={tokenKey} whs="nowrap">
          {INLINE_SAMPLE}
        </Inline>
      ),
    },
  ],
  [
    'lts',
    {
      render: (tokenKey) => (
        <Inline lts={tokenKey} whs="nowrap">
          {INLINE_SAMPLE}
        </Inline>
      ),
    },
  ],
  [
    'hl',
    {
      // The half-leading *is* the block height here: `* { line-height: calc(1em
      // + var(--hl) * 2) }`, so filling the background makes the token visible.
      render: (tokenKey) => (
        <Box hl={tokenKey} fz="xs" bgc="base-2" bdrs="10">
          {SAMPLE_WORDS[0]}
          <br />
          {SAMPLE_WORDS[1]}
        </Box>
      ),
    },
  ],
  [
    'o',
    {
      render: (tokenKey) => (
        <Inline o={tokenKey} d="inline-flex" g="5" whs="nowrap">
          <Inline w="1em" bgc="currentColor" bdrs="10" /> {SAMPLE_WORDS[0]}
        </Inline>
      ),
    },
  ],
  [
    'bdrs',
    {
      render: (tokenKey) => <Box w="3.5em" ar="1/1" bgc="base-2" bd bdrs={tokenKey} />,
    },
  ],
  [
    'bxsh',
    {
      // Drawn on the page background so the shadow is the only thing separating
      // the square from it.
      render: (tokenKey) => <Box w="3.5em" ar="1/1" bgc="base" bdrs="20" bxsh={tokenKey} />,
    },
  ],
  [
    'space',
    {
      // The bars run to `--s70` (168px), which leaves the value nowhere to go
      // until the row is a good deal wider than the other groups need.
      isWide: true,
      render: (_tokenKey, varName) => <Bar length={`var(${varName})`} />,
    },
  ],
  [
    'sz',
    {
      // Content sizes run to 1600px, so they get the whole row width and are
      // still shown at their real size — comparing them side by side in a
      // column would mean scaling them down to something that is not the token.
      placement: 'block',
      note: 'shown at full size, cut off at the view width',
      render: (_tokenKey, varName) => <Bar length={`var(${varName})`} />,
    },
  ],
  [
    'ar',
    {
      render: (tokenKey) => <Box h="2.5em" ar={tokenKey} bgc="base-2" bd bdrs="10" />,
    },
  ],
]);

export interface TokenGroupLayout {
  note?: string;
  isBlock: boolean;
  isWide: boolean;
}

/**
 * How a group's rows have to be laid out around its preview.
 *
 * A group with no preview gets the plain column layout, where `TokenPreview`
 * renders nothing at all.
 */
export function tokenGroupLayout(group: string): TokenGroupLayout {
  const spec = PREVIEWS.get(group);
  return { note: spec?.note, isBlock: spec?.placement === 'block', isWide: spec?.isWide ?? false };
}

interface TokenPreviewProps {
  group: string;
  tokenKey: string;
  varName: string;
  ga?: string;
}

/**
 * Preview of one token.
 *
 * Groups with no preview shape render nothing, so a token group added to
 * lism-css later still lists correctly — just without a picture.
 */
export default function TokenPreview({ group, tokenKey, varName, ga }: TokenPreviewProps) {
  const spec = PREVIEWS.get(group);
  if (!spec) return null;

  const isBlock = spec.placement === 'block';

  return (
    // Decorative: the key, the custom property and the value next to it already
    // say everything the preview shows.
    <Flex
      aria-hidden="true"
      ga={ga}
      fxsh={isBlock ? '0' : undefined}
      ai="center"
      w={isBlock ? '100%' : undefined}
      max-w={spec.maxWidth}
      min-h="1.5em"
      ov={spec.overflow}
    >
      {spec.render(tokenKey, varName)}
    </Flex>
  );
}
