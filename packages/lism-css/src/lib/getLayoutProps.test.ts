import { describe, test, expect } from 'vitest';
import getLayoutProps from './getLayoutProps';

describe('getLayoutProps', () => {
  describe('基本的な動作', () => {
    test('layout クラスが primitiveClass に追加される', () => {
      const result = getLayoutProps('flex', {});
      expect(result.primitiveClass).toContain('l--flex');
    });

    test('primitiveClass が未定義の場合でも layout クラスが追加される', () => {
      const result = getLayoutProps('stack', {});
      expect(result.primitiveClass).toEqual(['l--stack']);
    });
  });

  describe('grid レイアウト', () => {
    test('primitiveClass に l--grid が追加される', () => {
      const result = getLayoutProps('grid', {});
      expect(result.primitiveClass).toEqual(['l--grid']);
    });
  });

  describe('withSide レイアウト', () => {
    test('sideW が指定された場合、style に --sideW が設定される', () => {
      const result = getLayoutProps('withSide', { sideW: '200px' });
      expect(result.style).toBeDefined();
      expect(result.style?.['--sideW']).toBe('200px');
    });

    test('mainW が指定された場合、style に --mainW が設定される', () => {
      const result = getLayoutProps('withSide', { mainW: '800px' });
      expect(result.style).toBeDefined();
      expect(result.style?.['--mainW']).toBe('800px');
    });

    test('sideW と mainW の両方が指定された場合、両方とも設定される', () => {
      const result = getLayoutProps('withSide', {
        sideW: '200px',
        mainW: '800px',
      });
      expect(result.style?.['--sideW']).toBe('200px');
      expect(result.style?.['--mainW']).toBe('800px');
    });

    test('sideW が未指定の場合、--sideW は設定されない', () => {
      const result = getLayoutProps('withSide', { sideW: undefined });
      expect(result.style?.['--sideW']).toBeUndefined();
    });

    test('既存の style がある場合、マージされる', () => {
      const result = getLayoutProps('withSide', {
        sideW: '200px',
        style: { color: 'red' },
      });
      expect(result.style?.color).toBe('red');
      expect(result.style?.['--sideW']).toBe('200px');
    });

    test('sz トークンが適用される', () => {
      const result = getLayoutProps('withSide', { sideW: 's' });
      expect(result.style?.['--sideW']).toBe('var(--sz--s)');
    });

    test('sideW と mainW 以外のpropsは維持される', () => {
      const result = getLayoutProps('withSide', {
        sideW: '200px',
        mainW: '800px',
        otherProp: 'value',
      });
      expect(result.otherProp).toBe('value');
      expect((result as unknown as Record<string, unknown>).sideW).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).mainW).toBeUndefined();
    });
  });

  describe('autoColumns レイアウト', () => {
    test('autoFit が true の場合、style に --autoMode が設定される', () => {
      const result = getLayoutProps('autoColumns', { autoFit: true });
      expect(result.style).toBeDefined();
      expect(result.style?.['--autoMode']).toBe('auto-fit');
    });

    test('autoFit が false の場合、--autoMode は設定されない', () => {
      const result = getLayoutProps('autoColumns', { autoFit: false });
      expect(result.style?.['--autoMode']).toBeUndefined();
    });

    test('autoFit が未定義の場合、--autoMode は設定されない', () => {
      const result = getLayoutProps('autoColumns', {});
      expect(result.style?.['--autoMode']).toBeUndefined();
    });
  });

  describe('flow レイアウト', () => {
    test('flow がトークン値の場合、primitiveClass に -flow:{value} が追加される', () => {
      const result = getLayoutProps('flow', { flow: 's' });
      expect(result.primitiveClass).toContain('-flow:s');
      expect(result.primitiveClass).toContain('l--flow');
    });

    test('flow がトークン値でない場合、primitiveClass に -flow: が追加され、style に --flow が設定される', () => {
      const result = getLayoutProps('flow', { flow: '2rem' });
      expect(result.primitiveClass).toContain('-flow:');
      expect(result.primitiveClass).toContain('l--flow');
      expect(result.style?.['--flow']).toBe('2rem');
    });

    test('flow が数値トークンの場合、space トークンとして処理される', () => {
      const result = getLayoutProps('flow', { flow: 20 });
      expect(result.style?.['--flow']).toBe('var(--s20)');
    });

    test('flow が未定義の場合、何も追加されない', () => {
      const result = getLayoutProps('flow', {});
      expect(result.primitiveClass).toEqual(['l--flow']);
      expect(result.style).toBeUndefined();
    });

    test('flow が 0 の場合、何も変換されない', () => {
      const result = getLayoutProps('flow', { flow: 0 });
      expect(result.primitiveClass).toEqual(['l--flow']);
      expect(result.style).toBeUndefined();
    });

    test('既存の primitiveClass がある場合、マージされる', () => {
      const result = getLayoutProps('flow', {
        primitiveClass: ['existing'],
        flow: 's',
      });
      expect(result.primitiveClass).toContain('existing');
      expect(result.primitiveClass).toContain('l--flow');
      expect(result.primitiveClass).toContain('-flow:s');
    });
  });

  describe('switchColumns レイアウト', () => {
    test('breakSize が指定された場合、style に --breakSize が設定される', () => {
      const result = getLayoutProps('switchColumns', { breakSize: '600px' });
      expect(result.style).toBeDefined();
      expect(result.style?.['--breakSize']).toBe('600px');
    });

    test('breakSize が未定義の場合、--breakSize は設定されない', () => {
      const result = getLayoutProps('switchColumns', {});
      expect(result.style?.['--breakSize']).toBeUndefined();
    });

    test('breakSize が 0 の場合、--breakSize は設定されない', () => {
      const result = getLayoutProps('switchColumns', { breakSize: 0 });
      expect(result.style?.['--breakSize']).toBeUndefined();
    });

    test('breakSize が空文字の場合、--breakSize は設定されない', () => {
      const result = getLayoutProps('switchColumns', { breakSize: '' });
      expect(result.style?.['--breakSize']).toBeUndefined();
    });

    test('sz トークンが適用される', () => {
      const result = getLayoutProps('switchColumns', { breakSize: 'm' });
      expect(result.style?.['--breakSize']).toBe('var(--sz--m)');
    });
  });

  describe('tileGrid レイアウト', () => {
    test('primitiveClass に l--tileGrid が追加される', () => {
      const result = getLayoutProps('tileGrid', {});
      expect(result.primitiveClass).toEqual(['l--tileGrid']);
    });

    test('既存の primitiveClass がある場合、マージされる', () => {
      const result = getLayoutProps('tileGrid', { primitiveClass: ['existing'] });
      expect(result.primitiveClass).toContain('l--tileGrid');
      expect(result.primitiveClass).toContain('existing');
    });

    test('その他のpropsはそのまま維持される', () => {
      const result = getLayoutProps('tileGrid', { style: { color: 'red' } });
      expect(result.style?.color).toBe('red');
    });
  });
});
