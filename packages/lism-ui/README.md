# @lism-css/ui

[English](./README.md) | [日本語](./README.ja.md)

[![npm version](https://img.shields.io/npm/v/@lism-css/ui.svg)](https://www.npmjs.com/package/@lism-css/ui)
[![License: MIT](https://img.shields.io/npm/l/@lism-css/ui.svg)](https://github.com/lism-css/core/blob/main/LICENSE)

## What is @lism-css/ui?

`@lism-css/ui` is an interactive UI component library built on top of [lism-css](https://www.npmjs.com/package/lism-css). It provides React and Astro components for frequently used UI patterns such as accordions, modals, and tabs.

All components are based on the layout system and design tokens of Lism CSS.

## Available Components

| Component | Description |
|-----------|-------------|
| **Accordion** | Expandable content sections using native `<details>` element |
| **Alert** | Contextual feedback messages with icon and color variants |
| **Avatar** | Circular image display for user profiles |
| **Badge** | Small status labels and counters |
| **Button** | Styled button with variants and sizes |
| **Callout** | Highlighted content blocks for tips, warnings, and notes |
| **Chat** | Chat bubble UI for conversational layouts |
| **Details** | Styled native `<details>` / `<summary>` element |
| **Modal** | Dialog overlay with backdrop |
| **NavMenu** | Navigation menu with nested item support |
| **Popover** | Click-to-open panel using the native Popover API and CSS Anchor Positioning |
| **ShapeDivider** | Decorative section dividers with SVG shapes |
| **Tabs** | Tabbed content panels |
| **Tooltip** | Hover / focus hint text positioned with CSS Anchor Positioning |
| **DummyText** | Placeholder text for prototyping |

## Installation

```bash
npm i @lism-css/ui
```

or

```bash
pnpm add @lism-css/ui
```

> `lism-css` is a regular dependency of `@lism-css/ui`, so it is installed automatically — no separate install step needed.

## Setup

Import the `lism-css` stylesheet as a global style:

```js
import 'lism-css/main.css';
```

Each component loads its own CSS automatically when you import it, so you don't need to import `@lism-css/ui/style.css` separately.

If you use classes such as `b--button` directly in HTML without the components, import `@lism-css/ui/style.css`, which bundles the CSS for all components:

```js
import 'lism-css/main.css';
import '@lism-css/ui/style.css';
```

## Usage

Each component is exposed as its own deep import path (`@lism-css/ui/{react,astro}/<Component>`). This is the recommended form — it ensures only the components you actually use are bundled.

A barrel entry (`@lism-css/ui/react` / `@lism-css/ui/astro`) is also available for compatibility, but for production builds we recommend the per-component imports shown below.

### React

```jsx
import { Accordion } from '@lism-css/ui/react/Accordion';
import { Button } from '@lism-css/ui/react/Button';
import { Text } from 'lism-css/react';

<Accordion.Root>
  <Accordion.Item>
    <Accordion.Heading>
      <Accordion.Button>FAQ Question</Accordion.Button>
    </Accordion.Heading>
    <Accordion.Panel>
      <Text>Answer content goes here.</Text>
    </Accordion.Panel>
  </Accordion.Item>
</Accordion.Root>

<Button href="/about" variant="outline">
  Learn More
</Button>
```

### Astro

```astro
---
import { Accordion } from '@lism-css/ui/astro/Accordion';
import { Button } from '@lism-css/ui/astro/Button';
import { Text } from 'lism-css/astro';
---

<Accordion.Root>
  <Accordion.Item>
    <Accordion.Heading>
      <Accordion.Button>FAQ Question</Accordion.Button>
    </Accordion.Heading>
    <Accordion.Panel>
      <Text>Answer content goes here.</Text>
    </Accordion.Panel>
  </Accordion.Item>
</Accordion.Root>

<Button href="/about" variant="outline">
  Learn More
</Button>
```

## Relationship to lism-css

This package builds on top of a separate core CSS package. The two most relevant packages here are:

- **[lism-css](https://www.npmjs.com/package/lism-css)** — Core CSS framework providing layout components (Box, Flex, Stack, Grid, etc.), design tokens, property classes, and the responsive system.
- **@lism-css/ui** (this package) — Interactive UI components (Accordion, Modal, Tabs, etc.) that extend the core layout system with ready-to-use interface patterns.

`lism-css` is a regular dependency of `@lism-css/ui`, so it is installed automatically.

## AI Tool Integration

An MCP server is available for AI coding tools to reference Lism CSS documentation:

```bash
claude mcp add lism-css -- npx -y @lism-css/mcp
```

For more setup options, see the [lism-css README](https://www.npmjs.com/package/lism-css#ai-tool-integration).

## Documentation

For full documentation, visit [lism-css.com](https://lism-css.com).

## License

MIT
