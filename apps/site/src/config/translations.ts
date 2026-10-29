import type { LangCode } from './site';

type TranslationKeys = {
  toc: 'title' | 'open' | 'ariaLabel';
  search: 'title' | 'devMessage';
  header: 'openMenu';
  siteNav: 'ariaLabel';
  main: 'ariaLabel';
  themeSwitch: 'ariaLabel' | 'system' | 'light' | 'dark';
  langMenu: 'ariaLabel' | 'menuAriaLabel';
  copyCode: 'copy' | 'copied';
  postNav: 'prev' | 'next' | 'ariaLabel';
  translationNotice: 'title' | 'description';
  demo: 'openNewTab' | 'lismNote';
  preview: 'resize' | 'sizeAriaLabel' | 'mobile' | 'tablet' | 'desktop' | 'previewTab' | 'codeTab' | 'tabsAriaLabel';
  kvEditor: 'tablistAriaLabel' | 'editorAriaLabel' | 'keyboardHint';
};

export type UITranslations = {
  [K in keyof TranslationKeys]: Record<TranslationKeys[K], string>;
};

export const translations: Record<LangCode, UITranslations> = {
  ja: {
    toc: {
      title: '目次',
      open: '目次を開く',
      ariaLabel: '目次',
    },
    search: {
      title: '検索',
      devMessage: '検索は本番ビルド後に利用可能です。',
    },
    header: {
      openMenu: 'メニューを開く',
    },
    siteNav: {
      ariaLabel: 'サイトナビゲーション',
    },
    main: {
      ariaLabel: 'メインコンテンツ',
    },
    themeSwitch: {
      ariaLabel: 'カラーテーマを切り替える',
      system: 'システムに従う',
      light: 'ライトモード',
      dark: 'ダークモード',
    },
    langMenu: {
      ariaLabel: '言語を選択',
      menuAriaLabel: '利用可能な言語',
    },
    copyCode: {
      copy: 'コードをコピー',
      copied: 'コードをコピーしました',
    },
    postNav: {
      prev: '前の記事',
      next: '次の記事',
      ariaLabel: '記事ナビゲーション',
    },
    translationNotice: {
      title: '翻訳準備中',
      description: 'このページはまだ翻訳されていません。日本語版を表示しています。',
    },
    demo: {
      openNewTab: '別タブで表示 ↗',
      lismNote: '※ CSSが書かれていないクラスはLism CSSのものです。',
    },
    preview: {
      resize: 'リサイズ',
      sizeAriaLabel: 'プレビューの画面サイズ',
      mobile: 'モバイル',
      tablet: 'タブレット',
      desktop: 'デスクトップ',
      previewTab: 'プレビュー',
      codeTab: 'コード',
      tabsAriaLabel: 'プレビューとコードの切り替え',
    },
    kvEditor: {
      tablistAriaLabel: 'コード表記の切り替え',
      editorAriaLabel: 'ライブコードエディター',
      keyboardHint: 'Tabキーはインデントの挿入に使われます。エディターの外へフォーカスを移動するには、Escキーを押してからTabキーを押してください。',
    },
  },
  en: {
    toc: {
      title: 'TOC',
      open: 'Open contents',
      ariaLabel: 'Table of contents',
    },
    search: {
      title: 'Search',
      devMessage: 'Search is available after production build.',
    },
    header: {
      openMenu: 'Open menu',
    },
    siteNav: {
      ariaLabel: 'Site navigation',
    },
    main: {
      ariaLabel: 'Main content',
    },
    themeSwitch: {
      ariaLabel: 'Toggle color theme',
      system: 'Follow system',
      light: 'Light mode',
      dark: 'Dark mode',
    },
    langMenu: {
      ariaLabel: 'Select language',
      menuAriaLabel: 'Available languages',
    },
    copyCode: {
      copy: 'Copy code',
      copied: 'Code copied!',
    },
    postNav: {
      prev: 'Previous',
      next: 'Next',
      ariaLabel: 'Post navigation',
    },
    translationNotice: {
      title: 'Translation Not Available',
      description: 'This page has not been translated yet. You are viewing the Japanese version.',
    },
    demo: {
      openNewTab: 'Open in new tab ↗',
      lismNote: '* Classes without CSS are from Lism CSS.',
    },
    preview: {
      resize: 'Resize',
      sizeAriaLabel: 'Preview screen size',
      mobile: 'Mobile',
      tablet: 'Tablet',
      desktop: 'Desktop',
      previewTab: 'Preview',
      codeTab: 'Code',
      tabsAriaLabel: 'Switch between preview and code',
    },
    kvEditor: {
      tablistAriaLabel: 'Switch code format',
      editorAriaLabel: 'Live code editor',
      keyboardHint: 'The Tab key inserts indentation. To move focus out of the editor, press Escape and then Tab.',
    },
  },
};
