// スクロール可能な方向を示す上下端のグラデーションマスク制御。
// フェード高さは端までの残り距離に比例して伸縮させるため、
// transition なしでも端に近づくにつれて滑らかに消える
const FADE_MAX = 16; // フェードの最大高さ（px）

/**
 * スクロールコンテナの上下端フェードを初期化する（mask-image の定義は _kv-editor.scss 側）。
 * 戻り値は、スクロールを伴わないコンテンツ変更後に手動で呼ぶための更新関数
 */
export function initScrollHint(el: HTMLElement): () => void {
  const update = (): void => {
    const topRoom = el.scrollTop;
    const bottomRoom = el.scrollHeight - el.clientHeight - el.scrollTop;
    // サブピクセル誤差で端に達してもマスクが残らないよう 1px 未満は 0 に丸める
    el.style.setProperty('--kvEditor-mask-top', `${topRoom < 1 ? 0 : Math.min(FADE_MAX, topRoom)}px`);
    el.style.setProperty('--kvEditor-mask-bottom', `${bottomRoom < 1 ? 0 : Math.min(FADE_MAX, bottomRoom)}px`);
  };
  el.addEventListener('scroll', update, { passive: true });
  update();
  return update;
}
