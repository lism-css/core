# lism-css

[English](./README.md) | [日本語](./README.ja.md)

[![npm version](https://img.shields.io/npm/v/lism-css.svg)](https://www.npmjs.com/package/lism-css)
[![License: MIT](https://img.shields.io/npm/l/lism-css.svg)](https://github.com/lism-css/core/blob/main/LICENSE)

## What is lism-css?

Lism CSS is a lightweight **CSS design framework** for quickly and beautifully building website layouts.

Inspired by [Every Layout](https://every-layout.dev/)'s layout primitives and harmonic modular scaling, and by [Tailwind CSS](https://tailwindcss.com/)'s utility-first approach of single-property classes, Lism CSS is built as an original CSS design.

No build step or configuration is required. Simply load the CSS file via CDN or import it from npm to get started. It also provides React and Astro components whose props are converted into CSS classes and custom properties, enabling component-based development without runtime style generation.

## Features

- **Lightweight** — The entire CSS bundle is approximately 30 KB (~8 KB gzipped).
- **Zero-Build Framework** — Works with plain HTML by simply loading a CSS file. No build tool, preprocessor, or configuration needed. Available via CDN or npm.
- **Layout-First Primitive Architecture** — Pre-built layout primitives (`l--flex`, `l--stack`, `l--grid`, `l--columns`, `l--center`, `l--withSide`, etc.) let you compose common layout patterns without writing custom CSS.
- **CSS Layer Structure** — Uses `@layer` (lism-base → lism-block → lism-trait → lism-primitive → lism-custom → lism-utility) for clear specificity management. `lism-block` is the layer for shared base components (`b--`) whose base styles are managed in CSS — placed low in the order so explicitly added classes (`is--` / `has--` / `l--`, etc.) take precedence. `lism-trait` is the layer for `is--` / `has--` trait classes. `lism-primitive` contains `layout` / `atomic` sub-layers. `lism-custom` is the layer for user-defined classes and overrides. Minimizes specificity conflicts.
- **Design Tokens** — Colors, spacing, font sizes, shadows, and border radii are managed as CSS custom properties. Easy to customize by overriding variables.
- **Flexible Property Classes** — A `-{prop}:{value}` naming convention (e.g., `-p:20`, `-bgc:base-2`, `-fz:l`) maps CSS properties to utility classes for quick, readable styling.
- **Responsive System** — Breakpoint-specific classes and CSS variables (e.g., `-p_sm`, `-p_md`) use container queries by default for parent-based responsive design. Switchable to media queries.
- **React & Astro Components** — Dedicated components for both React and Astro translate props into Lism CSS classes and variables automatically. Write `<Stack g="20">` instead of `class="l--stack -g:20"`.

## Installation

### CDN (no build required)

```html
<link href="https://cdn.jsdelivr.net/npm/lism-css@0.31.0/dist/css/main.css" rel="stylesheet" />
```

### npm

```bash
npm i lism-css
```

or

```bash
pnpm add lism-css
```

## Setup

Import the CSS as a global style:

```js
import 'lism-css/main.css';
```

For **Next.js**, load it in `layout.js` (App Router) or `_app.js` (Pages Router).

## Usage

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
import { Box, Flex, Stack, Text, Heading } from 'lism-css/astro';
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

## Core Components

Lism CSS provides the following React and Astro components:

**Layout Components:**
Lism, Box, Flow, Flex, Cluster, Stack, Grid, AutoColumns, SwitchColumns, WithSide, Center, Columns, Frame, TileGrid

**Structure Components:**
Container, Wrapper, Layer, BoxLink

**Content Components:**
Text, Heading, Inline, Link, Group, List, Media

**Atomic Components:**
Icon, Decorator, Divider, Spacer

All components accept Lism props (e.g., `p`, `m`, `g`, `fz`, `bgc`, `bdrs`) that automatically map to CSS classes and variables.

## CSS Class System

Lism CSS uses a structured naming convention for CSS classes:

| Type | Pattern | Examples |
|------|---------|----------|
| Layout Primitive | `l--{name}` | `l--flex`, `l--grid`, `l--stack`, `l--center`, `l--columns`, `l--withSide` |
| Trait Class (role) | `is--{name}` | `is--wrapper`, `is--container`, `is--layer`, `is--boxLink` |
| Trait Class (feature) | `has--{name}` | `has--transition`, `has--gutter`, `has--snap` |
| Block Class | `b--{name}` | `b--btn`, `b--badge` |
| Custom Class | `c--{name}` | `c--siteHeader`, `c--pricing` |
| Property Class | `-{prop}:{value}` | `-p:20`, `-m:auto`, `-bgc:base-2`, `-fz:l`, `-ta:center` |
| Breakpoint | `-{prop}_{bp}` | `-p_sm`, `-g_md`, `-fz_lg` |
| Utility Class | `u--{name}` | `u--cbox` |

## Responsive System

Responsive values are set using breakpoint-specific classes and CSS variables:

**HTML:**

```html
<div class="-p:20 -p_sm -p_md" style="--p_sm:var(--s30);--p_md:var(--s40)">
  <p>Padding changes at sm (480px) and md (800px) breakpoints</p>
</div>
```

**JSX (React / Astro):**

```jsx
<Lism p={['20', '30', '40']}>
  <p>Padding changes at sm (480px) and md (800px) breakpoints</p>
</Lism>
```

Default breakpoints: `sm` = 480px, `md` = 800px, `lg` = 1120px (container queries by default).

## Design Tokens

Lism CSS provides CSS custom properties for consistent design:

- **Colors:** `--base`, `--base-2`, `--text`, `--text-2`, `--link`, `--divider`, `--brand`, `--accent`, `--neutral`, plus palette colors (`--red`, `--blue`, `--green`, etc.)
- **Spacing:** `--s5`, `--s10`, `--s15` … `--s45`, `--s50`, `--s60`, `--s70` (mapped to rem values)
- **Font Sizes:** `--fz--2xs` through `--fz--5xl`
- **Border Radius:** `--bdrs--10` (0.25rem) through `--bdrs--99` (99rem)
- **Shadows:** `--bxsh--10` through `--bxsh--50` with configurable shadow colors
- **Container Sizes:** `--sz--xs` (400px), `--sz--s` (640px), `--sz--m` (880px), `--sz--l` (1200px), `--sz--xl` (1600px)

## UI Components

For interactive UI components (Accordion, Modal, Tabs, Alert, Avatar, Badge, Button, etc.), see the separate package [@lism-css/ui](https://www.npmjs.com/package/@lism-css/ui).

```bash
npm i @lism-css/ui
```

## AI Tool Integration

### llms.txt

For AI assistants and LLM-powered tools, a machine-readable documentation index is available:

```
https://lism-css.com/llms.txt
```

### MCP Server

An MCP (Model Context Protocol) server is available for AI coding tools:

**Claude Code:**

```bash
claude mcp add lism-css -- npx -y @lism-css/mcp
```

**Cursor:**

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "lism-css": {
      "command": "npx",
      "args": ["-y", "@lism-css/mcp"]
    }
  }
}
```

**VS Code (GitHub Copilot):**

```json
// .vscode/mcp.json
{
  "servers": {
    "lism-css": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@lism-css/mcp"]
    }
  }
}
```

## Documentation

For full documentation, visit [lism-css.com/en](https://lism-css.com/en/).

## Community

For feedback or questions, [join the Lism CSS Discord server](https://discord.gg/6PMcFHvc4h).

## License

MIT
