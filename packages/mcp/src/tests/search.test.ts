import { describe, it, expect } from 'vitest';
import { searchDocs } from '../lib/search.js';
import type { DocsEntry } from '../lib/types.js';

function entry(overrides: Partial<DocsEntry> = {}): DocsEntry {
  return {
    sourcePath: 'test.mdx',
    title: '',
    description: '',
    category: 'guide',
    headings: [],
    keywords: [],
    snippet: '',
    ...overrides,
  };
}

describe('searchDocs', () => {
  const entries: DocsEntry[] = [
    entry({ sourcePath: 'box.mdx', title: 'Box', keywords: ['layout'], category: 'core-components' }),
    entry({ sourcePath: 'flex.mdx', title: 'Flex', keywords: ['layout', 'flexbox'], category: 'core-components' }),
    entry({ sourcePath: 'accordion.mdx', title: 'Accordion', keywords: ['ui'], category: 'ui' }),
    entry({ sourcePath: 'spacing.mdx', title: 'Spacing', description: 'spacing tokens', category: 'guide' }),
  ];

  it('空クエリは空配列を返す', () => {
    expect(searchDocs(entries, '')).toEqual([]);
  });

  it('タイトル一致で検索できる', () => {
    const results = searchDocs(entries, 'Accordion');
    expect(results.length).toBe(1);
    expect(results[0].heading).toBe('Accordion');
  });

  it('キーワード一致で検索できる', () => {
    const results = searchDocs(entries, 'layout');
    expect(results.length).toBe(2);
  });

  it('カテゴリフィルタが機能する', () => {
    const results = searchDocs(entries, 'layout', { category: 'core-components' });
    expect(results.length).toBe(2);

    const uiResults = searchDocs(entries, 'layout', { category: 'ui' });
    expect(uiResults.length).toBe(0);
  });

  it('category=allは全カテゴリを検索する', () => {
    const results = searchDocs(entries, 'layout', { category: 'all' });
    expect(results.length).toBe(2);
  });

  it('limit で結果件数を制限できる', () => {
    const results = searchDocs(entries, 'layout', { limit: 1 });
    expect(results.length).toBe(1);
  });

  it('タイトル一致はキーワード一致より高スコア', () => {
    const testEntries: DocsEntry[] = [
      entry({ sourcePath: 'a.mdx', title: 'flex', keywords: [] }),
      entry({ sourcePath: 'b.mdx', title: 'other', keywords: ['flex'] }),
    ];
    const results = searchDocs(testEntries, 'flex');
    expect(results[0].heading).toBe('flex');
  });

  it('URLが正しく生成される', () => {
    const results = searchDocs(entries, 'Box');
    expect(results[0].url).toBe('https://lism-css.com/docs/box/');
  });

  it('primitives/ 配下の sourcePath はファイル名の casing を保持して URL に反映される', () => {
    const camelEntries: DocsEntry[] = [
      entry({ sourcePath: 'primitives/l--tileGrid.mdx', title: 'TileGrid', keywords: ['grid'] }),
      entry({ sourcePath: 'primitives/is--boxLink.mdx', title: 'BoxLink', keywords: ['link'] }),
    ];
    const tileResult = searchDocs(camelEntries, 'TileGrid');
    expect(tileResult[0].url).toBe('https://lism-css.com/docs/primitives/l--tileGrid/');
    const boxResult = searchDocs(camelEntries, 'BoxLink');
    expect(boxResult[0].url).toBe('https://lism-css.com/docs/primitives/is--boxLink/');
  });

  it('primitives/ 以外の sourcePath はファイル名の casing を維持しつつ URL は小文字化される', () => {
    const mixedCaseEntries: DocsEntry[] = [
      entry({ sourcePath: 'core-components/Group.mdx', title: 'Group', keywords: ['layout'] }),
      entry({ sourcePath: 'ui/DummyText.mdx', title: 'DummyText', keywords: ['text'] }),
      entry({ sourcePath: 'ui/examples/Card.mdx', title: 'Card', keywords: ['example'] }),
    ];
    expect(searchDocs(mixedCaseEntries, 'Group')[0].url).toBe('https://lism-css.com/docs/core-components/group/');
    expect(searchDocs(mixedCaseEntries, 'DummyText')[0].url).toBe('https://lism-css.com/ui/dummytext/');
    expect(searchDocs(mixedCaseEntries, 'Card')[0].url).toBe('https://lism-css.com/ui/examples/card/');
  });

  it('ui/ 配下の URL は /docs/ を付けずサイト直下になる', () => {
    const uiEntries: DocsEntry[] = [
      entry({ sourcePath: 'ui/Accordion.mdx', title: 'Accordion', keywords: ['ui'] }),
      entry({ sourcePath: 'ui/examples/Card.mdx', title: 'Card', keywords: ['example'] }),
      entry({ sourcePath: 'ui/examples/Timeline.mdx', title: 'Timeline', keywords: ['timeline'] }),
    ];
    expect(searchDocs(uiEntries, 'Accordion')[0].url).toBe('https://lism-css.com/ui/accordion/');
    expect(searchDocs(uiEntries, 'Card')[0].url).toBe('https://lism-css.com/ui/examples/card/');
    expect(searchDocs(uiEntries, 'Timeline')[0].url).toBe('https://lism-css.com/ui/examples/timeline/');
  });

  it('マッチしない場合は空配列を返す', () => {
    expect(searchDocs(entries, 'nonexistent')).toEqual([]);
  });
});

describe('searchDocs — nextTool', () => {
  const guideTopics = new Set(['responsive', 'tokens']);

  it('primitives/ 配下は get_component(name) を返す', () => {
    const results = searchDocs([entry({ sourcePath: 'primitives/l--flex.mdx', title: 'Flex', keywords: ['flex'], category: 'primitives' })], 'Flex', {
      guideTopics,
    });
    expect(results[0].nextTool).toBe('get_component(name: "l--flex")');
  });

  it('category=ui は get_component(name, package) を返す', () => {
    const results = searchDocs([entry({ sourcePath: 'ui/Accordion.mdx', title: 'Accordion', keywords: ['ui'], category: 'ui' })], 'Accordion', {
      guideTopics,
    });
    expect(results[0].nextTool).toBe('get_component(name: "Accordion", package: "@lism-css/ui")');
  });

  it('ui/examples/ 配下は category=ui でも null を返す（get_component で解決できないため）', () => {
    const results = searchDocs([entry({ sourcePath: 'ui/examples/Card.mdx', title: 'Card', keywords: ['example'], category: 'ui' })], 'Card', {
      guideTopics,
    });
    expect(results[0].nextTool).toBeNull();
  });

  it('overview.mdx は get_overview() を返す', () => {
    const results = searchDocs(
      [{ sourcePath: 'overview.mdx', title: '概要', description: '', category: 'guide', headings: [], keywords: ['overview'], snippet: '' }],
      'overview',
      { guideTopics }
    );
    expect(results[0].nextTool).toBe('get_overview()');
  });

  it('category=guide かつ guideTopics に含まれる場合は get_guide(topic) を返す', () => {
    const results = searchDocs(
      [entry({ sourcePath: 'guide/responsive.mdx', title: 'Responsive', keywords: ['responsive'], category: 'guide' })],
      'Responsive',
      { guideTopics }
    );
    expect(results[0].nextTool).toBe('get_guide(topic: "responsive")');
  });

  it('category=guide でも guideTopics に含まれない場合は null を返す', () => {
    const results = searchDocs(
      [entry({ sourcePath: 'guide/unknown-topic.mdx', title: 'Unknown', keywords: ['unknown'], category: 'guide' })],
      'Unknown',
      { guideTopics }
    );
    expect(results[0].nextTool).toBeNull();
  });

  it('core-components/lism-props.mdx は特例で get_props_system() を返す', () => {
    const results = searchDocs(
      [entry({ sourcePath: 'core-components/lism-props.mdx', title: 'Lism Props', keywords: ['props'], category: 'core-components' })],
      'Lism Props',
      { guideTopics }
    );
    expect(results[0].nextTool).toBe('get_props_system()');
  });
});

describe('searchDocs — 自然言語 alias (keywords) による検索', () => {
  const aliasEntries: DocsEntry[] = [
    entry({
      sourcePath: 'link-box.mdx',
      title: 'BoxLink',
      keywords: ['リンク', 'clickable', 'カード', 'クリッカブル'],
      category: 'core-components',
    }),
    entry({
      sourcePath: 'button.mdx',
      title: 'Button',
      keywords: ['ボタン', 'CTA', 'submit'],
      category: 'ui',
    }),
  ];

  it('「クリッカブル」で BoxLink がヒットする', () => {
    const results = searchDocs(aliasEntries, 'クリッカブル');
    expect(results.length).toBe(1);
    expect(results[0].heading).toBe('BoxLink');
  });

  it('「CTA」で Button がヒットする', () => {
    const results = searchDocs(aliasEntries, 'CTA');
    expect(results.length).toBe(1);
    expect(results[0].heading).toBe('Button');
  });
});

describe('searchDocs with Property Class notation', () => {
  const propClassEntries: DocsEntry[] = [
    entry({
      sourcePath: 'property-class.mdx',
      title: 'Property Class',
      keywords: ['property class', '-g:', '-g:5', '-p:', '-p:20', 'gap', 'padding'],
      snippet: '-{prop}:{value} の形式（例: -g:5, -p:20, -fz:l）。',
      category: 'property-class',
    }),
    entry({
      sourcePath: 'primitives/l--grid.mdx',
      title: 'Grid / l--grid',
      keywords: ['Grid', 'グリッド'],
      snippet: 'CSS Gridレイアウト。',
      category: 'primitives',
    }),
    entry({
      sourcePath: 'tokens.mdx',
      title: 'Design Tokens',
      keywords: ['spacing', 'gap'],
      category: 'guide',
    }),
  ];

  const cssPropertyMap = new Map<string, string[]>([
    ['gap', ['g']],
    ['padding', ['p']],
  ]);

  it('"-g:5" で Property Class ページがヒットする', () => {
    const results = searchDocs(propClassEntries, '-g:5', { cssPropertyMap });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].heading).toBe('Property Class');
  });

  it('".-p:20" で Property Class ページがヒットする', () => {
    const results = searchDocs(propClassEntries, '.-p:20', { cssPropertyMap });
    expect(results.length).toBeGreaterThan(0);
    const propClassResult = results.find((r) => r.heading === 'Property Class');
    expect(propClassResult).toBeDefined();
  });

  it('"gap" で Property Class ページと Tokens ページがヒットする', () => {
    const results = searchDocs(propClassEntries, 'gap', { cssPropertyMap });
    expect(results.length).toBeGreaterThanOrEqual(2);
    const titles = results.map((r) => r.heading);
    expect(titles).toContain('Property Class');
  });

  it('Property Class 記法でないクエリには影響しない', () => {
    const results = searchDocs(propClassEntries, 'Grid', { cssPropertyMap });
    expect(results[0].heading).toBe('Grid / l--grid');
  });
});
