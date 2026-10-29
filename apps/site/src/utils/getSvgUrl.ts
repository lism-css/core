/**
 * svgをcssの image url に変換
 */
const getSvgUrl = (svg: string, encode = '') => {
  if (!svg) return '';

  if ('base64' === encode) {
    svg = Buffer.from(svg).toString('base64');
    return `url(data:image/svg+xml;base64,${svg})`;
  }

  svg = svg.replace(/'/g, '"');
  // カラーコードの先頭の # → %23 に置換
  svg = svg.replace(/="#/g, '="%23');
  return `url('data:image/svg+xml,${svg}')`;
};
export default getSvgUrl;
