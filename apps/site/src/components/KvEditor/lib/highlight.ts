// KVエディター用の shiki ラッパー。
// fine-grained bundle（コア + JS正規表現エンジン + html/jsx + github-dark のみ）で
// クライアントバンドルを最小化する。ビルド時（.astro frontmatter）とクライアントの両方から使う。
import { createHighlighterCore, type HighlighterCore } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import htmlLang from '@shikijs/langs/html';
import jsxLang from '@shikijs/langs/jsx';
import githubDark from '@shikijs/themes/github-dark';

export type EditorLang = 'html' | 'jsx';

let highlighterPromise: Promise<HighlighterCore> | null = null;
// 初期化完了後は同期ハイライトが可能（入力のたびに await しないため）
let readyHighlighter: HighlighterCore | null = null;

const getHighlighter = (): Promise<HighlighterCore> => {
  highlighterPromise ??= createHighlighterCore({
    themes: [githubDark],
    langs: [htmlLang, jsxLang],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  }).then((highlighter) => {
    readyHighlighter = highlighter;
    return highlighter;
  });
  return highlighterPromise;
};

const toHtml = (highlighter: HighlighterCore, code: string, lang: EditorLang): string =>
  highlighter.codeToHtml(code, {
    lang,
    theme: 'github-dark',
    transformers: [
      {
        // aria-hidden なオーバーレイ内に置くため、フォーカス可能にしない
        pre(node) {
          delete node.properties.tabindex;
        },
      },
    ],
  });

/** コードをハイライト済みHTML（<pre><code>…</code></pre>）に変換する（ビルド時・初回用） */
export async function highlight(code: string, lang: EditorLang): Promise<string> {
  return toHtml(await getHighlighter(), code, lang);
}

export async function preloadHighlighter(): Promise<void> {
  await getHighlighter();
}

/** 同期ハイライト。初期化前は null（呼び出し側はプレーン表示にフォールバック） */
export function highlightSync(code: string, lang: EditorLang): string | null {
  if (!readyHighlighter) return null;
  return toHtml(readyHighlighter, code, lang);
}
