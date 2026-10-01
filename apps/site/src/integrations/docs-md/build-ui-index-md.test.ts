import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildUiIndexMd } from './build-ui-index-md';

const logger = {
  warn: vi.fn(),
  info: vi.fn(),
};

async function writeFile(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

describe('buildUiIndexMd', () => {
  it('UI index markdown を2分類で生成し、draft と _ 始まりを除外する', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lism-ui-index-md-'));
    const htmlPath = path.join(tmpDir, 'dist/ui/index.html');
    const outputPath = path.join(tmpDir, 'dist/ui.md');
    const uiContentDir = path.join(tmpDir, 'content/ui');

    try {
      await writeFile(
        htmlPath,
        `<!doctype html>
<html>
  <head>
    <title>Lism UI - Lism CSS</title>
    <meta name="description" content="UI components based on Lism CSS">
    <link rel="canonical" href="https://lism-css.com/ui/">
  </head>
  <body></body>
</html>`
      );
      await writeFile(
        path.join(uiContentDir, 'ShapeDivider.mdx'),
        `---
title: ShapeDivider
description: Shape divider docs
---
body`
      );
      await writeFile(
        path.join(uiContentDir, 'Button.mdx'),
        `---
title: Button
description: Button docs
---
body`
      );
      await writeFile(
        path.join(uiContentDir, 'examples/Chat.mdx'),
        `---
title: Chat
description: Chat example
---
body`
      );
      await writeFile(
        path.join(uiContentDir, 'examples/Banner.mdx'),
        `---
title: Banner
description: Banner example
---
body`
      );
      await writeFile(
        path.join(uiContentDir, 'examples/Draft.mdx'),
        `---
title: Draft
description: Draft example
draft: true
---
body`
      );
      await writeFile(
        path.join(uiContentDir, '_opt-in/Hidden.mdx'),
        `---
title: Hidden
description: Hidden docs
---
body`
      );

      await buildUiIndexMd({
        htmlPath,
        outputPath,
        uiContentDir,
        uiUrlPrefix: 'https://lism-css.com/ui/',
        logger,
      });

      const md = await fs.readFile(outputPath, 'utf8');

      expect(md).toContain('title: "Lism UI"');
      expect(md).toContain('description: "UI components based on Lism CSS"');
      expect(md).toContain('url: https://lism-css.com/ui/');
      expect(md).toContain('## Blocks');
      expect(md).toContain('- [Button](https://lism-css.com/ui/button.md): Button docs');
      expect(md).toContain('- [ShapeDivider](https://lism-css.com/ui/shapedivider.md): Shape divider docs');
      expect(md).toContain('## Examples');
      expect(md).toContain('- [Chat](https://lism-css.com/ui/examples/chat.md): Chat example');
      expect(md).toContain('- [Banner](https://lism-css.com/ui/examples/banner.md): Banner example');
      expect(md).not.toContain('Draft');
      expect(md).not.toContain('Hidden');
      expect(md.indexOf('[Button]')).toBeLessThan(md.indexOf('[ShapeDivider]'));
      // 見出しの並びは Blocks → Examples
      expect(md.indexOf('## Blocks')).toBeLessThan(md.indexOf('## Examples'));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
