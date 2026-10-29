import defaultConfig from './default-config';
import propsFull from './presets/props-full';
import userConfig from 'lism-css/config.js'; // ユーザーが上書きできる
import { objDeepMerge, arrayConvertToSet } from './helper';
import type { LismConfig } from './types';

interface Window {
  _LISM_CSS_CONFIG_?: LismConfig;
}
declare const window: Window;

// isFullMode: full.css の読み込みを前提に、コンポーネント側の props 設定にも full preset を適用するモード。
// 注: 静的型は defaults のまま。型側への full 反映は FullModeRegistry の拡張で opt-in する。
const isFullMode = (userConfig as LismConfig).isFullMode;
const baseConfig = isFullMode ? (objDeepMerge(defaultConfig, { props: propsFull }) as unknown as typeof defaultConfig) : defaultConfig;

// ビルド時の設定をマージ。(later wins): defaults → full preset → lism.config.js
let mergedConfig = objDeepMerge(baseConfig, userConfig);

// ブラウザ環境で window._LISM_CSS_CONFIG_ があればランタイムでマージ
// （LismConfig は緩い型なので、マージ結果の具体型を保つため defaults の shape へキャストする）
if (typeof window !== 'undefined' && window._LISM_CSS_CONFIG_) {
  mergedConfig = objDeepMerge(mergedConfig, window._LISM_CSS_CONFIG_ as unknown as Partial<typeof defaultConfig>);
}

export const CONFIG = mergedConfig;

const { tokens, props, traits } = CONFIG;

// color プロップは color（セマンティック）∪ palette（パレット）を受理する。
// 両者をマージしたフラットマップで color を上書きし、`-bgc:brand` も `-bgc:red` も同じカタログで受理する。
const tokensWithColor = {
  ...tokens,
  color: { ...tokens.color, ...tokens.palette },
} as const;

// tokens はフラット値マップ（{ key: value }）。arrayConvertToSet は配列のみ Set 化するため、
// トークンは実質ディープクローンされ、membership は `key in map`・型導出は `keyof` で行う。
export const TOKENS = arrayConvertToSet(structuredClone(tokensWithColor));
export const PROPS = arrayConvertToSet(structuredClone(props));

// TRAITS は objDeepMerge の型推論により literal types が保持される
export const TRAITS = traits;

// ブレイクポイント定義は副作用の無い ./defaults/breakpoints を single source とし、ここでは re-export する。
export { BREAK_POINTS, BREAK_POINTS_ALL, BREAK_POINTS_OBJ } from './defaults/breakpoints';
export type { BreakpointKey, BreakpointSequence } from './defaults/breakpoints';
