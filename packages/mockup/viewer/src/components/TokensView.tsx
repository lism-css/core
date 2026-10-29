import { Flex, Grid, Heading, Inline, Stack, Text } from 'lism-css/react';
import { Badge } from '@lism-css/ui/react/Badge';
import { darkScopeClass, tokenGroups, type ViewerToken, type ViewerTokenGroup } from 'virtual:lism-mockup/tokens';

import { useActiveSection } from '../lib/useActiveSection';
import TokenOutline, { type OutlineItem } from './TokenOutline';
import TokenPreview, { tokenGroupLayout } from './TokenPreview';

/** Label of this view. Shared with the header, the nav and `document.title`. */
export const TOKENS_VIEW_LABEL = 'Design tokens';

/** Short badge text for the tokens the mockup's `tokens.json` touched. */
const SOURCE_LABELS: Record<Exclude<ViewerToken['source'], 'default'>, string> = {
  overridden: 'Custom',
  custom: 'New',
};

/**
 * DOM id of a section: the outline's scroll target.
 *
 * Built from the section id, not from its heading: a dark section's label
 * (`color (dark)`) carries spaces and brackets, which an id must not.
 */
const sectionId = (id: string) => `tokenGroup-${id}`;

/**
 * Column tracks of a group's rows.
 *
 * `TABLE` is preview (spanning two tracks) / name (+ badge) / value on one
 * line. `STACKED` keeps two tracks and two rows: the preview spans the first
 * row, then the name and value share the second. Which breakpoint swaps one
 * for the other depends on the group: a wide preview only leaves room for the
 * full table from `md`, everything else manages from `sm`. Responsive
 * positions are `[base, sm, md]`, so the wide variant skips `sm` with a
 * `null`.
 *
 * The var name is not a column: it is the group's `varPrefix` plus the key, and
 * the prefix is shown once next to the heading instead of on every row.
 */
const STACKED_COLUMNS = '1fr 1fr';
const TABLE_COLUMNS = 'minmax(max-content, 20%) 1fr minmax(max-content, 20%) minmax(12rem, 25%)';
const STACKED_AREAS = `'preview preview' 'name value'`;
const TABLE_AREAS = `'preview preview name value'`;

/**
 * Column tracks of a group whose keys are already the custom property names.
 *
 * Those rows only carry a name and a value, and there is no preview to line up,
 * so the two columns hold at any width — no responsive variant is needed.
 */
const VAR_ONLY_COLUMNS = 'minmax(max-content, 30%) auto';

/**
 * Outline entries, one per section. Built once at module scope: `tokenGroups` is
 * a constant of the generated module, and `useActiveSection` needs a stable
 * array of ids. Dark sections are entries of their own, so they need no extra
 * handling here — they are already in `tokenGroups`, right after the group they
 * mirror.
 */
const OUTLINE_ITEMS: OutlineItem[] = tokenGroups.map((section) => ({ label: section.label, id: sectionId(section.id) }));
const SECTION_IDS = OUTLINE_ITEMS.map((item) => item.id);

/**
 * Lists every design token the viewer's CSS defines.
 *
 * The data comes from `virtual:lism-mockup/tokens`, which the CLI builds from the
 * very same merged config as the token CSS, so the list cannot drift from what
 * the pages actually use.
 */
export default function TokensView() {
  return (
    <>
      {/* `is--wrapper` keeps the rows at a readable measure (its default
          `--contentSize` is already `--sz--m`) instead of letting them stretch
          across a wide screen. The end padding is wider than the start one
          because that is where the floating outline sits. */}
      <Stack isWrapper py="30" ps="30" pe="50" g="40">
        <Stack g="10">
          <Heading level="2" fz="l">
            {TOKENS_VIEW_LABEL}
          </Heading>
          <Text fz="s" c="text-2">
            Every token the viewer defines, including the ones this mockup overrides or adds in <Inline as="code">tokens.json</Inline>. A{' '}
            <Inline as="code">(dark)</Inline> section lists what <Inline as="code">tokens.dark.json</Inline> changes, shown inside the dark scope.
          </Text>
        </Stack>
        {tokenGroups.length === 0 ? (
          <Text fz="s" c="text-2">
            No tokens were found.
          </Text>
        ) : (
          tokenGroups.map((section) => <TokenGroupSection key={section.id} section={section} />)
        )}
      </Stack>
      <ScrollSpyOutline />
    </>
  );
}

/**
 * The outline, with the section tracking it needs.
 *
 * `useActiveSection` changes state on every section the reader passes, so it is
 * kept in this leaf: called from `TokensView`, every one of those changes would
 * re-render the whole token list — hundreds of rows — for a highlight that only
 * moves inside the outline. Both constants it needs are module scope, so nothing
 * has to be handed down for this to be a component of its own.
 */
function ScrollSpyOutline() {
  const activeId = useActiveSection(SECTION_IDS);

  return <TokenOutline items={OUTLINE_ITEMS} activeId={activeId} />;
}

interface TokenGroupSectionProps {
  section: ViewerTokenGroup;
}

function TokenGroupSection({ section }: TokenGroupSectionProps) {
  const { id, group, label, isDark = false, varPrefix, structuralVars = [], tokens } = section;
  // A group whose preview needs the whole row needs the whole view with it, so
  // it opts out of the wrapper's content size instead of being centred in it.
  // The shape is looked up by `group`, never by `label`: a dark section shows
  // the same tokens and has to get the same preview.
  const { note, isBlock: isBlockPreview, isWide } = tokenGroupLayout(group);

  // A group whose prefix is empty (the leftover `vars` section) has the custom
  // property name as its key, so its rows drop to name + value only. Checked on
  // the tokens themselves rather than on the group name, so a group named
  // differently but built the same way is laid out the same way. A group with a
  // block preview keeps the normal row: its rows are not in a grid at all, so
  // they have no columns to drop.
  const isVarOnly = !isBlockPreview && tokens.length > 0 && tokens.every((token) => token.key === token.varName);

  // The structural variables the group's values are computed from are knobs,
  // not tokens of the group, so they do not join the table: they sit on one
  // compact line of their own between the heading and the list.
  const structuralLine = structuralVars.length > 0 && (
    <Flex ai="baseline" cg="30" rg="5" fxw="wrap">
      {structuralVars.map((token) => (
        // The item itself wraps too, so on a tight viewport the badge drops
        // under the text instead of squeezing it into letter-per-line breaks.
        <Flex key={token.key} ai="center" g="0" fxw="wrap" min-w="0">
          <Inline as="code" fz="xs" ff="mono" ovw="anywhere">
            <Inline fw="bold">{token.key}</Inline>: {token.value}
          </Inline>
          {!isDark && <SourceBadge source={token.source} />}
        </Flex>
      ))}
    </Flex>
  );
  const rows = tokens.map((token) => (
    <TokenRow key={token.key} group={group} token={token} isBlockPreview={isBlockPreview} isVarOnly={isVarOnly} isWide={isWide} hasBadge={!isDark} />
  ));

  // The list is rendered inside the dark scope, not just labelled as dark:
  // a shadow or a swatch close to the base color can only be judged against the
  // background it will actually sit on. `bgc`/`c` resolve inside the scope, so
  // the box paints itself with the dark values the rows below describe.
  const listScope = isDark ? { className: darkScopeClass, bgc: 'base', c: 'text', p: '20', bdrs: '20' } : {};

  return (
    // The outline scrolls sections to the top edge, so they keep a little air
    // above them when it does.
    // `isContainer` is what makes the rows below responsive: `is--wrapper` caps
    // its children — this section — at `--sz--m`, so the section is exactly the
    // box the rows live in and its width is the one worth querying.
    <Stack as="section" id={sectionId(id)} isContainer max-sz={isBlockPreview ? 'full' : undefined} g="15" style={{ scrollMarginBlockStart: '1rem' }}>
      <Flex ai="baseline" g="10" fxw="wrap">
        <Heading level="3" fz="xs" fw="bold" c="text-2" tt="uppercase" lts="l">
          {label}
        </Heading>
        {/* Outside the heading: `tt="uppercase"` would distort the case-sensitive
            custom property prefix. */}
        {varPrefix && (
          <Text fz="2xs" c="text-2">
            (prefix:{' '}
            <Inline as="code" ff="mono">
              {varPrefix}
            </Inline>
            )
          </Text>
        )}
        {note && (
          <Text fz="2xs" c="text-2">
            {note}
          </Text>
        )}
      </Flex>
      {structuralLine}
      {isBlockPreview ? (
        <Stack as="ul" g="0" {...listScope}>
          {rows}
        </Stack>
      ) : (
        // The columns are declared once here and every row inherits them through
        // `subgrid`, so a column ends up exactly as wide as the widest cell of
        // the group and no preview has to hard-code a width to line up.
        <Grid
          as="ul"
          gtc={isVarOnly ? VAR_ONLY_COLUMNS : isWide ? [STACKED_COLUMNS, null, TABLE_COLUMNS] : [STACKED_COLUMNS, TABLE_COLUMNS]}
          cg="25"
          hl="s"
          {...listScope}
        >
          {rows}
        </Grid>
      )}
    </Stack>
  );
}

/**
 * Source badge for a token the mockup's `tokens.json` touched. The badge names
 * the token, not its value, so callers put it right after the name instead of
 * giving it a column of its own.
 */
function SourceBadge({ source }: { source: ViewerToken['source'] }) {
  if (source === 'default') return null;
  return (
    <Badge util="cbox" keycolor={source === 'custom' ? 'orange' : 'blue'} fz="10px" hl="0" fxsh="0" px="10" bdrs="99" ms="10">
      {SOURCE_LABELS[source]}
    </Badge>
  );
}

interface TokenRowProps {
  /** Decides which preview shape the row gets. */
  group: string;
  token: ViewerToken;
  /** Whether the preview takes a band under the row instead of a column beside it. */
  isBlockPreview: boolean;
  /** Whether the row shows the custom property name and the value only. */
  isVarOnly: boolean;
  /** Whether the group's table layout waits for `md` (see `STACKED_COLUMNS`). */
  isWide: boolean;
  /**
   * Whether the row may carry a source badge. A dark section is a list of
   * differences from the light theme by definition, so the same badge on every
   * row of it would say nothing.
   */
  hasBadge: boolean;
}

function TokenRow({ group, token, isBlockPreview, isVarOnly, isWide, hasBadge }: TokenRowProps) {
  const preview = <TokenPreview group={group} tokenKey={token.key} varName={token.varName} ga={isBlockPreview ? undefined : 'preview'} />;
  const badge = hasBadge && <SourceBadge source={token.source} />;

  // A group whose key is already the custom property name has nothing to show
  // besides that name and its value: no preview shape is defined for it, and a
  // key column would repeat the name. Two columns, no responsive variant.
  if (isVarOnly) {
    return (
      <Grid as="li" gtc="subgrid" gc="1/-1" ai="center" g="25" py="10">
        <Inline as="code" fz="s" fw="bold" ff="mono" ovw="anywhere" min-w="0">
          {token.varName}
          {badge}
        </Inline>
        <Inline fz="2xs" ff="mono" c="text-2" ovw="anywhere">
          {token.value}
        </Inline>
      </Grid>
    );
  }

  const keyCell = (
    <Inline fz="s" fw="bold" ovw="anywhere" min-w="0" ga={isBlockPreview ? undefined : 'name'}>
      {token.key}
      {badge}
    </Inline>
  );

  // A block preview is too wide to sit next to the text, so it takes a band of
  // its own under it instead of a column beside it. Its group has no preview
  // column to line up, so the row stays a plain wrapping flex, where the value
  // has to claim the leftover space itself — the grid layout below gets that
  // from its track instead.
  if (isBlockPreview) {
    return (
      <Stack as="li" g="10" py="10">
        <Flex ai="center" g="25" fxw="wrap">
          {keyCell}
          <Inline fz="2xs" ff="mono" c="text-2" fxg="1" min-w="0" ovw="anywhere">
            {token.value}
          </Inline>
        </Flex>
        {preview}
      </Stack>
    );
  }

  return (
    // `subgrid` takes the columns from the `ul`, so the cells line up with every
    // other row without knowing anything about their own width. Named areas
    // keep placement explicit: the preview spans the first row at narrow
    // widths, while the name and value share the second row. At the group's
    // table breakpoint all three line up, with the preview spanning two tracks.
    <Grid
      as="li"
      gtc="subgrid"
      gta={isWide ? [STACKED_AREAS, null, TABLE_AREAS] : [STACKED_AREAS, TABLE_AREAS]}
      gc="1/-1"
      ai="center"
      g="25"
      rg="10"
      py="10"
    >
      {preview}
      {keyCell}
      <Inline fz="2xs" ff="mono" c="text-2" ovw="anywhere" min-w="0" ga="value">
        {token.value}
      </Inline>
    </Grid>
  );
}
