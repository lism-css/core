import { visibleTemplates, categories, type CategoryDef, type CategoryId, type TemplateItem } from '@/config/templates';

/** draft:true は本番ビルドでは取得不可（詳細ページは 404） */
export function getTemplate(categoryId: string, slug: string): TemplateItem | undefined {
  return visibleTemplates.find((tpl) => tpl.category === categoryId && tpl.slug === slug);
}

export function getCategory(categoryId: string): CategoryDef | undefined {
  return categories.find((c) => c.id === categoryId);
}

/** aggregateView のカテゴリは stack 違いだけなので、個別ページは作らない（カテゴリページに統合） */
export function getSingleTemplatePaths(): Array<{ category: CategoryId; slug: string }> {
  return visibleTemplates
    .filter((tpl) => {
      const category = categories.find((c) => c.id === tpl.category);
      return !category?.aggregateView;
    })
    .map((tpl) => ({ category: tpl.category, slug: tpl.slug }));
}

export function getCategoryPaths(): Array<{ category: CategoryId }> {
  return categories.filter((c) => visibleTemplates.some((tpl) => tpl.category === c.id)).map((c) => ({ category: c.id }));
}
