function headingLevel(line: string): number {
  const m = line.match(/^(#{1,6})\s/);
  return m ? m[1].length : 0;
}

/** 指定見出しから同レベル以上の次の見出しまでを抽出する。headingは#の有無を問わない。 */
export function extractSection(md: string, heading: string): string {
  const headingText = heading.replace(/^#+\s*/, '').trim();
  const lines = md.split('\n');

  let startIdx = -1;
  let level = 0;

  for (let i = 0; i < lines.length; i++) {
    const lv = headingLevel(lines[i]);
    if (lv > 0 && lines[i].replace(/^#+\s*/, '').trim() === headingText) {
      startIdx = i;
      level = lv;
      break;
    }
  }

  if (startIdx === -1) return '';

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const lv = headingLevel(lines[i]);
    if (lv > 0 && lv <= level) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx).join('\n').trimEnd();
}

/** 冒頭（frontmatter を除き、最初の `##` 見出しの手前まで）を返す。H1 は含む。 */
export function extractPreamble(md: string): string {
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  const lines = body.split('\n');
  const endIdx = lines.findIndex((line) => headingLevel(line) >= 2);
  return (endIdx === -1 ? lines : lines.slice(0, endIdx)).join('\n').trim();
}

export function listHeadings(md: string): { level: number; text: string; line: number }[] {
  return md.split('\n').flatMap((line, i) => {
    const lv = headingLevel(line);
    if (lv === 0) return [];
    return [{ level: lv, text: line.replace(/^#+\s*/, '').trim(), line: i }];
  });
}

// --- Property Class テーブルパーサー ---

export interface PropRow {
  prop: string;
  cssProperty: string;
  sectionName: string;
  presetColumn: string;
}

/** Property Classの対象テーブルを解析してPropRowへ変換する。 */
export function parsePropRows(md: string): PropRow[] {
  const lines = md.split('\n');
  const rows: PropRow[] = [];

  let currentSection = '';
  let inPropTable = false;

  // 見出しと対象テーブルの範囲を追跡する。
  for (const line of lines) {
    const lv = headingLevel(line);

    if (lv >= 2) {
      currentSection = line.replace(/^#+\s*/, '').trim();
      inPropTable = false;
      continue;
    }

    if (line.includes('Prop') && line.includes('CSS プロパティ')) {
      inPropTable = true;
      continue;
    }

    if (inPropTable && /^\|[-\s|:]+\|/.test(line)) {
      continue;
    }

    if (inPropTable && !line.startsWith('|')) {
      inPropTable = false;
      continue;
    }

    // 対象テーブルの各行をPropRowへ変換する。
    if (inPropTable && line.startsWith('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 2) {
        const prop = cells[0].replace(/`/g, '').trim();
        const cssPropertyRaw = cells[1].replace(/`/g, '').trim();
        const cssProperty = cssPropertyRaw
          .replace(/（[^）]*）$/, '')
          .replace(/\([^)]*\)$/, '')
          .trim();
        if (prop && cssProperty) {
          const presetColumn = cells.length >= 3 ? cells[2].replace(/`/g, '').trim() : '';
          rows.push({ prop, cssProperty, sectionName: currentSection, presetColumn });
        }
      }
    }
  }

  return rows;
}

// --- コンポーネント検索 ---

/** 各コンポーネントが`## ComponentName`で始まる文書向け。 */
export function findComponentByHeading(md: string, name: string): string {
  return extractSection(md, name);
}

/**
 * Markdown 内のテーブルセル（`` `<ComponentName>` ``）からコンポーネントを含む
 * `##` セクション全体を返す。
 * components-core.md のように複数コンポーネントが同一セクションに列挙されている場合に使う。
 */
export function findComponentInTables(md: string, name: string): string {
  const nameLower = name.toLowerCase();
  const lines = md.split('\n');

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\`?<${escaped}>?\`?`, 'i');

  // コンポーネントを含むテーブル行を探す。
  let targetLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('|') && (pattern.test(lines[i]) || lines[i].toLowerCase().includes(`\`${nameLower}\``))) {
      targetLineIdx = i;
      break;
    }
  }

  if (targetLineIdx === -1) return '';

  // 対象行を含む##節の範囲を決める。
  let sectionStart = -1;
  let sectionLevel = 0;
  for (let i = targetLineIdx; i >= 0; i--) {
    const lv = headingLevel(lines[i]);
    if (lv === 2) {
      sectionStart = i;
      sectionLevel = lv;
      break;
    }
  }

  if (sectionStart === -1) return lines.slice(0, targetLineIdx + 20).join('\n');

  let sectionEnd = lines.length;
  for (let i = sectionStart + 1; i < lines.length; i++) {
    const lv = headingLevel(lines[i]);
    if (lv > 0 && lv <= sectionLevel) {
      sectionEnd = i;
      break;
    }
  }

  return lines.slice(sectionStart, sectionEnd).join('\n').trimEnd();
}
