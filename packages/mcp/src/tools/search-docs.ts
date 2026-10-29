import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadJSON } from '../lib/load-data.js';
import { loadPropsMarkdown } from '../lib/load-markdown.js';
import { DocsEntrySchema, MetaInfoSchema, SearchResultSchema } from '../lib/schemas.js';
import { parsePropRows } from '../lib/markdown-utils.js';
import { searchDocs } from '../lib/search.js';
import { success, loadFailureError, READ_ONLY_ANNOTATIONS } from '../lib/response.js';
import { GUIDE_TOPIC_KEYS } from './get-guide.js';

const DOC_CATEGORIES = ['all', 'core-components', 'primitives', 'property-class', 'ui', 'guide'] as const;

/**
 * Prop テーブル（`loadPropsMarkdown()`）から CSSプロパティ名 → Lism prop名 のマップを作る。
 * `searchDocs` の `cssPropertyMap` に渡す。
 */
function buildCssPropertyMapFromMarkdown(md: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of parsePropRows(md)) {
    const normalized = row.cssProperty.toLowerCase();
    if (normalized.startsWith('(class:')) continue;
    const existing = map.get(normalized) ?? [];
    existing.push(row.prop.toLowerCase());
    map.set(normalized, existing);
  }
  return map;
}

export function registerSearchDocs(server: McpServer): void {
  server.registerTool(
    'search_docs',
    {
      description:
        "Search lism-css documentation by keyword. Returns matching pages with relevance scores. Supports CSS property names (e.g. 'font-size', 'padding') which are automatically expanded to corresponding lism prop names.\n" +
        'Use this when you cannot find information with other tools, or to discover available components, features, and guides by keyword.\n' +
        'Do NOT use this as your first step — prefer get_component for a known component, get_props_system for a known prop, or get_guide for a specific topic. This is a fallback search tool.\n' +
        'Returns JSON with search results including page URLs and relevance scores. Each result includes a nextTool field with the recommended follow-up tool call for fetching that page in detail.',
      inputSchema: {
        query: z.string().describe('Search query (keywords separated by spaces). CSS property names like "font-size" are also accepted.'),
        category: z.enum(DOC_CATEGORIES).default('all').describe('Filter by documentation category.'),
        limit: z.number().int().min(1).max(20).default(10).describe('Maximum number of results to return.'),
      },
      outputSchema: {
        meta: MetaInfoSchema,
        query: z.string(),
        results: z.array(SearchResultSchema),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    ({ query, category, limit }) => {
      try {
        const entries = loadJSON('docs-index.json', z.array(DocsEntrySchema));
        const cssPropertyMap = buildCssPropertyMapFromMarkdown(loadPropsMarkdown());
        const results = searchDocs(entries, query, { category, limit, cssPropertyMap, guideTopics: GUIDE_TOPIC_KEYS });
        return success({ query, results });
      } catch (e) {
        return loadFailureError('docs search index', e);
      }
    }
  );
}
