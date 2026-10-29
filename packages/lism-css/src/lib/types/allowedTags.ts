// セマンティックラッパーの as prop 許容タグ定義（React・Astro 共通）

export type GroupAllowedTag = 'div' | 'section' | 'article' | 'figure' | 'nav' | 'aside' | 'header' | 'footer' | 'main' | 'fieldset' | 'hgroup';

export type TextAllowedTag = 'p' | 'div' | 'blockquote' | 'address' | 'figcaption' | 'pre';

export type InlineAllowedTag = 'span' | 'em' | 'strong' | 'small' | 'code' | 'time' | 'i' | 'b' | 'mark' | 'abbr' | 'cite' | 'kbd' | 'label';

export type ListAllowedTag = 'ul' | 'ol' | 'dl';

export type ListItemAllowedTag = 'li' | 'dt' | 'dd';

export type MediaAllowedTag = 'img' | 'video' | 'iframe' | 'picture';
