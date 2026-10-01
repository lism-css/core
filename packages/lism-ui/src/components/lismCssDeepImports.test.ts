import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const testFile = fileURLToPath(import.meta.url);
const srcDir = resolve(dirname(testFile), '..');

// `lism-cli ui add`でコピーされたコードは利用者のlism-cssを直接importする。
// uiのソースが一度でも使った深いパスと名前は、使わなくなっても1.xの間はできれば残す。やむを得ず壊すときはこの一覧からも外す（docs/decisions.md）
const PROTECTED: Record<string, string[]> = {
  'lism-css/lib/getLismProps': ['default', 'LayoutType'],
  'lism-css/lib/getMaybeCssVar': ['default'],
  'lism-css/lib/helper/atts': ['default'],
  'lism-css/lib/types/LayoutProps': ['FlowLayoutProps', 'GridLayoutProps'],
  'lism-css/react/atomic/Icon/getProps': ['IconOwnProps'],
};

const DEEP_IMPORT = /import\s+(?:type\s+)?([\w$\s{},*]+?)\s+from\s+['"](lism-css\/(?:lib|react|astro)\/[^'"]+)['"]/g;

function importedNames(clause: string): string[] {
  const names: string[] = [];
  const named = clause.match(/\{([^}]*)\}/);
  for (const part of named?.[1].split(',') ?? []) {
    const name = part
      .trim()
      .replace(/^type\s+/, '')
      .split(/\s+as\s+/)[0];
    if (name) names.push(name);
  }
  const rest = clause
    .replace(/\{[^}]*\}/, '')
    .replace(/,/g, '')
    .trim();
  if (rest) names.push(rest.startsWith('*') ? '*' : 'default');
  return names;
}

const used = new Map<string, Set<string>>();
for (const file of readdirSync(srcDir, { recursive: true, encoding: 'utf8' })) {
  if (!/\.(?:[jt]sx?|astro)$/.test(file)) continue;
  for (const [, clause, spec] of readFileSync(resolve(srcDir, file), 'utf8').matchAll(DEEP_IMPORT)) {
    const names = used.get(spec) ?? new Set<string>();
    importedNames(clause).forEach((name) => names.add(name));
    used.set(spec, names);
  }
}

const compilerOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  noLib: true,
  types: [],
};

function typeExportsOf(spec: string): string[] {
  const fileName = ts.resolveModuleName(spec, testFile, compilerOptions, ts.sys).resolvedModule?.resolvedFileName;
  if (!fileName) throw new Error(`${spec} の型定義を解決できない`);
  const program = ts.createProgram([fileName], compilerOptions);
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(fileName)!);
  return moduleSymbol ? checker.getExportsOfModule(moduleSymbol).map((symbol) => symbol.name) : [];
}

describe('lism-cssの深いパスのimport', () => {
  it('uiのソースが使う深いパスと名前がPROTECTEDにある', () => {
    expect(used.size).toBeGreaterThan(0);
    for (const [spec, names] of used) {
      expect(PROTECTED[spec], spec).toEqual(expect.arrayContaining([...names]));
    }
  });

  it.each(Object.entries(PROTECTED))('%s の型定義が %j をexportしている', (spec, names) => {
    expect(typeExportsOf(spec)).toEqual(expect.arrayContaining(names));
  });

  it.each(Object.keys(PROTECTED).filter((spec) => PROTECTED[spec].includes('default')))('%s のdefault exportを実行時に読み込める', async (spec) => {
    const mod = await import(/* @vite-ignore */ spec);
    expect(mod.default).toBeTypeOf('function');
  });
});
