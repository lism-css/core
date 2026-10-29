// レイアウト固有 Props 型 & 判別可能ユニオン

export type CssValue = string | number;

export interface NoLayoutProps {
  layout?: undefined;
}

export interface BoxProps {
  layout: 'box';
}
export interface CenterProps {
  layout: 'center';
}
export interface ClusterProps {
  layout: 'cluster';
}
export interface FlexProps {
  layout: 'flex';
}
export interface FrameProps {
  layout: 'frame';
}
export interface GridLayoutProps {
  layout: 'grid';
}
export interface StackProps {
  layout: 'stack';
}
export interface ColumnsProps {
  layout: 'columns';
}
export interface TileGridProps {
  layout: 'tileGrid';
}

export interface FlowLayoutProps {
  layout: 'flow';
  flow?: CssValue;
}
export interface AutoColumnsProps {
  layout: 'autoColumns';
  autoFit?: boolean;
}

export interface WithSideProps {
  layout: 'withSide';
  sideW?: CssValue;
  mainW?: CssValue;
}
export interface SwitchColumnsProps {
  layout: 'switchColumns';
  breakSize?: CssValue;
}

export type LayoutSpecificProps =
  | NoLayoutProps
  | BoxProps
  | CenterProps
  | ClusterProps
  | ColumnsProps
  | FlexProps
  | FlowLayoutProps
  | AutoColumnsProps
  | FrameProps
  | GridLayoutProps
  | StackProps
  | WithSideProps
  | SwitchColumnsProps
  | TileGridProps;

export type LayoutType = Exclude<LayoutSpecificProps, NoLayoutProps>['layout'];

// LismProps に extends させるためのフラットなレイアウト関連 Props
// 固有 props は LayoutSpecificProps（discriminated union）側で型付けするため、ここでは layout のみ定義
export interface LayoutProps {
  layout?: LayoutType;
}
