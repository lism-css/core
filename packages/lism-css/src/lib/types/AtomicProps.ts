// Atomic 固有 Props 型 & 判別可能ユニオン

import type { CssValue } from './LayoutProps';

export interface NoAtomicProps {
  atomic?: undefined;
}

export interface DividerAtomicProps {
  atomic: 'divider';
}

// spacer（w/h は LismPropsBase 基底にあるため再宣言不要）
export interface SpacerAtomicProps {
  atomic: 'spacer';
}

export interface DecoratorAtomicProps {
  atomic: 'decorator';
  size?: CssValue;
}

// icon（内部用。user-facing では案内しない）
export interface IconAtomicProps {
  atomic: 'icon';
}

export type AtomicSpecificProps = NoAtomicProps | DividerAtomicProps | SpacerAtomicProps | DecoratorAtomicProps | IconAtomicProps;

export type AtomicType = Exclude<AtomicSpecificProps, NoAtomicProps>['atomic'];

// LismProps に extends させるためのフラットな atomic 関連 Props
// 固有 props は AtomicSpecificProps（discriminated union）側で型付けするため、ここでは atomic のみ定義
export interface AtomicProps {
  atomic?: AtomicType;
}
