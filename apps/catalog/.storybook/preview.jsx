import 'lism-css/main.css';
import Container from '../../../packages/lism-css/src/components/state/Container/Container';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  decorators: [
    (Story) => (
      <Container>
        <Story />
      </Container>
    ),
  ],
  argTypes: {
    forwardedRef: { table: { disable: true } },
    tag: { table: { disable: true } },
    // --- Common Props ---
    as: { control: 'text', table: { category: 'Common Props' } },
    exProps: { control: 'object', table: { category: 'Common Props' } },
    className: { control: 'text', table: { category: 'Common Props' } },
    layout: {
      control: 'select',
      options: ['box', 'center', 'cluster', 'columns', 'flex', 'flow', 'frame', 'grid', 'stack', 'autoColumns', 'switchColumns', 'withSide'],
      table: { category: 'Common Props' },
    },
    set: { control: 'text', table: { category: 'State' } },

    // --- Property Class / Typography ---
    fz: { control: 'object', table: { category: 'Property Class', subcategory: 'Typography' } },
    fw: { control: 'text', table: { category: 'Property Class', subcategory: 'Typography' } },
    ff: { control: 'text', table: { category: 'Property Class', subcategory: 'Typography' } },
    lh: { control: 'text', table: { category: 'Property Class', subcategory: 'Typography' } },
    lts: { control: 'text', table: { category: 'Property Class', subcategory: 'Typography' } },
    ta: {
      control: 'select',
      options: ['center', 'left', 'right'],
      table: { category: 'Property Class', subcategory: 'Typography' },
    },

    // --- Property Class / Colors ---
    c: { control: 'text', table: { category: 'Property Class', subcategory: 'Colors' } },
    bgc: { control: 'text', table: { category: 'Property Class', subcategory: 'Colors' } },
    keycolor: { control: 'text', table: { category: 'Property Class', subcategory: 'Colors' } },

    // --- Property Class / Padding ---
    p: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },
    px: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },
    py: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },
    ps: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },
    pe: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },
    pbs: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },
    pbe: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },
    pl: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },
    pr: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },
    pt: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },
    pb: { control: 'object', table: { category: 'Property Class', subcategory: 'Padding' } },

    // --- Property Class / Margin ---
    m: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },
    mx: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },
    my: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },
    ms: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },
    me: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },
    mbs: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },
    mbe: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },
    ml: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },
    mr: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },
    mt: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },
    mb: { control: 'object', table: { category: 'Property Class', subcategory: 'Margin' } },

    // --- Property Class / Sizing ---
    w: { control: 'object', table: { category: 'Property Class', subcategory: 'Sizing' } },
    h: { control: 'object', table: { category: 'Property Class', subcategory: 'Sizing' } },
    'min-w': { control: 'object', table: { category: 'Property Class', subcategory: 'Sizing' } },
    'max-w': { control: 'object', table: { category: 'Property Class', subcategory: 'Sizing' } },
    'min-h': { control: 'object', table: { category: 'Property Class', subcategory: 'Sizing' } },
    'max-h': { control: 'object', table: { category: 'Property Class', subcategory: 'Sizing' } },
    ar: { control: 'object', table: { category: 'Property Class', subcategory: 'Sizing' } },

    // --- Property Class / Display ---
    d: { control: 'object', table: { category: 'Property Class', subcategory: 'Display' } },
    o: { control: 'text', table: { category: 'Property Class', subcategory: 'Display' } },
    v: { control: 'text', table: { category: 'Property Class', subcategory: 'Display' } },
    ov: {
      control: 'select',
      table: { category: 'Property Class', subcategory: 'Display' },
    },

    // --- Property Class / Background ---
    bg: { control: 'object', table: { category: 'Property Class', subcategory: 'Background' } },

    // --- Property Class / Border ---
    bd: { control: 'boolean', table: { category: 'Property Class', subcategory: 'Border' } },
    bdc: { control: 'text', table: { category: 'Property Class', subcategory: 'Border' } },
    bdw: { control: 'object', table: { category: 'Property Class', subcategory: 'Border' } },
    bds: {
      control: 'select',
      options: ['dashed', 'dotted', 'double'],
      table: { category: 'Property Class', subcategory: 'Border' },
    },
    bdrs: { control: 'object', table: { category: 'Property Class', subcategory: 'Border' } },
    bxsh: { control: 'object', table: { category: 'Property Class', subcategory: 'Border' } },

    // --- Property Class / Flexbox ---
    fxw: { control: 'object', table: { category: 'Property Class', subcategory: 'Flexbox' } },
    fxd: { control: 'object', table: { category: 'Property Class', subcategory: 'Flexbox' } },
    fx: { control: 'object', table: { category: 'Property Class', subcategory: 'Flexbox' } },
    fxg: { control: 'text', table: { category: 'Property Class', subcategory: 'Flexbox' } },
    fxsh: { control: 'text', table: { category: 'Property Class', subcategory: 'Flexbox' } },
    fxb: { control: 'object', table: { category: 'Property Class', subcategory: 'Flexbox' } },

    // --- Property Class / Grid ---
    gt: { control: 'object', table: { category: 'Property Class', subcategory: 'Grid' } },
    gta: { control: 'object', table: { category: 'Property Class', subcategory: 'Grid' } },
    gtc: { control: 'object', table: { category: 'Property Class', subcategory: 'Grid' } },
    gtr: { control: 'object', table: { category: 'Property Class', subcategory: 'Grid' } },
    gaf: { control: 'object', table: { category: 'Property Class', subcategory: 'Grid' } },
    ga: { control: 'object', table: { category: 'Property Class', subcategory: 'Grid' } },
    gc: { control: 'object', table: { category: 'Property Class', subcategory: 'Grid' } },
    gr: { control: 'object', table: { category: 'Property Class', subcategory: 'Grid' } },

    // --- Property Class / Gap ---
    g: { control: 'object', table: { category: 'Property Class', subcategory: 'Gap' } },
    cg: { control: 'object', table: { category: 'Property Class', subcategory: 'Gap' } },
    rg: { control: 'object', table: { category: 'Property Class', subcategory: 'Gap' } },

    // --- Property Class / Alignment ---
    ai: { control: 'object', table: { category: 'Property Class', subcategory: 'Alignment' } },
    ac: { control: 'object', table: { category: 'Property Class', subcategory: 'Alignment' } },
    ji: { control: 'object', table: { category: 'Property Class', subcategory: 'Alignment' } },
    jc: { control: 'object', table: { category: 'Property Class', subcategory: 'Alignment' } },
    pi: { control: 'text', table: { category: 'Property Class', subcategory: 'Alignment' } },
    pc: { control: 'text', table: { category: 'Property Class', subcategory: 'Alignment' } },
    aslf: { control: 'text', table: { category: 'Property Class', subcategory: 'Alignment' } },
    jslf: { control: 'text', table: { category: 'Property Class', subcategory: 'Alignment' } },
    order: { control: 'text', table: { category: 'Property Class', subcategory: 'Alignment' } },

    // --- Property Class / Position ---
    pos: { control: 'text', table: { category: 'Property Class', subcategory: 'Position' } },
    z: { control: 'text', table: { category: 'Property Class', subcategory: 'Position' } },
    t: { control: 'text', table: { category: 'Property Class', subcategory: 'Position' } },
    l: { control: 'text', table: { category: 'Property Class', subcategory: 'Position' } },
    r: { control: 'text', table: { category: 'Property Class', subcategory: 'Position' } },
    b: { control: 'text', table: { category: 'Property Class', subcategory: 'Position' } },
    i: { control: 'text', table: { category: 'Property Class', subcategory: 'Position' } },

    // --- State ---
    isContainer: { control: 'boolean', table: { category: 'State' } },
    isWrapper: { control: 'object', table: { category: 'State' } },
    isLayer: { control: 'boolean', table: { category: 'State' } },
    isBoxLink: { control: 'boolean', table: { category: 'State' } },
  },
  parameters: {
    controls: {
      sort: 'alpha',
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    docs: {
      argTypes: { sort: 'alpha' },
      controls: { sort: 'alpha' },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
