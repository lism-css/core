import { Flex, Grid, Heading, Inline, Stack, Text } from 'lism-css/react';
import { Badge } from '@lism-css/ui/react/Badge';
import { darkScopeClass, tokenGroups, type ViewerToken, type ViewerTokenGroup } from 'virtual:lism-mockup/tokens';

import { useActiveSection } from '../lib/useActiveSection';
import TokenOutline, { type OutlineItem } from './TokenOutline';
import TokenPreview, { tokenGroupLayout } from './TokenPreview';

/** Label of this view. Shared with the header, the nav and `document.title`. */
export const TOKENS_VIEW_LABEL = 'Design tokens';

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
 * Column tracks of a group's rows. Groups with an `isWide` preview switch to the
 * table from `md`, the others from `sm` (see `PreviewSpec.isWide` in
 * TokenPreview). Responsive values are `[base, sm, md]`, so the wide variant
 * skips `sm` with a `null`.
 *
 * The var name is not a column: it is the group's `varPrefix` plus the key, and
 * the prefix is shown once next to the heading instead of on every row.
 */
const STACKED_COLUMNS = '1fr 1fr';
const TABLE_COLUMNS = 'minmax(max-content, 20%) 1fr minmax(max-content, 20%) minmax(12rem, 25%)';
const STACKED_AREAS = `'preview preview' 'name value'`;
const TABLE_AREAS = `'preview preview name value'`;

/** Columns of a group whose keys are already custom property names: name and value only, no preview to line up, so no responsive variant. */
const VAR_ONLY_COLUMNS = 'minmax(max-content, 30%) auto';

/** Built once at module scope: `useActiveSection` needs a stable array of ids. */
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
      {/* `is--wrapper` keeps the rows at a readable measure; the end padding is
          wider because the floating outline sits there. */}
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
 * The outline with its section tracking, as a leaf of its own: `useActiveSection`
 * changes state on every section the reader passes, and calling it from
 * `TokensView` would re-render the whole token list (hundreds of rows) for a
 * highlight that only moves inside the outline.
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
  // property name as its key, so its rows drop to name + value. Checked on the
  // tokens, not the group name. A block preview keeps the normal row (it is not
  // in a grid, so has no columns to drop).
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

  // Rendered inside the dark scope, not just labelled: a shadow or swatch close to
  // the base color can only be judged against its real background. `bgc`/`c`
  // resolve inside the scope.
  const listScope = isDark ? { className: darkScopeClass, bgc: 'base', c: 'text', p: '20', bdrs: '20' } : {};

  return (
    // Keeps air above the section when the outline scrolls to it.
    // `isContainer`: `is--wrapper` caps this section at `--sz--m` (its default
    // `--contentSize`), so its width is the one worth querying.
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
        // Columns are declared once here; rows inherit them through `subgrid` (see
        // `PreviewSpec.placement`), so a column is as wide as the widest cell of
        // the group.
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
  group: string;
  token: ViewerToken;
  isBlockPreview: boolean;
  isVarOnly: boolean;
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

  // Name and value only (see `VAR_ONLY_COLUMNS`).
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
    // Takes the `ul`'s columns through `subgrid`; the areas place the cells per
    // breakpoint.
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
