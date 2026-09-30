// MDXを使わず、この定義データからパターンページを生成する
import type { LangCode } from '@/config/site';

// 関連ページへのリンク（言語プレフィックスなしのパスで保持し、表示時に言語を付与する）
export interface PatternRelatedLink {
  label: string;
  path: string;
}

export interface PatternItem {
  id: string;
  title: string;
  titleEn?: string;
  description: Record<LangCode, string>;
  draft?: boolean;
  languages?: LangCode[];
}

// ページ側では related の有無に関係なく、この共通型で受ける
export interface PatternCategory {
  label: string;
  description: Record<LangCode, string>;
  related?: PatternRelatedLink[];
  items: PatternItem[];
}

const patterns = {
  hero: {
    label: 'Hero',
    description: {
      ja: 'ページ冒頭に置く、見た目まで作り込んだヒーローセクション。骨格だけのレイアウトが必要な場合はLayout Demosを参照してください。',
      en: 'Fully styled hero sections placed at the top of a page. See Layout Demos when you need the bare structure instead.',
    },
    related: [
      {
        label: 'Layout Demos: Hero Fullscreen',
        path: '/docs/layout-demos/sections/hero-fullscreen/',
      },
    ],
    items: [
      {
        id: 'hero01',
        title: 'Hero01',
        description: {
          ja: '画面の高さいっぱいの背景画像に、ヘッダー・中央コンテンツを重ねたヒーローです。',
          en: 'A full-height hero with a header and centered content layered over a background image.',
        },
      },
      {
        id: 'hero02',
        title: 'Hero02',
        description: {
          ja: '画面いっぱいの背景画像に、ヘッダー・大きな見出し・右下のスクロール表示を重ねたヒーローです。',
          en: 'A full-height hero with a header, a large heading and a scroll cue at the bottom right.',
        },
      },
      {
        id: 'hero03',
        title: 'Hero03',
        description: {
          ja: '余白で囲んだ角丸の背景画像に、ヘッダー・左下の大きな見出し・右下のスクロール表示を重ねたヒーローです。',
          en: 'A rounded, inset hero with a header, a large heading at the bottom left and a scroll cue at the bottom right.',
        },
      },
      {
        id: 'hero04',
        title: 'Hero04',
        draft: true,
        description: {
          ja: '左側にロゴ・メニューボタンとコンテンツ、右半分に画像を配置したヒーローです。',
          en: 'A split hero with a logo, menu button and content on the left, and a full-height image on the right.',
        },
      },
      {
        id: 'hero05',
        title: 'Hero05',
        draft: true,
        description: {
          ja: '幅を絞った塗りつぶしヘッダーの下に、角丸の横長画像と文章・ボタンを配置したヒーローです。',
          en: 'A hero with a narrow filled header, followed by a wide rounded image, text and action buttons.',
        },
      },
    ],
  },
  feature: {
    label: 'Feature',
    description: {
      ja: 'サービスや商品の機能・強みを、説明文や画面・写真で伝えるセクション。',
      en: 'Sections that line up the features or highlights of a service or product.',
    },
    items: [
      {
        id: 'feature01',
        title: '01 - アイコンを添えた2列の特徴',
        description: {
          ja: '中央の見出しの下に、アイコン・見出し・説明文を2列で配置するセクションです。',
          en: 'A section with a centered introduction and two columns of features, each pairing an icon with a heading and description.',
        },
        titleEn: '01 - Two-column features with icons',
      },
      {
        id: 'feature02',
        title: '02 - 罫線で区切る3列の特徴',
        description: {
          ja: 'アイコン・見出し・説明文と控えめなリンクを3列で並べ、カラム間を罫線で区切るセクションです。',
          en: 'A section with three columns of icons, headings, descriptions and subtle links, separated by dividers.',
        },
        titleEn: '02 - Three-column features with dividers',
      },
      {
        id: 'feature03',
        title: 'Feature03',
        description: {
          ja: '統一感のあるグラフィックと説明文を添えた6枚のカード。画面幅に応じて1列・2列・3列に切り替わりつつ、内部のテキストと画像は、テキストが読みやすい長さを最低限維持するように自動で横並びと縦並びが切り替わります。',
          en: 'Six cards pairing cohesive illustrations with feature descriptions. The grid adapts to one, two, or three columns based on screen width. Within each card, the text and image automatically switch between side-by-side and stacked layouts to keep the text wide enough for comfortable reading.',
        },
      },
      {
        id: 'feature04',
        title: 'Feature04',
        description: {
          ja: '特徴・注目コンテンツ用のパターンです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A pattern for featured content. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'feature05',
        title: '05 - 見出しと3つの特徴を並べるグリッド',
        draft: true,
        description: {
          ja: '左上の見出しと3つの特徴を、罫線で区切った2列のグリッドに配置するセクションです。狭い画面では1列に切り替わります。',
          en: 'A two-column grid pairing a heading in the top-left cell with three features, separated by fine borders. It stacks into one column on narrow screens.',
        },
        titleEn: '05 - A heading and three features in a grid',
      },
    ],
  },
  pricing: {
    label: 'Pricing',
    description: {
      ja: '料金プランを比較できる形で並べるセクション。',
      en: 'Sections that lay out pricing plans for comparison.',
    },
    items: [
      {
        id: 'pricing01',
        title: 'Pricing01',
        description: {
          ja: '価格表用のパターンです。breakpoint「md」以下は1カラムになり、アイテムが縦に並びます。',
          en: 'A pricing table pattern. Below the "md" breakpoint, it switches to a single column layout with items stacked vertically.',
        },
      },
      {
        id: 'pricing02',
        title: '02 - カードで選ぶ料金プラン',
        description: {
          ja: 'プラン名・短い説明・料金・購入ボタン・特徴リストを3枚のカードにまとめた料金表です。中央のプランの右上に「人気」バッジを表示し、狭い画面では1列に並びます。',
          en: 'Three pricing cards with a plan name, short description, price, purchase button, and feature list. The middle plan has a Popular badge at the top right, and the cards stack on narrow screens.',
        },
        titleEn: '02 - Choose a pricing card',
      },
      {
        id: 'pricing03',
        title: '03 - 機能で選ぶ料金比較',
        draft: true,
        description: {
          ja: '機能を行、プランを列に並べた料金比較表です。狭い幅では表だけを横にスクロールできます。',
          en: 'A pricing comparison section that helps visitors choose a plan by comparing its features.',
        },
        titleEn: '03 - Compare plans by feature',
      },
    ],
  },
  about: {
    label: 'About',
    description: {
      ja: '会社案内やAboutページに置く、挨拶・沿革・会社情報のセクション。',
      en: 'Sections for company profile and About pages: greetings, history and basic information.',
    },
    items: [
      {
        id: 'about01',
        title: '01 - 写真つきの代表挨拶',
        description: {
          ja: '見出しの下に、写真と役職・氏名つきの挨拶文を並べるセクションです。breakpoint「md」以下は1カラムになり、アイテムが縦に並びます。',
          en: 'A greeting section with a portrait, title and name beside the message. Below the "md" breakpoint, it switches to a single column with items stacked vertically.',
        },
        titleEn: '01 - Greeting with a portrait',
      },
      {
        id: 'about02',
        title: '02 - 署名つきの代表メッセージ',
        description: {
          ja: '大きな飾り文字と見出しの下にメッセージを置き、末尾に丸い写真と役職・氏名を添えるセクションです。',
          en: 'A message section with a large decorative word and heading, closed by a round portrait with title and name.',
        },
        titleEn: '02 - Message with a signature',
      },
      {
        id: 'about03',
        title: '03 - 罫線で区切る沿革',
        description: {
          ja: '年号と出来事を罫線で区切って時系列に並べる沿革セクションです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A history section that lists years and events in order, separated by dividing lines. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
        titleEn: '03 - Timeline with dividing lines',
      },
      {
        id: 'about04',
        title: '04 - 年号を大きく見せる沿革',
        description: {
          ja: '斜体の大きな年号を軸に出来事を並べる沿革セクションです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A history section built around large italic years. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
        titleEn: '04 - Timeline with large years',
      },
      {
        id: 'about05',
        title: '05 - 会社概要と地図',
        description: {
          ja: '地図と会社概要の定義リストを縦に並べるセクションです。内容は全てダミーコンテンツです。',
          en: 'A company profile section stacking a map and a definition-list table. All content is placeholder text.',
        },
        titleEn: '05 - Company profile with a map',
      },
      {
        id: 'about06',
        title: '06 - 会社概要と沿革の表',
        description: {
          ja: '会社概要と沿革の定義リストを2カラムで並べるセクションです。breakpoint「md」以下は1カラムになります。内容は全てダミーコンテンツです。',
          en: 'A section placing company profile and history definition lists in two columns. Below the "md" breakpoint, it switches to a single column. All content is placeholder text.',
        },
        titleEn: '06 - Profile and history tables',
      },
      {
        id: 'about07',
        title: '07 - 店舗一覧',
        description: {
          ja: '店舗ごとの情報とリンクボタンを並べる一覧セクションです。breakpoint「md」以下は1カラムになり、アイテムが縦に並びます。内容は全てダミーコンテンツです。',
          en: 'A list section with details and link buttons for each shop. Below the "md" breakpoint, it switches to a single column with items stacked vertically. All content is placeholder text.',
        },
        titleEn: '07 - Shop list',
      },
      {
        id: 'about08',
        title: '08 - 拠点一覧',
        description: {
          ja: '拠点ごとの情報とリンクボタンを並べる一覧セクションです。breakpoint「md」以下は1カラムになり、アイテムが縦に並びます。内容は全てダミーコンテンツです。',
          en: 'A list section with details and link buttons for each office. Below the "md" breakpoint, it switches to a single column with items stacked vertically. All content is placeholder text.',
        },
        titleEn: '08 - Office list',
      },
    ],
  },
  member: {
    label: 'Member',
    description: {
      ja: 'メンバーやスタッフを一覧で紹介するセクション。',
      en: 'Sections that introduce team members or staff as a list.',
    },
    items: [
      {
        id: 'member01',
        title: 'Member01',
        description: {
          ja: 'メンバー一覧用のパターンです。アイテムの最小幅が設定されており、コンテナ幅に応じてカラム数が変化します。',
          en: 'A team member list pattern. Items have a minimum width set, and the number of columns changes according to the container width.',
        },
      },
      {
        id: 'member02',
        title: 'Member02',
        description: {
          ja: 'メンバー一覧用のパターンです。アイテムの最小幅が設定されており、コンテナ幅に応じてカラム数が変化します。',
          en: 'A team member list pattern. Items have a minimum width set, and the number of columns changes according to the container width.',
        },
      },
      {
        id: 'member03',
        title: 'Member03',
        description: {
          ja: 'メンバー一覧用のパターンです。アイテムの最小幅が設定されており、コンテナ幅に応じてカラム数が変化します。',
          en: 'A team member list pattern. Items have a minimum width set, and the number of columns changes according to the container width.',
        },
      },
      {
        id: 'member04',
        title: 'Member04',
        description: {
          ja: 'メンバー一覧用のパターンです。アイテムの最小幅が設定されており、コンテナ幅に応じてカラム数が変化します。',
          en: 'A team member list pattern. Items have a minimum width set, and the number of columns changes according to the container width.',
        },
      },
      {
        id: 'member05',
        title: 'Member05',
        description: {
          ja: 'メンバー一覧用のパターンです。アイテムの最小幅が設定されており、コンテナ幅に応じてカラム数が変化します。',
          en: 'A team member list pattern. Items have a minimum width set, and the number of columns changes according to the container width.',
        },
      },
    ],
  },
  testimonials: {
    label: 'Testimonials',
    description: {
      ja: '利用者の声やレビューを紹介するセクション。',
      en: 'Sections that showcase customer voices and reviews.',
    },
    items: [
      {
        id: 'testimonials01',
        title: 'Testimonials01',
        description: {
          ja: 'お客様の声用のパターンです。アイテムの最小幅が設定されており、コンテナ幅に応じてカラム数が変化します。',
          en: 'A testimonials pattern. Items have a minimum width set, and the number of columns changes according to the container width.',
        },
      },
      {
        id: 'testimonials02',
        title: '02 - 導入成果と担当者の声',
        description: {
          ja: '成果を伝える見出しに、担当者の写真と声を組み合わせたセクションです。',
          en: 'A customer story highlighting measurable results and feedback from a company representative.',
        },
        titleEn: '02 - Customer results and feedback',
      },
      {
        id: 'testimonials03',
        title: '03 - カードを使わずに並べるお客様の声',
        description: {
          ja: 'アイコン付きの見出し・本文・属性を、カードを使わずに並べたお客様の声です。subgridで各アイテムの行の位置を揃え、コンテナ幅に応じてカラム数が変化します。',
          en: 'Testimonials that list a headline with an avatar, the comment and the customer details without cards. Subgrid aligns the rows across items, and the number of columns changes according to the container width.',
        },
        titleEn: '03 - Testimonials without cards',
      },
    ],
  },
  posts: {
    label: 'Posts',
    description: {
      ja: 'ニュース・ブログ記事・制作実績など、投稿を一覧で紹介するセクション。',
      en: 'Sections that showcase news, blog posts, portfolio works and other entries.',
    },
    items: [
      {
        id: 'posts01',
        title: 'Posts01',
        description: {
          ja: 'お知らせ用のパターンです。breakpoint「sm」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A news/announcements pattern. Below the "sm" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'posts02',
        title: 'Posts02',
        description: {
          ja: 'お知らせ用のパターンです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A news/announcements pattern. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'posts03',
        title: 'Posts03',
        description: {
          ja: 'お知らせ用のパターンです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A news/announcements pattern. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'posts04',
        title: 'Posts04',
        description: {
          ja: '実績用のパターンです。アイテムの最小幅が設定されており、コンテナ幅に応じてカラム数が変化します。',
          en: 'A portfolio/works pattern. Items have a minimum width set, and the number of columns changes according to the container width.',
        },
      },
    ],
  },
  faq: {
    label: 'FAQ',
    description: {
      ja: 'よくある質問と回答をまとめたセクション。質問と回答の対応関係を示す場合はdl・dt・ddでマークアップします。',
      en: 'Sections that collect frequently asked questions and answers. Use dl, dt and dd to express the question-answer relationship.',
    },
    items: [
      {
        id: 'faq01',
        title: 'FAQ01',
        description: {
          ja: '質問と回答を常に表示するシンプルなFAQセクションです。dl・dt・ddでマークアップしています。',
          en: 'A simple FAQ section that always shows both questions and answers, marked up with dl, dt and dd.',
        },
      },
      {
        id: 'faq02',
        title: '02 - 罫線で区切るアコーディオン',
        description: {
          ja: '罫線で区切ったAccordionで回答を開閉するFAQセクションです。質問にホバーすると背景色が付きます。',
          en: 'An FAQ section with an Accordion separated by dividing lines. Questions get a background color on hover.',
        },
        titleEn: '02 - Accordion with dividing lines',
      },
      {
        id: 'faq03',
        title: 'FAQ03',
        description: {
          ja: 'Accordionを使って回答を開閉できるFAQセクションです。項目数が多い場合に適しています。',
          en: 'An FAQ section using Accordion so answers can be expanded and collapsed. Suited to lists with many items.',
        },
      },
    ],
  },
  cta: {
    label: 'CTA',
    description: {
      ja: '問い合わせや申し込みなど、次の行動を促すセクション。',
      en: 'Sections that prompt the next action, such as making an inquiry or signing up.',
    },
    items: [
      {
        id: 'cta01',
        title: 'CTA01',
        description: {
          ja: 'CTA用のパターンです。breakpoint「md」以下は1カラムになり、アイテムが縦に並びます。',
          en: 'A CTA pattern. Below the "md" breakpoint, it switches to a single column layout with items stacked vertically.',
        },
      },
      {
        id: 'cta02',
        title: '02 - 横長の申し込みCTA',
        description: {
          ja: '写真を使わず、一言のメッセージとボタンで申し込みを促す横長のCTAです。',
          en: 'A horizontal CTA encouraging sign-ups with a short message and a button, without photos.',
        },
        titleEn: '02 - A horizontal sign-up CTA',
      },
      {
        id: 'cta03',
        draft: true,
        title: '03 - ニュースレター登録',
        description: {
          ja: 'メール入力欄を備えた登録セクションです。入力の確認を試せますが、実際の送信や登録は行いません。',
          en: 'A sign-up section with an email field. Input validation can be tried, but no data is submitted or registered.',
        },
        titleEn: '03 - Newsletter sign-up',
      },
      {
        id: 'cta04',
        draft: true,
        title: 'CTA04',
        description: {
          ja: '1枚の背景写真の中央に見出し・説明・ボタンを置き、旅の相談へ案内するCTAです。',
          en: 'A CTA inviting visitors to discuss their travel plans, with a heading, description and button centered over a single background photo.',
        },
      },
    ],
  },
  'page-links': {
    label: 'Page Links',
    description: {
      ja: '画像や説明文を添えて、関連ページやおすすめコンテンツへ案内するリンク集。',
      en: 'Collections of links with images and descriptions that guide visitors to related pages and recommended content.',
    },
    items: [
      {
        id: 'page-links01',
        title: 'PageLinks01',
        description: {
          ja: '特徴・注目コンテンツ用のパターンです。breakpoint「md」以下は1カラムで表示され、アイテムが縦に並びます。',
          en: 'A pattern for featured content. Below the "md" breakpoint, it displays in a single column with items stacked vertically.',
        },
      },
      {
        id: 'page-links02',
        title: 'PageLinks02',
        description: {
          ja: '特徴・注目コンテンツ用のパターンです。breakpoint「md」以下でレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A pattern for featured content. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'page-links03',
        title: 'PageLinks03',
        description: {
          ja: '特徴・注目コンテンツ用のパターンです。breakpoint「md」以下は1カラムになり、アイテムが縦に並びます。',
          en: 'A pattern for featured content. Below the "md" breakpoint, it switches to a single column layout with items stacked vertically.',
        },
      },
      {
        id: 'page-links04',
        title: 'PageLinks04',
        description: {
          ja: '特徴・注目コンテンツ用のパターンです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A pattern for featured content. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'page-links05',
        title: 'PageLinks05',
        description: {
          ja: '特徴・注目コンテンツ用のパターンです。breakpoint「md」以下は2カラム、「sm」以下は1カラムで表示されます。',
          en: 'A pattern for featured content. Below the "md" breakpoint, it displays in 2 columns, and below "sm" it switches to a single column.',
        },
      },
      {
        id: 'page-links06',
        title: 'PageLinks06',
        description: {
          ja: 'ナビゲーション用のパターンです。アイテムの最小幅が設定されており、コンテナ幅に応じてカラム数が変化します。',
          en: 'A navigation pattern. Items have a minimum width set, and the number of columns changes according to the container width.',
        },
      },
      {
        id: 'page-links07',
        title: 'PageLinks07',
        description: {
          ja: 'ナビゲーション用のパターンです。アイテムの最小幅が設定されており、コンテナ幅に応じてカラム数が変化します。breakpoint「md」以下は1カラムで表示されます。',
          en: 'A navigation pattern. Items have a minimum width set, and the number of columns changes according to the container width. Below the "md" breakpoint, it displays in a single column.',
        },
      },
    ],
  },
  general: {
    label: 'General',
    description: {
      ja: '特定の用途に限定しない汎用的なセクション構成。見出し・本文・画像の組み合わせ方の作例です。',
      en: 'General-purpose section structures that are not tied to a specific use case. Examples of combining headings, body text and images.',
    },
    items: [
      {
        id: 'general01',
        title: 'General01',
        description: {
          ja: 'セクション用のパターンです。',
          en: 'A section pattern.',
        },
      },
      {
        id: 'general02',
        title: 'General02',
        description: {
          ja: 'セクション用のパターンです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A section pattern. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'general03',
        title: 'General03',
        description: {
          ja: 'セクション用のパターンです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A section pattern. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'general04',
        title: 'General04',
        description: {
          ja: 'セクション用のパターンです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A section pattern. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'general05',
        title: 'General05',
        description: {
          ja: 'セクション用のパターンです。breakpoint「md」以下は1カラムで表示され、アイテムが縦に並びます。',
          en: 'A section pattern. Below the "md" breakpoint, it displays in a single column with items stacked vertically.',
        },
      },
      {
        id: 'general06',
        title: 'General06',
        description: {
          ja: 'セクション用のパターンです。',
          en: 'A section pattern.',
        },
      },
      {
        id: 'general07',
        title: 'General07',
        description: {
          ja: 'セクション用のパターンです。breakpoint「md」以下は1カラムで表示され、アイテムが縦に並びます。',
          en: 'A section pattern. Below the "md" breakpoint, it displays in a single column with items stacked vertically.',
        },
      },
      {
        id: 'general08',
        title: 'General08',
        description: {
          ja: 'セクション用のパターンです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A section pattern. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'general09',
        title: 'General09',
        description: {
          ja: 'セクション用のパターンです。',
          en: 'A section pattern.',
        },
      },
      {
        id: 'general10',
        title: 'General10',
        description: {
          ja: 'セクション用のパターンです。',
          en: 'A section pattern.',
        },
      },
      {
        id: 'general11',
        title: 'General11',
        draft: true,
        description: {
          ja: 'セクション用のパターンです。breakpoint「md」以下はレイアウトが変わり、アイテムの並びが変更されます。',
          en: 'A section pattern. Below the "md" breakpoint, the layout changes and item arrangement is adjusted.',
        },
      },
      {
        id: 'general12',
        title: 'General12',
        draft: true,
        description: {
          ja: 'セクション用のパターンです。breakpoint「md」以下は1カラムで表示され、アイテムが縦に並びます。',
          en: 'A section pattern. Below the "md" breakpoint, it displays in a single column with items stacked vertically.',
        },
      },
    ],
  },
  process: {
    label: 'Process',
    description: {
      ja: '利用開始やサービス提供の手順を伝えるセクション。',
      en: 'Sections explaining the steps to get started or use a service.',
    },
    items: [
      {
        id: 'process01',
        draft: true,
        title: '01 - はじめるまでの3ステップ',
        description: {
          ja: '番号と罫線を使って、利用開始までの手順を順番に伝えるセクションです。',
          en: 'A section explaining the steps to get started with numbers and dividing lines.',
        },
        titleEn: '01 - Three steps to get started',
      },
      {
        id: 'process02',
        draft: true,
        title: 'Process02',
        description: {
          ja: '番号付きのカードを縦に並べた、手順紹介用のパターンです。',
          en: 'A process pattern with numbered cards arranged vertically.',
        },
      },
    ],
  },
  stats: {
    label: 'Stats',
    description: {
      ja: '実績・規模・成果を数字で伝えるセクション。',
      en: 'Sections that communicate results, scale and achievements through numbers.',
    },
    items: [
      {
        id: 'stats01',
        draft: true,
        title: '01 - 数字で伝える実績',
        description: {
          ja: '説明文と大きな数字を非対称に配置して、実績や規模を伝えるセクションです。',
          en: 'An asymmetrical section pairing descriptions with large numbers to communicate results and scale.',
        },
        titleEn: '01 - Results in numbers',
      },
    ],
  },
  logos: {
    label: 'Logo Cloud',
    description: {
      ja: '導入企業やパートナーのロゴを並べるセクション。',
      en: 'Sections displaying customer and partner logos.',
    },
    items: [
      {
        id: 'logos01',
        draft: true,
        title: '01 - 導入企業のロゴ',
        description: {
          ja: '余白と文字のロゴで導入企業を紹介するセクションです。企業名は架空のサンプルです。',
          en: 'A section introducing customers with text-based logos and generous spacing. Company names are fictional samples.',
        },
        titleEn: '01 - Customer logos',
      },
    ],
  },
  footer: {
    label: 'Footer',
    description: {
      ja: 'ページ末尾に置くカテゴリ一覧やサイト内リンクをまとめたセクション。',
      en: 'Sections at the bottom of a page that collect categories and site navigation links.',
    },
    items: [
      {
        id: 'footer01',
        title: 'Footer01',
        draft: true,
        description: {
          ja: 'ナビゲーション用のパターンです。アイテムの最小幅が設定されており、コンテナ幅に応じてカラム数が変化します。',
          en: 'A navigation pattern. Items have a minimum width set, and the number of columns changes according to the container width.',
        },
      },
    ],
  },
} satisfies Record<string, PatternCategory>;

export type PatternCategoryId = keyof typeof patterns;

export { patterns };

export const categoryIds: PatternCategoryId[] = [
  'hero',
  'feature',
  'pricing',
  'about',
  'member',
  'testimonials',
  'posts',
  'faq',
  'cta',
  'page-links',
  'general',
  'process',
  'stats',
  'logos',
  'footer',
];

// 翻訳前の新規例と、片方の言語だけで整理した例を公開対象から分ける。
export function isPatternAvailable(item: Pick<PatternItem, 'languages'>, lang: LangCode): boolean {
  return !item.languages || item.languages.includes(lang);
}
