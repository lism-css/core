/**
 * サイドバー設定（sidebar.ts）に基づく記事の分類・並び替えヘルパー
 * SiteNav（サイドバー表示）と PostNavigation（前後記事ナビ）で同じロジックを共有し、
 * 前後記事の並びがサイドバーの表示順と一致することを保証する。
 */
import { type SidebarSection, isSeparator, extractSlugFromUrl } from '@/config/sidebar';

// 記事エントリに要求する最小構造（テストで astro:content に依存しないよう構造的に定義）
export interface SidebarPostLike {
  id: string;
  data: { order?: number };
}

// サイドバーセクションがdir指定かどうかをチェックするヘルパー
export function hasDirProperty(item: SidebarSection): item is SidebarSection & { dir: string } {
  return 'dir' in item;
}

/**
 * slugからURLパスを生成するヘルパー
 * - ui/xxx → /ui/xxx/
 * - xxx → /docs/xxx/
 */
export function getPostUrl(slug: string): string {
  if (slug.startsWith('ui/')) {
    return `/${slug}/`;
  }
  return `/docs/${slug}/`;
}

/** items で直接参照されている記事の slug を取得（これらは dir カテゴリから除外する） */
function getItemsReferencedSlugs(sectionItems: SidebarSection[]): Set<string> {
  const slugs = new Set<string>();
  for (const section of sectionItems) {
    if ('items' in section) {
      for (const item of section.items) {
        if (isSeparator(item)) continue;
        // linkを取得（文字列の場合はそのまま、オブジェクトの場合は.linkプロパティ）
        const link = typeof item === 'string' ? item : item.link;
        slugs.add(extractSlugFromUrl(link));
      }
    }
  }
  return slugs;
}

/**
 * サイドバー設定の dir 定義に基づいて記事をカテゴリ分けする
 * - dir は最長一致（例: `ui/examples/Card` は `ui` より `ui/examples` を優先）
 * - items で直接参照されている記事は dir カテゴリに含めない
 * - 各カテゴリ内は order 順にソート（未指定は999、同順位は入力順を維持）
 */
export function groupPostsBySidebarDirs<T extends SidebarPostLike>(allPosts: T[], sectionItems: SidebarSection[]): Record<string, T[]> {
  const itemsReferencedSlugs = getItemsReferencedSlugs(sectionItems);

  // 長い（深い）ディレクトリを先にマッチさせる
  const configuredDirs = sectionItems
    .filter(hasDirProperty)
    .map((item) => item.dir)
    .sort((a, b) => b.length - a.length);

  const postsByCategory: Record<string, T[]> = {};
  for (const post of allPosts) {
    // items で参照されている記事はルートカテゴリに含めない
    if (itemsReferencedSlugs.has(post.id)) continue;

    // sidebarConfigで定義されたdirと記事のslugをマッチング
    // 例: "ui/examples/Card" は "ui" ではなく "ui/examples" にマッチ
    let category = '/';
    for (const dir of configuredDirs) {
      if (dir === '/') {
        // ルートの場合：スラッシュを含まないslugのみマッチ
        if (!post.id.includes('/')) {
          category = '/';
          break;
        }
      } else if (post.id === dir || post.id.startsWith(dir + '/')) {
        category = dir;
        break;
      }
    }
    (postsByCategory[category] ??= []).push(post);
  }

  // 各カテゴリー内をorder順にソート（未指定は999。同順位は入力順を維持＝サイドバー表示と同じ並び）
  Object.values(postsByCategory).forEach((posts) => {
    posts.sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999));
  });

  return postsByCategory;
}

/**
 * サイドバー設定の並び（セクション順 → dirカテゴリ内は order 順 / items は記載順）で
 * 全記事をフラットに並べる。前後記事ナビゲーションの並び判定に使用する。
 */
export function flattenPostsBySidebarOrder<T extends SidebarPostLike>(allPosts: T[], sectionItems: SidebarSection[]): T[] {
  const postsByCategory = groupPostsBySidebarDirs(allPosts, sectionItems);

  const orderedPosts: T[] = [];
  for (const section of sectionItems) {
    if (hasDirProperty(section)) {
      // dir指定の場合：カテゴリ内の記事をソート順で追加
      const posts = postsByCategory[section.dir];
      if (posts && posts.length > 0) {
        orderedPosts.push(...posts);
      }
    } else {
      // items指定の場合：指定された順序で記事を追加
      for (const navItem of section.items) {
        if (isSeparator(navItem)) continue;
        const link = typeof navItem === 'string' ? navItem : navItem.link;
        const slug = extractSlugFromUrl(link);
        const post = allPosts.find((p) => p.id === slug);
        if (post) {
          orderedPosts.push(post);
        }
      }
    }
  }
  return orderedPosts;
}
