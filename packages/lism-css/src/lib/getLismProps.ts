import { PROPS, TRAITS } from '../../config/index';
import getLayoutProps from './getLayoutProps';
import getAtomicProps from './getAtomicProps';
import isPresetValue from './isPresetValue';
import isTokenValue from './isTokenValue';
import getUtilKey from './getUtilKey';
import getMaybeCssVar from './getMaybeCssVar';
import getBpData from './getBpData';
import warnUnsupportedBp from './warnUnsupportedBp';
import atts from './helper/atts';
import isEmptyObj from './helper/isEmptyObj';
import filterEmptyObj from './helper/filterEmptyObj';
import mergeSet from './helper/mergeSet';
import splitWithComma from './helper/splitWithComma';
import { type StyleWithCustomProps } from './types';
import { type TraitProps, type SetPropValue, type UtilPropValue } from './types/TraitProps';
import { type PropValueTypes } from './types/PropValueTypes';
import { type CustomPropRegistry } from './types/CustomPropRegistry';
import { type CustomTraitRegistry } from './types/CustomTraitRegistry';
import { type LayoutType, type LayoutProps } from './types/LayoutProps';
import { type AtomicType, type AtomicProps } from './types/AtomicProps';
import { type PropConfig } from './types/PropConfig';
export { type LayoutType, type AtomicType };

// LismPropsData が受け取る型（layout / atomic 処理済み）
export interface LismPropsBase extends TraitProps, PropValueTypes, CustomPropRegistry, CustomTraitRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forwardedRef?: React.Ref<any>;
  class?: string | null;
  className?: string;
  primitiveClass?: string[];
  style?: StyleWithCustomProps;
  set?: SetPropValue;
  util?: UtilPropValue;
  hov?: boolean | string | Record<string, unknown>;
  css?: Record<string, string | number | undefined>;
  [key: `aria-${string}`]: unknown;
  [key: `data-${string}`]: unknown;
}

const getTokenKey = (propName: string): string => {
  const propData = (PROPS as Record<string, PropConfig>)[propName];
  if (!propData) return '';

  return (propData?.token as string) || '';
};

// 出力順のためのクラスバケット（結合順の唯一の定義点）
export class LismPropsData {
  className: string = '';
  primitiveClass: string[] = [];
  setClasses: string[] = [];
  traitClasses: string[] = [];
  uClasses: string[] = [];
  propClasses: string[] = [];
  styles: StyleWithCustomProps = {};
  attrs: Record<string, unknown> = {};

  constructor(allProps: LismPropsBase & Record<string, unknown>) {
    const { forwardedRef, class: astroClassName, className: userClassName, primitiveClass, style = {}, ...others } = allProps;

    this.styles = { ...style };
    if (primitiveClass && primitiveClass.length) {
      this.primitiveClass = [...primitiveClass];
    }

    if (!isEmptyObj(others)) {
      this.attrs = { ...others };
      this.analyzeProps();
    }

    if (forwardedRef) {
      this.attrs.ref = forwardedRef;
    }

    this.className = this.buildClassName(userClassName, astroClassName);
  }

  // 最終クラス順: [className&class] [primitiveClass] [setClasses] [traitClasses] [uClasses] [propClasses]。
  // classNameとclassは重複を除いて併合する。
  buildClassName(userClassName?: string, astroClassName?: string | null): string {
    return atts(userClassName, astroClassName, this.primitiveClass, this.setClasses, this.traitClasses, this.uClasses, this.propClasses);
  }

  /** trait、set、util、Lism Prop、cssを出力先ごとに振り分ける。 */
  analyzeProps(): void {
    this.normalizeIsWrapper();
    this.normalizeHasTransition();

    // set / util は attrs ループの前に取り出して各バケットへ振り分ける
    const rawSet = this.extractProp('set');
    const rawUtil = this.extractProp('util');
    mergeSet(undefined, rawSet).forEach((v) => this.addSet(v));
    mergeSet(undefined, rawUtil).forEach((v) => this.addUtil(`u--${v}`));

    Object.keys(this.attrs).forEach((propName) => {
      if (Object.hasOwn(TRAITS, propName)) {
        const propVal = this.extractProp(propName);
        const traitClass = (TRAITS as Record<string, string>)[propName];
        if (propVal) this.traitClasses.push(traitClass);
      } else if (Object.hasOwn(PROPS, propName)) {
        const propVal = this.attrs[propName];
        delete this.attrs[propName];
        this.analyzeLismProp(propName, propVal);
      } else if (propName === 'hov') {
        const propVal = this.extractProp(propName);
        this.setHovProps(propVal as boolean | string | Record<string, unknown> | null);
      } else if (propName === 'css') {
        const cssVales = this.extractProp('css');
        this.addStyles(cssVales as Record<string, string | number | undefined>);
      }
    });
  }

  // 文字列のisWrapperはcontentSizeへ移し、trait値をtrueに揃える。
  normalizeIsWrapper(): void {
    const isWrapper = this.attrs.isWrapper;
    if (isWrapper == null || isWrapper === false || isWrapper === '') return;
    if (isWrapper !== true) {
      if (this.attrs.contentSize === undefined) {
        this.attrs.contentSize = isWrapper;
      }
      this.attrs.isWrapper = true;
    }
  }

  // 文字列のhasTransitionはCSS変数へ移し、trait値をtrueに揃える。
  normalizeHasTransition(): void {
    const hasTransition = this.attrs.hasTransition;
    if (typeof hasTransition !== 'string') return;
    const transitionProps = hasTransition.trim();
    if (transitionProps === '') return;
    this.addStyle('--transitionProps', transitionProps);
    this.attrs.hasTransition = true;
  }

  /** Prop値をbaseとBPごとに分け、classとstyleへ変換する。 */
  analyzeLismProp(propName: string, propVal: unknown): void {
    if (null == propVal) return;

    const propConfig: PropConfig | null = (PROPS as Record<string, PropConfig>)[propName] || null;
    if (null === propConfig) return;

    const { base: baseValue, ...bpValues } = getBpData(propVal);

    // bp 非対応プロパティに BP 指定された場合、開発環境でのみ警告する。
    // process.env.NODE_ENV を先頭に置き、本番ビルドではブロックごと除去されるようにする。
    if (process.env.NODE_ENV !== 'production' && !propConfig.bp && Object.keys(bpValues).length > 0) {
      warnUnsupportedBp(propName);
    }

    this.setAttrs(propName, baseValue, propConfig);

    Object.keys(bpValues).forEach((bp) => {
      this.setAttrs(propName, bpValues[bp as keyof typeof bpValues], propConfig, bp);
    });
  }

  addSet(setName: string): void {
    this.setClasses.push(`set--${setName}`);
  }
  addUtil(util: string): void {
    this.uClasses.push(util);
  }
  addProp(prop: string): void {
    this.propClasses.push(prop);
  }
  addStyle(name: string, val: string | number): void {
    (this.styles as Record<string, string | number>)[name] = val;
  }
  addStyles(styles: Record<string, string | number | undefined>): void {
    this.styles = { ...this.styles, ...styles };
  }
  extractProp(propName: string): unknown {
    const data = this.attrs[propName];
    if (undefined === this.attrs[propName]) {
      return null;
    }

    delete this.attrs[propName];
    return data;
  }

  /** 1つのProp値をproperty classまたはstyleへ出力する。 */
  setAttrs(propKey: string, val: unknown, propConfig: PropConfig = {}, bpKey: string = ''): void {
    // 値が null, undefined, '', false の時はスキップ
    if (null == val || '' === val || false === val) return;

    const baseStyleName =
      propConfig.isVar && typeof propConfig.prop === 'string' && propConfig.prop.startsWith('--') ? propConfig.prop : `--${propKey}`;
    let styleName = baseStyleName;
    let utilName = `-${String(propConfig.utilKey || propKey)}`;

    if (bpKey) {
      styleName = `${baseStyleName}_${bpKey}`;
      utilName += `_${bpKey}`;
    }

    // テキスト経由のtrue相当として、「:」はbareクラス、suffix付きはproperty classへ変換する。
    if (typeof val === 'string' && val.startsWith(':')) {
      const suffix = val.slice(1);
      this.addProp(suffix ? `${utilName}:${suffix}` : utilName);
      return;
    }

    // base値はpreset、token、shorthandの順にclass化を試す。
    if (!bpKey) {
      const { presets, tokenClass, utils, shorthands } = propConfig;
      if (presets && isPresetValue(presets, val)) {
        const valStr = typeof val === 'string' || typeof val === 'number' ? String(val) : '';
        if (valStr) this.addProp(`${utilName}:${valStr}`);
        return;
      }
      if (tokenClass && propConfig.token && isTokenValue(propConfig.token, val)) {
        const valStr = typeof val === 'string' || typeof val === 'number' ? String(val) : '';
        if (valStr) this.addProp(`${utilName}:${valStr}`);
        return;
      }

      let utilKey = '';
      if (utils && typeof val === 'string') {
        utilKey = getUtilKey(utils, val);
      }
      if (!utilKey && shorthands && typeof val === 'string') {
        utilKey = getUtilKey(shorthands, val, true);
      }
      if (utilKey) {
        this.addProp(`${utilName}:${utilKey}`);
        return;
      }
    }

    if (true === val) {
      this.addProp(utilName);
      return;
    }

    // class化できない値はCSS変数またはinline styleへ出力する。
    const { prop, isVar, alwaysVar, token, bp } = propConfig;

    let finalVal: string | number;
    if (token && (typeof val === 'string' || typeof val === 'number')) {
      finalVal = getMaybeCssVar(val, token);
    } else if (typeof val === 'string' || typeof val === 'number') {
      finalVal = val;
    } else {
      finalVal = JSON.stringify(val);
    }

    if (!bpKey) {
      if (isVar) {
        this.addStyle(baseStyleName, finalVal);
        return;
      } else if (!bp && !alwaysVar) {
        this.addStyle(prop as string, finalVal);
        return;
      }
    }

    this.addProp(utilName);
    this.addStyle(styleName, finalVal);
  }

  /** hov指定をhover classとCSS変数へ変換する。 */
  setHovProps(hoverData: boolean | string | Record<string, unknown> | null): void {
    if (!hoverData) return;

    if (hoverData === true) {
      this.addProp(`-hov`);
    } else if (typeof hoverData === 'string') {
      // カンマ区切りで複数指定可能（入力文字列をそのまま -hov:{...} として出力）
      splitWithComma(hoverData).forEach((cls) => {
        this.addProp(`-hov:${cls}`);
      });
    } else if (typeof hoverData === 'object') {
      // hov={{c:'red', shadowUp: true}} のようなオブジェクト指定
      //   値あり（string / number） → `-hov:-{key}` + `--hov-{key}` 変数を出力
      //   true                    → `-hov:{key}`（クラスのみ）
      Object.keys(hoverData).forEach((propName) => {
        const hovVal = hoverData[propName];
        if (null == hovVal || '' === hovVal || false === hovVal) return;

        if (hovVal === true) {
          this.addProp(`-hov:${propName}`);
        } else if (typeof hovVal === 'string' || typeof hovVal === 'number') {
          const finalHovVal = getMaybeCssVar(hovVal, getTokenKey(propName));

          this.addProp(`-hov:-${propName}`);
          this.addStyle(`--hov-${propName}`, finalHovVal);
        }
      });
    }
  }
}

export interface LismProps extends LismPropsBase, LayoutProps, AtomicProps {}

export interface LismOutputProps {
  className?: string;
  style?: StyleWithCustomProps;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref?: React.Ref<any>;
  [key: string]: unknown;
}

/** LismProps を className、style、その他の属性へ振り分ける。 */
export default function getLismProps(props: LismProps): LismOutputProps {
  if (Object.keys(props).length === 0) {
    return {};
  }

  // atomic → layout の順に処理する。
  // この順序が primitiveClass 内の a-- → l-- 出力順を決定する。
  const { atomic, layout, ...rest } = props;
  const afterAtomic = getAtomicProps(atomic, rest);
  const afterLayout = getLayoutProps(layout, afterAtomic);
  const propObj = new LismPropsData(afterLayout as LismPropsBase & Record<string, unknown>);
  return {
    ...filterEmptyObj({
      className: propObj.className,
      style: filterEmptyObj(propObj.styles as Record<string, unknown>),
    }),
    ...propObj.attrs,
  };
}
