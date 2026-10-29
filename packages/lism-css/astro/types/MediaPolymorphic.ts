import type { HTMLAttributes } from 'astro/types';
import type { LocalImageProps, RemoteImageProps } from 'astro:assets';
import type { ImageOutputFormat } from 'astro';
import type { MediaAllowedTag } from 'lism-css/lib/types/allowedTags';

// Astro の OmitIndexSignature の再現。ImageProps は LocalImageProps | RemoteImageProps の union のため、
// T extends unknown で union の各メンバーに個別適用する必要がある（分配条件型）。
// 非分配だと共通キーしか残らず、inferSize（RemoteImageProps のみ）のような片方だけの props が消える。
// 例: F<{ a: 1 } | { a: 1; b: 2 }> → 非分配 { a: 1 } / 分配 { a: 1 } | { a: 1; b: 2 }
type OmitIndexSignature<T> = T extends unknown
  ? {
      // インデックスシグネチャ由来のキーは object extends Record<K, unknown> が true になるため除外し、リテラルキー（"src", "alt" 等）だけ残す
      [K in keyof T as object extends Record<K, unknown> ? never : K]: T[K];
    }
  : never;

// union の各メンバーに個別に Omit を適用するヘルパー（OmitIndexSignature と同じ理由）
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type ImageProps = LocalImageProps | RemoteImageProps;

type PictureExtraProps = {
  formats?: ImageOutputFormat[];
  fallbackFormat?: ImageOutputFormat;
  pictureAttributes?: HTMLAttributes<'picture'>;
};

// Polymorphic が除外する Astro 固有属性のキー（class:list は Polymorphic の挙動に合わせて残す）
type AstroBuiltinAttributeKeys = keyof Omit<astroHTML.JSX.AstroBuiltinAttributes, 'class:list'>;

type MediaIntrinsicElements = Omit<astroHTML.JSX.DefinedIntrinsicElements, 'img' | 'picture'> & {
  img: ImageProps;
  picture: ImageProps & PictureExtraProps;
};

type MediaPolymorphicAttributes<P extends { as: MediaAllowedTag }> = Omit<P, 'as'> & {
  as?: P['as'];
} & DistributiveOmit<OmitIndexSignature<MediaIntrinsicElements[P['as']]>, AstroBuiltinAttributeKeys>;

export type MediaPolymorphic<P extends { as: MediaAllowedTag }> = MediaPolymorphicAttributes<Omit<P, 'as'> & { as: NonNullable<P['as']> }>;
