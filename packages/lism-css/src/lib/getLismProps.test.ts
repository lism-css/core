import { describe, test, expect, vi } from 'vitest';
import getLismProps, { type LismProps } from './getLismProps';

describe('getLismProps', () => {
  describe('基本動作', () => {
    test('空のpropsを渡すと空オブジェクトを返す', () => {
      const result = getLismProps({});
      expect(result).toEqual({});
    });

    test('layoutのみ指定した場合、レイアウトクラスが追加される', () => {
      const result = getLismProps({ layout: 'flow' });
      expect(result.className).toContain('l--flow');
    });

    test('layout: grid で gtc が CSS変数として出力される', () => {
      const result = getLismProps({
        layout: 'grid',
        gtc: '1fr 1fr',
      });
      expect(result.className).toContain('l--grid');
      expect(result.style?.['--gtc']).toBe('1fr 1fr');
    });

    test('classNameが正しく設定される', () => {
      const result = getLismProps({ className: 'custom-class' });
      expect(result.className).toBe('custom-class');
    });

    test('Astroのclass属性が処理される', () => {
      const result = getLismProps({ class: 'astro-class' });
      expect(result.className).toBe('astro-class');
    });

    test('className と class が両方指定された場合、両方マージされる', () => {
      const result = getLismProps({
        className: 'c--foo',
        class: 'user-class c--foo',
      });
      const cls = result.className as string;
      expect(cls).toContain('c--foo');
      expect(cls).toContain('user-class');
      // 重複除去されて c--foo は 1 回だけ
      expect(cls.match(/c--foo/g)?.length).toBe(1);
    });
  });

  describe('atomic prop', () => {
    test('atomic=divider で a--divider が追加される', () => {
      const result = getLismProps({ atomic: 'divider' });
      expect(result.className).toContain('a--divider');
    });

    test('atomic=spacer で a--spacer が追加され、w がスペーストークンに変換される', () => {
      const result = getLismProps({ atomic: 'spacer', w: '20' });
      expect(result.className).toContain('a--spacer');
      expect(result.className).toContain('-w');
      expect(result.style?.['--w']).toBe('var(--s20)');
    });

    test('atomic=spacer で h もスペーストークンに変換される', () => {
      const result = getLismProps({ atomic: 'spacer', h: '40' });
      expect(result.className).toContain('a--spacer');
      expect(result.style?.['--h']).toBe('var(--s40)');
    });

    test('atomic=decorator で size が ar=1/1 と w に展開される', () => {
      const result = getLismProps({ atomic: 'decorator', size: '100px' } as LismProps & Record<string, unknown>);
      expect(result.className).toContain('a--decorator');
      expect(result.className).toContain('-ar:1/1');
      expect(result.style?.['--w']).toBe('100px');
    });

    test('atomic=icon で a--icon が追加される', () => {
      const result = getLismProps({ atomic: 'icon' });
      expect(result.className).toContain('a--icon');
    });

    test('atomic と layout の両方指定時、a-- → l-- の順で出力される', () => {
      const result = getLismProps({ atomic: 'divider', layout: 'box' });
      const cls = result.className as string;
      expect(cls.indexOf('a--divider')).toBeLessThan(cls.indexOf('l--box'));
    });
  });

  describe('出力順', () => {
    test('className → primitive → set → trait → util → property の順で出力される', () => {
      const result = getLismProps({
        className: 'c--box',
        layout: 'flex',
        set: 'hov',
        isContainer: true,
        util: 'cbox',
        p: '20',
      });
      const cls = result.className as string;
      expect(cls.indexOf('c--box')).toBeLessThan(cls.indexOf('l--flex'));
      expect(cls.indexOf('l--flex')).toBeLessThan(cls.indexOf('set--hov'));
      expect(cls.indexOf('set--hov')).toBeLessThan(cls.indexOf('is--container'));
      expect(cls.indexOf('is--container')).toBeLessThan(cls.indexOf('u--cbox'));
      expect(cls.indexOf('u--cbox')).toBeLessThan(cls.indexOf('-p:20'));
    });
  });

  describe('ref処理', () => {
    test('forwardedRefが設定される', () => {
      const mockRef = { current: null };
      const result = getLismProps({ forwardedRef: mockRef });
      expect(result.ref).toBe(mockRef);
    });
  });

  describe('style処理', () => {
    test('styleが正しく渡される', () => {
      const result = getLismProps({
        style: { color: 'red', fontSize: '16px' },
      });
      expect(result.style).toEqual({ color: 'red', fontSize: '16px' });
    });

    test('空のstyleは除外される', () => {
      const result = getLismProps({ style: {} });
      expect(result.style).toBeUndefined();
    });
  });

  describe('css prop処理', () => {
    test('cssプロパティがstyleに変換される', () => {
      const result = getLismProps({
        css: { margin: '10px', padding: '20px' },
      });
      expect(result.style).toEqual({ margin: '10px', padding: '20px' });
    });
  });

  describe('Lism Props処理 - プリセット値', () => {
    test('fz: プリセット値がユーティリティクラスになる', () => {
      const result = getLismProps({ fz: 'xl' });
      expect(result.className).toContain('-fz:xl');
    });

    test('fw: トークン値がユーティリティクラスになる', () => {
      const result = getLismProps({ fw: 'bold' });
      expect(result.className).toContain('-fw:bold');
    });

    test('ta: プリセット値がユーティリティクラスになる', () => {
      const result = getLismProps({ ta: 'center' });
      expect(result.className).toContain('-ta:center');
    });

    test('d: プリセット値がユーティリティクラスになる', () => {
      const result = getLismProps({ d: 'none' });
      expect(result.className).toContain('-d:none');
    });

    test('c / bgc / bdc: keycolor がユーティリティクラスになる（#479）', () => {
      const result = getLismProps({ c: 'keycolor', bgc: 'keycolor', bdc: 'keycolor' });
      expect(result.className).toContain('-c:keycolor');
      expect(result.className).toContain('-bgc:keycolor');
      expect(result.className).toContain('-bdc:keycolor');
      // クラス化されるので style 属性側には出力されない
      expect(result.style?.['--c']).toBeUndefined();
      expect(result.style?.['--bgc']).toBeUndefined();
      expect(result.style?.['--bdc']).toBeUndefined();
    });
  });

  describe('Lism Props処理 - カスタム値', () => {
    test('fz: カスタム値は変数として出力される', () => {
      const result = getLismProps({ fz: '18px' });
      expect(result.className).toContain('-fz');
      expect(result.style?.['--fz']).toBe('18px');
    });

    test('w: カスタム値は変数として出力される (bp:1なので)', () => {
      const result = getLismProps({ w: '200px' });
      expect(result.className).toContain('-w');
      expect(result.style?.['--w']).toBe('200px');
    });

    test('h: カスタム値は変数として出力される (bp:1なので)', () => {
      const result = getLismProps({ h: '100px' });
      expect(result.className).toContain('-h');
      expect(result.style?.['--h']).toBe('100px');
    });

    test('sz / min-sz: カスタム値・トークン値は変数として出力される (bp:1なので)', () => {
      const result = getLismProps({ sz: '600px', 'min-sz': 's' });
      expect(result.className).toContain('-sz');
      expect(result.className).toContain('-min-sz');
      expect(result.style?.['--sz']).toBe('600px');
      expect(result.style?.['--min-sz']).toBe('var(--sz--s)');
    });

    test('c: カスタム値は変数として出力される', () => {
      const result = getLismProps({ c: 'blue' });
      expect(result.style?.['--c']).toBe('var(--blue)');
    });

    test('bgc: カスタム値は変数として出力される', () => {
      const result = getLismProps({ bgc: 'red' });
      expect(result.style?.['--bgc']).toBe('var(--red)');
    });
  });

  describe('Lism Props処理 - トークン変換', () => {
    test('c: プリセット値はユーティリティクラスになる', () => {
      const result = getLismProps({ c: 'base' });
      expect(result.className).toContain('-c:base');
    });

    test('p: トークン値はユーティリティクラスになる', () => {
      const result = getLismProps({ p: '20' });
      expect(result.className).toContain('-p:20');
    });

    test('fz: トークン値がユーティリティクラスになる', () => {
      const result = getLismProps({ fz: 'l' });
      expect(result.className).toContain('-fz:l');
    });

    test('hl: トークン値は half-leading のユーティリティクラスになる', () => {
      const result = getLismProps({ hl: 's' });
      expect(result.className).toContain('-hl:s');
      expect(result.style?.['--hl']).toBeUndefined();
    });

    test('hl: ブレイクポイント指定は --hl_{bp} 変数へ出力される', () => {
      const result = getLismProps({ hl: { sm: 's' } });
      expect(result.className).toContain('-hl_sm');
      expect(result.style?.['--hl_sm']).toBe('var(--hl--s)');
    });

    test('hl: 0 は half-leading なしのユーティリティクラスになる', () => {
      const result = getLismProps({ hl: '0' });
      expect(result.className).toContain('-hl:0');
      expect(result.style?.['--hl']).toBeUndefined();
      expect(result.style?.lineHeight).toBeUndefined();
    });

    test('lh: トークン値は line-height のユーティリティクラスになる', () => {
      const result = getLismProps({ lh: 'm' });
      expect(result.className).toContain('-lh:m');
      expect(result.style?.['--lh']).toBeUndefined();
      expect(result.style?.lineHeight).toBeUndefined();
    });

    test('lh: 1 は line-height:1 のユーティリティクラスになる', () => {
      const result = getLismProps({ lh: '1' });
      expect(result.className).toContain('-lh:1');
      expect(result.style?.['--lh']).toBeUndefined();
      expect(result.style?.lineHeight).toBeUndefined();
    });

    test('lh: 任意値は -lh クラスと --lh 変数で出力される（素の line-height は出力しない）', () => {
      const result = getLismProps({ lh: '1.7' });
      expect(result.className).toContain('-lh');
      expect(result.style?.['--lh']).toBe('1.7');
      expect(result.style?.lineHeight).toBeUndefined();
    });
  });

  describe('Lism Props処理 - : プレフィックス', () => {
    test(': で始まる値はユーティリティクラスとして出力される', () => {
      const result = getLismProps({ w: ':fit' });
      expect(result.className).toContain('-w:fit');
      expect(result.style?.width).toBeUndefined();
    });

    test('複数のプロップで : プレフィックスが使える', () => {
      const result = getLismProps({ w: ':fit', h: ':fit' });
      expect(result.className).toContain('-w:fit');
      expect(result.className).toContain('-h:fit');
    });

    test('":" 単体は true と同じく bare な -{prop} クラスのみ出力される', () => {
      const result = getLismProps({ bd: ':' });
      expect(result.className).toContain('-bd');
      expect(result.className).not.toContain('-bd:');
      expect(result.style?.border).toBeUndefined();
    });
  });

  describe('Lism Props処理 - true 値', () => {
    test('true値はユーティリティクラスのみ出力される', () => {
      const result = getLismProps({ bd: true });
      expect(result.className).toContain('-bd');
      expect(result.style?.borderStyle).toBeUndefined();
    });
  });

  describe('Lism Props処理 - ブレイクポイント指定', () => {
    test('オブジェクト形式でブレイクポイント指定できる (トークン値)', () => {
      const result = getLismProps({
        fz: { base: 'xl', sm: 'l' },
      });
      expect(result.className).toContain('-fz:xl');
      expect(result.className).toContain('-fz_sm');
      expect(result.style?.['--fz_sm']).toBe('var(--fz--l)');
    });

    test('配列形式でブレイクポイント指定できる (トークン値)', () => {
      const result = getLismProps({
        fz: ['xl', 'l', 'm'],
      });
      expect(result.className).toContain('-fz:xl');
      expect(result.className).toContain('-fz_sm');
      expect(result.className).toContain('-fz_md');
      expect(result.style?.['--fz_sm']).toBe('var(--fz--l)');
      expect(result.style?.['--fz_md']).toBe('var(--fz--m)');
    });

    test('カスタム値のブレイクポイント指定', () => {
      const result = getLismProps({
        fz: { base: '16px', sm: '18px' },
      });
      expect(result.className).toContain('-fz');
      expect(result.className).toContain('-fz_sm');
      expect(result.style?.['--fz']).toBe('16px');
      expect(result.style?.['--fz_sm']).toBe('18px');
    });

    test('d プロパティでブレイクポイント指定 (bp:1)', () => {
      const result = getLismProps({
        d: { base: 'block', sm: 'none' },
      });
      expect(result.className).toContain('-d:block');
      expect(result.className).toContain('-d_sm');
      expect(result.style?.['--d_sm']).toBe('none');
    });

    test('max-sz: base のトークン値はクラス化され、BP 値は --max-sz_{bp} 変数になる (bp:1)', () => {
      const result = getLismProps({ 'max-sz': ['s', 'm', '720px'] });
      expect(result.className).toContain('-max-sz:s');
      expect(result.className).toContain('-max-sz_sm');
      expect(result.className).toContain('-max-sz_md');
      expect(result.style?.['--max-sz_sm']).toBe('var(--sz--m)');
      expect(result.style?.['--max-sz_md']).toBe('720px');
    });

    test('sz: オブジェクト形式でブレイクポイント指定できる (bp:1)', () => {
      const result = getLismProps({ sz: { base: '100%', md: 's' } });
      expect(result.className).toContain('-sz');
      expect(result.className).toContain('-sz_md');
      expect(result.style?.['--sz']).toBe('100%');
      expect(result.style?.['--sz_md']).toBe('var(--sz--s)');
    });

    test('xs はオブジェクト記法で指定でき、-{prop}_xs クラスと --{prop}_xs 変数を出力する', () => {
      const result = getLismProps({
        p: { base: '20', xs: '10', sm: '30' },
      } as unknown as LismProps);
      expect(result.className).toContain('-p:20');
      expect(result.className).toContain('-p_xs');
      expect(result.className).toContain('-p_sm');
      expect(result.style?.['--p_xs']).toBe('var(--s10)');
      expect(result.style?.['--p_sm']).toBe('var(--s30)');
    });
  });

  describe('bp 非対応プロパティへの BP 指定 警告', () => {
    // bp:0 プロパティへの BP 指定は #393 で型エラーになる。
    // ランタイム警告は JS 利用者など型チェックをすり抜けたケースの保険なので、
    // テストでは unknown 経由のキャストで意図的に不正な値を渡して挙動を確認する。
    test('bp:0 のプロパティに BP 指定すると警告が出る（同じ prop は 1 回だけ）', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      getLismProps({ fw: ['bold', 'normal'] } as unknown as LismProps);
      // 同じ prop は 2 回目以降は警告しない
      getLismProps({ fw: ['bold', 'normal'] } as unknown as LismProps);
      expect(spy).toHaveBeenCalledTimes(1);
      const msg = spy.mock.calls[0][0] as string;
      expect(msg).toContain('fw');
      spy.mockRestore();
    });

    test('オブジェクト記法での BP 指定でも警告が出る（SCSS での有効化を案内）', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      getLismProps({ lts: { base: '0', md: '1px' } } as unknown as LismProps);
      expect(spy).toHaveBeenCalledTimes(1);
      const msg = spy.mock.calls[0][0] as string;
      expect(msg).toContain('lts');
      expect(msg).toContain("'lts': ( bp: 1 )");
      spy.mockRestore();
    });

    test('bp 対応プロパティに BP 指定しても警告は出ない', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      getLismProps({ fz: ['xl', 'l'] });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    test('bp:0 プロパティでも単一値なら警告は出ない', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      getLismProps({ pt: '10' });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Trait処理', () => {
    test('isContainer: true の場合クラスが追加される', () => {
      const result = getLismProps({ isContainer: true });
      expect(result.className).toContain('is--container');
    });

    test('isContainer: false の場合クラスは追加されない', () => {
      const result = getLismProps({ isContainer: false });
      expect(result).toEqual({});
    });

    test('isWrapper: true の場合クラスが追加される', () => {
      const result = getLismProps({ isWrapper: true });
      expect(result.className).toContain('is--wrapper');
    });

    test('isWrapper: プリセット値の場合、プリセットクラスが追加される', () => {
      const result = getLismProps({ isWrapper: 's' });
      expect(result.className).toContain('is--wrapper');
      expect(result.className).toContain('-contentSize:s');
    });

    test('isWrapper: m の場合、contentSize prop としてプリセットクラスが追加される', () => {
      const result = getLismProps({ isWrapper: 'm' });
      expect(result.className).toContain('is--wrapper');
      expect(result.className).toContain('-contentSize:m');
      expect(result.style?.['--contentSize']).toBeUndefined();
    });

    test('isWrapper: カスタム値の場合、変数が設定される', () => {
      const result = getLismProps({ isWrapper: '800px' });
      expect(result.className).toContain('is--wrapper');
      expect(result.style?.['--contentSize']).toBe('800px');
    });

    test('isWrapper と contentSize を同時に指定した場合、contentSize が優先される', () => {
      const result = getLismProps({ isWrapper: 's', contentSize: 'l' });
      expect(result.className).toContain('is--wrapper');
      expect(result.className).toContain('-contentSize:l');
      expect(result.className).not.toContain('-contentSize:s');
    });

    test('hasTransition: true の場合クラスのみが追加される', () => {
      const result = getLismProps({ hasTransition: true });
      expect(result.className).toContain('has--transition');
      expect(result.style).toBeUndefined();
    });

    test('hasTransition: 文字列の場合、クラスと --transitionProps 変数が出力される', () => {
      const result = getLismProps({ hasTransition: 'scale, opacity' });
      expect(result.className).toContain('has--transition');
      expect(result.style?.['--transitionProps']).toBe('scale, opacity');
    });

    test('hasTransition: 前後の空白は除去される', () => {
      const result = getLismProps({ hasTransition: '  color ' });
      expect(result.style?.['--transitionProps']).toBe('color');
    });

    test('hasTransition: 空文字の場合は何も出力されない', () => {
      const result = getLismProps({ hasTransition: '' });
      expect(result).toEqual({});
    });

    test('contentSize: 単独でプリセット値を指定すると、クラスのみが出力される', () => {
      const result = getLismProps({ contentSize: 'l' });
      expect(result.className).toContain('-contentSize:l');
      expect(result.className).not.toContain('is--wrapper');
    });

    test('contentSize: 任意値の場合、CSS変数として出力される', () => {
      const result = getLismProps({ contentSize: '800px' });
      expect(result.style?.['--contentSize']).toBe('800px');
      expect(result.className ?? '').not.toContain('is--wrapper');
    });

    test('contentSize: トークン値の場合、CSS変数として出力される', () => {
      const result = getLismProps({ contentSize: 'xs' });
      expect(result.style?.['--contentSize']).toBe('var(--sz--xs)');
    });

    test('複数のstate propsが同時に機能する', () => {
      const result = getLismProps({
        isContainer: true,
        isLayer: true,
      });
      expect(result.className).toContain('is--container');
      expect(result.className).toContain('is--layer');
    });
  });

  describe('hov処理', () => {
    test('hov: true の場合、-hovクラスが追加される', () => {
      const result = getLismProps({ hov: true });
      expect(result.className).toContain('-hov');
    });

    test('hov: 文字列の場合、hoverクラスが追加される', () => {
      const result = getLismProps({ hov: 'fade' });
      expect(result.className).toContain('-hov:fade');
    });

    test('hov: カンマ区切りで複数のクラスが追加される', () => {
      const result = getLismProps({ hov: 'fade,shadow' });
      expect(result.className).toContain('-hov:fade');
      expect(result.className).toContain('-hov:shadow');
    });

    test('hov: 文字列はそのまま -hov:{入力} として出力される（自動変換なし）', () => {
      const result = getLismProps({ hov: 'o' });
      expect(result.className).toContain('-hov:o');
      expect(result.className).not.toContain('-hov:-o');
    });

    test('hov: "-" 付きで指定した場合は -hov:-{prop} として出力される', () => {
      const result = getLismProps({ hov: '-o' });
      expect(result.className).toContain('-hov:-o');
    });

    test('hov: カンマ区切りでもそれぞれそのまま出力される', () => {
      const result = getLismProps({ hov: '-c,-bxsh,custom,in:zoom' });
      expect(result.className).toContain('-hov:-c');
      expect(result.className).toContain('-hov:-bxsh');
      expect(result.className).toContain('-hov:custom');
      expect(result.className).toContain('-hov:in:zoom');
    });

    test('hov: オブジェクト形式で値を指定すると -hov:-{key} + --hov-{key} 変数が出力される', () => {
      const result = getLismProps({
        hov: { c: 'red', bgc: 'blue' },
      });
      expect(result.className).toContain('-hov:-c');
      expect(result.className).toContain('-hov:-bgc');
      expect(result.style?.['--hov-c']).toBe('var(--red)');
      expect(result.style?.['--hov-bgc']).toBe('var(--blue)');
    });

    test('hov: transform はトークン変換されず値がそのまま --hov-transform に入る', () => {
      const result = getLismProps({ hov: { transform: 'scale(1.05)' } });
      expect(result.className).toContain('-hov:-transform');
      expect(result.style?.['--hov-transform']).toBe('scale(1.05)');
    });

    test('hov: オブジェクト形式で true の場合はクラスのみ（- は付かない）', () => {
      const result = getLismProps({
        hov: { c: true, shadowUp: true },
      });
      expect(result.className).toContain('-hov:c');
      expect(result.className).toContain('-hov:shadowUp');
      expect(result.className).not.toContain('-hov:-c');
      expect(result.style?.['--hov-c']).toBeUndefined();
    });
  });

  describe('その他のattributes', () => {
    test('Lism Props以外の属性はそのまま渡される', () => {
      const result = getLismProps({
        id: 'test-id',
        'data-test': 'value',
        'aria-label': 'test',
      } as LismProps & Record<string, unknown>);
      expect(result.id).toBe('test-id');
      expect(result['data-test']).toBe('value');
      expect(result['aria-label']).toBe('test');
    });

    test('onClick などのイベントハンドラーが渡される', () => {
      const onClick = () => {};
      const result = getLismProps({ onClick } as LismProps & Record<string, unknown>);
      expect(result.onClick).toBe(onClick);
    });
  });

  describe('utils指定', () => {
    test('w: fit がユーティリティクラスになる', () => {
      const result = getLismProps({ w: 'fit-content' });
      expect(result.className).toContain('-w:fit');
    });

    test('td: none がユーティリティクラスになる', () => {
      const result = getLismProps({ td: 'none' });
      expect(result.className).toContain('-td:none');
    });

    test('tt: uppercase と旧略称 upper がフル名称のクラスになる', () => {
      expect(getLismProps({ tt: 'uppercase' }).className).toContain('-tt:uppercase');
      expect(getLismProps({ tt: 'upper' }).className).toContain('-tt:uppercase');
    });

    test('bgc: current / currentColor がユーティリティクラスになる', () => {
      expect(getLismProps({ bgc: 'current' }).className).toContain('-bgc:current');
      expect(getLismProps({ bgc: 'currentColor' }).className).toContain('-bgc:current');
    });
  });

  describe('複雑な組み合わせ', () => {
    test('複数のプロパティが同時に機能する', () => {
      const result = getLismProps({
        className: 'custom c--box',
        layout: 'flow',
        fz: 'xl',
        c: 'base',
        p: '20',
        isContainer: true,
        style: { margin: '10px' },
      });

      expect(result.className).toContain('custom');
      expect(result.className).toContain('c--box');
      expect(result.className).toContain('l--flow');
      expect(result.className).toContain('-fz:xl');
      expect(result.className).toContain('is--container');
      expect(result.className).toContain('-c:base');
      expect(result.className).toContain('-p:20');
      expect(result.style?.margin).toBe('10px');
    });

    test('空の値は除外される', () => {
      const result = getLismProps({
        fz: '',
        c: null,
        w: undefined,
        p: '20',
      });
      expect(result.className).toBe('-p:20');
    });

    test('false 値は除外される', () => {
      const result = getLismProps({
        w: false,
        isContainer: false,
      });
      expect(result).toEqual({});
    });
  });

  describe('エッジケース', () => {
    test('null/undefined の propは無視される', () => {
      const result = getLismProps({
        fz: null,
        w: undefined,
      });
      expect(result).toEqual({});
    });

    test('0 値はプリセットクラスとして処理される', () => {
      const result = getLismProps({ p: 0 });
      expect(result.className).toBe('-p:0');
      expect(result.style).toBeUndefined();
    });
  });
});
