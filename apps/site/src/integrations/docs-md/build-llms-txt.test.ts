import { describe, it, expect } from 'vitest';
import { parseFrontmatter, classify, toUrl } from './build-llms-txt';

describe('parseFrontmatter', () => {
  it('frontmatter が無ければ空オブジェクトを返す', () => {
    expect(parseFrontmatter('# heading\nbody')).toEqual({});
  });

  it('title / description / draft を読み取る', () => {
    const src = `---
title: Hello
description: World
draft: true
---
body`;
    expect(parseFrontmatter(src)).toEqual({
      title: 'Hello',
      description: 'World',
      draft: true,
    });
  });

  it('シングル/ダブルクオートで囲まれた値を剥がす', () => {
    const src = `---
title: "Quoted: value"
description: 'single quoted'
---`;
    expect(parseFrontmatter(src)).toEqual({
      title: 'Quoted: value',
      description: 'single quoted',
    });
  });

  it('draft: false は false として扱う', () => {
    const src = `---
title: x
description: y
draft: false
---`;
    expect(parseFrontmatter(src).draft).toBe(false);
  });

  it('CRLF 改行でも frontmatter を抽出できる', () => {
    const src = `---\r\ntitle: A\r\ndescription: B\r\n---\r\nbody`;
    expect(parseFrontmatter(src)).toEqual({ title: 'A', description: 'B' });
  });
});

describe('classify', () => {
  it('_demo / test.mdx は除外（null）', () => {
    expect(classify('_demo/foo.mdx')).toBeNull();
    expect(classify('test.mdx')).toBeNull();
  });

  it('Getting Started のスラッグを判定', () => {
    expect(classify('overview.mdx')).toBe('Getting Started');
    expect(classify('installation.mdx')).toBe('Getting Started');
    expect(classify('changelog.mdx')).toBe('Getting Started');
    expect(classify('skills.mdx')).toBe('Getting Started');
  });

  it('ui/examples と property-class は Optional', () => {
    expect(classify('ui/examples/Chat.mdx')).toBe('Optional');
    expect(classify('property-class/color.mdx')).toBe('Optional');
  });

  it('それ以外の ui/* は UI Components（DummyText も含む）', () => {
    expect(classify('ui/Accordion.mdx')).toBe('UI Components');
    expect(classify('ui/DummyText.mdx')).toBe('UI Components');
  });

  it('上記いずれにも該当しなければ Documentation', () => {
    expect(classify('layouts/stack.mdx')).toBe('Documentation');
    expect(classify('utilities/spacing.mdx')).toBe('Documentation');
  });
});

describe('toUrl', () => {
  it('docs 系は /en/docs/ プレフィックスで .md を指す（siteUrl 末尾のスラッシュは正規化される）', () => {
    expect(toUrl('overview.mdx', 'https://lism-css.com/')).toBe('https://lism-css.com/en/docs/overview.md');
    expect(toUrl('overview.mdx', 'https://lism-css.com')).toBe('https://lism-css.com/en/docs/overview.md');
    expect(toUrl('layouts/stack.mdx', 'https://lism-css.com')).toBe('https://lism-css.com/en/docs/layouts/stack.md');
  });

  it('ui/ は /en/ 直下（slug は小文字化される）', () => {
    expect(toUrl('ui/Accordion.mdx', 'https://lism-css.com')).toBe('https://lism-css.com/en/ui/accordion.md');
    expect(toUrl('ui/examples/Banner.mdx', 'https://lism-css.com')).toBe('https://lism-css.com/en/ui/examples/banner.md');
  });

  it('docs 系の casing は小文字化される（公開 slug と一致させる）', () => {
    expect(toUrl('core-components/Group.mdx', 'https://lism-css.com')).toBe('https://lism-css.com/en/docs/core-components/group.md');
  });

  it('primitives/ と trait-class/ は casing を保持（CSS クラス名と URL を一致させる）', () => {
    expect(toUrl('primitives/l--autoColumns.mdx', 'https://lism-css.com')).toBe('https://lism-css.com/en/docs/primitives/l--autoColumns.md');
    expect(toUrl('trait-class/is--boxLink.mdx', 'https://lism-css.com')).toBe('https://lism-css.com/en/docs/trait-class/is--boxLink.md');
  });
});
