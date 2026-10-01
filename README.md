<h1 align="center">
  <a href="https://lism-css.com/en/" target="_blank">
    Lism CSS
  </a>
</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/lism-css"><img src="https://img.shields.io/npm/v/lism-css.svg" alt="Latest Release"></a>
  <a href="https://github.com/lism-css/core/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/lism-css.svg" alt="License"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> | <a href="./README.ja.md">日本語</a>
</p>

## What is Lism CSS?

Lism CSS is a lightweight **CSS design framework** for quickly and beautifully building website layouts.

Inspired by [Every Layout](https://every-layout.dev/)'s layout primitives and harmonic modular scaling, and by [Tailwind CSS](https://tailwindcss.com/)'s utility-first approach of single-property classes, Lism CSS is built as an original CSS design.

No build step or configuration is required. Simply load the CSS file via CDN or import it from npm to get started. It also provides React and Astro components whose props are converted into CSS classes and custom properties, enabling component-based development without runtime style generation.

## Features

- **Lightweight** — The entire CSS bundle is approximately 30 KB (~8 KB gzipped).
- **Zero-Build Framework** — Works with plain HTML via CDN or npm. No build tool or configuration needed.
- **Layout-First Primitives** — Pre-built layout patterns: `l--flex`, `l--stack`, `l--grid`, `l--columns`, `l--center`, `l--withSide`, etc.
- **CSS Layer Structure** — `@layer` (lism-base → lism-block → lism-trait → lism-primitive → lism-custom → lism-utility) for clear specificity management. `lism-block` is the layer for shared base components (`b--`) whose base styles are managed in CSS — placed low in the order so explicitly added classes (`is--` / `has--` / `l--`, etc.) take precedence. `lism-trait` is the layer for `is--` / `has--` trait classes. `lism-primitive` contains `layout` / `atomic` sub-layers. `lism-custom` is the layer for user-defined classes and overrides. Minimizes specificity conflicts.
- **Design Tokens** — Colors, spacing, font sizes, shadows as CSS custom properties.
- **Flexible Property Classes** — `-{prop}:{value}` syntax (e.g., `-p:20`, `-bgc:base-2`, `-fz:l`).
- **Responsive System** — Breakpoint classes and CSS variables (e.g., `-p_sm`, `-p_md`) use container queries by default for parent-based responsive design. Switchable to media queries.
- **React & Astro Components** — Write `<Stack g="20">` instead of `class="l--stack -g:20"`.

## Packages

| Package | Description |
|---------|-------------|
| [lism-css](https://www.npmjs.com/package/lism-css) | Core CSS framework + React / Astro layout components |
| [@lism-css/ui](https://www.npmjs.com/package/@lism-css/ui) | Interactive UI components (Accordion, Modal, Tabs, etc.) |
| [@lism-css/mcp](https://www.npmjs.com/package/@lism-css/mcp) | MCP server for AI coding tools |
| [lism-cli](https://www.npmjs.com/package/lism-cli) | CLI for scaffolding projects, adding UI components, and installing AI skills |
| [create-lism](https://www.npmjs.com/package/create-lism) | Wrapper for `pnpm create lism` / `npm create lism` (bundles `lism-cli`) |
| [@lism-css/mockup](https://www.npmjs.com/package/@lism-css/mockup) | CLI for creating, validating, and previewing Lism CSS mockups |
| [@lism-css/plugin](https://www.npmjs.com/package/@lism-css/plugin) | Build / Vite / Astro / purge plugins for Lism CSS |

## Quick Start

### CDN (no build required)

```html
<link href="https://cdn.jsdelivr.net/npm/lism-css@1.0.0/dist/css/main.css" rel="stylesheet" />
```

### npm

```bash
npm i lism-css
```

```js
import 'lism-css/main.css';
```

### React

```jsx
import { Box, Flex, Stack, Grid, Text, Heading } from 'lism-css/react';

<Stack g="20">
  <Heading tag="h2" fz="xl">Welcome</Heading>
  <Flex g="20" ai="center">
    <Box p="20" bgc="base-2" bdrs="20">
      <Text fz="l">Card A</Text>
    </Box>
    <Box p="20" bgc="base-2" bdrs="20">
      <Text fz="l">Card B</Text>
    </Box>
  </Flex>
</Stack>
```

### Astro

```astro
---
import { Box, Flex, Stack, Grid, Text, Heading } from 'lism-css/astro';
---

<Stack g="20">
  <Heading tag="h2" fz="xl">Welcome</Heading>
  <Flex g="20" ai="center">
    <Box p="20" bgc="base-2" bdrs="20">
      <Text fz="l">Card A</Text>
    </Box>
    <Box p="20" bgc="base-2" bdrs="20">
      <Text fz="l">Card B</Text>
    </Box>
  </Flex>
</Stack>
```

### HTML (CSS-only)

```html
<div class="l--stack -g:20">
  <h2 class="-fz:xl">Welcome</h2>
  <div class="l--flex -g:20 -ai:center">
    <div class="-p:20 -bgc:base-2 -bdrs:20">
      <p class="-fz:l">Card A</p>
    </div>
    <div class="-p:20 -bgc:base-2 -bdrs:20">
      <p class="-fz:l">Card B</p>
    </div>
  </div>
</div>
```

## CSS Class Examples

| Type | Examples |
|------|---------|
| Layout Primitive | `l--flex`, `l--grid`, `l--stack`, `l--center`, `l--columns`, `l--withSide` |
| Trait Class | `is--wrapper`, `is--container`, `is--layer`, `has--transition`, `has--gutter` |
| Block Class | `b--btn`, `b--badge` |
| Custom Class | `c--siteHeader`, `c--pricing` |
| Property Class | `-p:20`, `-bgc:base-2`, `-fz:l`, `-ta:center` |
| Breakpoint | `-p_sm`, `-g_md`, `-fz_lg` |
| Utility | `u--cbox` |

## Responsive Example

**HTML:**

```html
<div class="-p:20 -p_sm -p_md" style="--p_sm:var(--s30);--p_md:var(--s40)">
  <p>Padding changes at sm (480px) and md (800px) breakpoints</p>
</div>
```

**JSX:**

```jsx
<Lism p={['20', '30', '40']}>
  <p>Padding changes at sm (480px) and md (800px) breakpoints</p>
</Lism>
```

## AI Tool Integration

### Claude Code Skill

```bash
npx lism-cli skill add
```

This installs the bundled skills (`lism-css-guide`, `lism-css-refactor` and `lism-mockup-guide`) into your AI tool's skill directory (e.g. `.claude/skills/` for Claude Code). Pass a skill name like `npx lism-cli skill add lism-css-guide` to install a single skill. Run without tool flags for an interactive prompt, or pass `--claude`, `--cursor`, etc. to target specific tools.

You can also install the same three skills via [skills.sh](https://skills.sh), picking the ones you need:

```bash
npx skills add lism-css/core
```

See the [Skills documentation](https://lism-css.com/en/docs/skills/) for details.

### MCP Server

```bash
claude mcp add lism-css -- npx -y @lism-css/mcp
```

See the [lism-css package README](https://www.npmjs.com/package/lism-css#ai-tool-integration) for Cursor and VS Code setup.

### llms.txt

```
https://lism-css.com/llms.txt
```

## Documentation

For full documentation, visit [lism-css.com/en](https://lism-css.com/en/).

## Playgrounds

Try Lism CSS in a sandbox environment: [lism-css/lism-playgrounds](https://github.com/lism-css/lism-playgrounds)

## Community

For feedback or questions, [join the Lism CSS Discord server](https://discord.gg/6PMcFHvc4h).

## Credits

- [Phosphor Icons](https://phosphoricons.com/) — MIT License ([source](https://github.com/phosphor-icons))

## License

MIT
