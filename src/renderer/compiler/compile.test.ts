import { describe, expect, it } from 'vitest';
import { createTrack } from '../../shared/defaults';
import type { Project, Track } from '../../shared/types';
import { compile, PRELUDE_KEY } from './compile';

function project(tracks: Track[], partial: Partial<Project> = {}): Project {
  return {
    version: 1,
    name: 'teste',
    bpm: 128,
    beatsPerCycle: 4,
    sampleSources: [],
    prelude: '',
    tracks,
    master: { gain: 1 },
    scenes: [],
    arrangement: [],
    ...partial,
  };
}

const kick = (mixer: Partial<Track['mixer']> = {}) =>
  createTrack(0, { name: 'Kick', code: 's("bd*4")', mixer: { gain: 0.9, pan: 0.5, mute: false, solo: false, ...mixer } });
const hat = (mixer: Partial<Track['mixer']> = {}) =>
  createTrack(1, { name: 'Hat', code: 's("hh*8")', mixer: { gain: 0.6, pan: 0.6, mute: false, solo: false, ...mixer } });

/** Label ($ ou _$) de cada track no código gerado, na ordem. */
function labels(code: string): string[] {
  return [...code.matchAll(/^(_?\$): /gm)].map((m) => m[1]);
}

describe('compile', () => {
  it('gera setcps a partir de bpm e beatsPerCycle', () => {
    const { code } = compile(project([], { bpm: 140, beatsPerCycle: 3 }));
    expect(code.split('\n')[0]).toBe('setcps(140 / 60 / 3)');
  });

  it('gera o exemplo do spec: kick tocando e hat mutado', () => {
    const k = kick();
    k.fx.room = 0.1;
    const { code, errors } = compile(project([k, hat({ mute: true })]));
    expect(errors).toEqual({});
    expect(code).toMatchInlineSnapshot(`
      "setcps(128 / 60 / 4)

      // Kick (t1)
      $: (s("bd*4"))
        .orbit(1).postgain(0.9).pan(0.5).room(0.1)

      // Hat (t2)
      _$: (s("hh*8"))
        .orbit(2).postgain(0.6).pan(0.6)
      "
    `);
  });

  it('mute sempre vira _$:', () => {
    expect(labels(compile(project([kick({ mute: true }), hat()])).code)).toEqual(['_$', '$']);
    // mute ganha de solo
    expect(labels(compile(project([kick({ mute: true, solo: true }), hat()])).code)).toEqual(['_$', '_$']);
  });

  it('com solo, só as tracks com solo tocam', () => {
    expect(labels(compile(project([kick(), hat({ solo: true })])).code)).toEqual(['_$', '$']);
    expect(labels(compile(project([kick({ solo: true }), hat({ solo: true })])).code)).toEqual(['$', '$']);
  });

  it('gain efetivo = gain da track × gain do master', () => {
    const { code } = compile(project([kick({ gain: 0.8 })], { master: { gain: 0.5 } }));
    expect(code).toContain('.postgain(0.4)');
  });

  it('não emite float com lixo de arredondamento', () => {
    const { code } = compile(project([kick({ gain: 0.7 })], { master: { gain: 0.3 } }));
    expect(code).toContain('.postgain(0.21)');
  });

  it('envolve o código em parênteses para encadear na expressão inteira', () => {
    const t = createTrack(0, { code: 'stack(s("bd"), s("hh*2")).fast(2)' });
    expect(compile(project([t])).code).toContain('$: (stack(s("bd"), s("hh*2")).fast(2))\n');
  });

  it('remove ; final e comentários nas pontas, mas aceita código multilinha', () => {
    const t = createTrack(0, { code: '// kick\ns("bd*4")\n  .bank("tr909"); // fim' });
    const { code, errors } = compile(project([t]));
    expect(errors).toEqual({});
    expect(code).toContain('$: (s("bd*4")\n  .bank("tr909"))\n');
  });

  it('ignora tracks vazias ou só com comentário', () => {
    const empty = createTrack(0, { code: '   ' });
    const comment = createTrack(1, { code: '// depois' });
    const { code, errors } = compile(project([empty, comment]));
    expect(labels(code)).toEqual([]);
    expect(errors).toEqual({});
  });

  it('rejeita mais de uma expressão ou instruções', () => {
    for (const bad of ['setcps(1); s("bd")', '$: s("bd")', 'const x = s("bd")', 's("bd")) .fast(2']) {
      const { errors, code } = compile(project([createTrack(0, { code: bad })]));
      expect(errors.t1, bad).toBeTruthy();
      expect(labels(code)).toEqual([]);
    }
  });

  it('track com erro de sintaxe mantém a última versão válida', () => {
    const t = createTrack(0, { code: 's("bd*4").fast(' });
    const { code, errors, accepted } = compile(project([t]), { fallback: { t1: 's("bd*2")' } });
    expect(errors.t1).toBeTruthy();
    expect(code).toContain('$: (s("bd*2"))');
    expect(accepted.t1).toBe('s("bd*2")');
  });

  it('accepted guarda o código válido para virar o próximo fallback', () => {
    const { accepted } = compile(project([kick(), hat()]));
    expect(accepted).toEqual({ t1: 's("bd*4")', t2: 's("hh*8")' });
  });

  it('inclui o prelude e mantém o último válido se ele quebrar', () => {
    const ok = compile(project([kick()], { prelude: 'const swing = x => x.swing(4)' }));
    expect(ok.code).toContain('\nconst swing = x => x.swing(4)\n');
    const broken = compile(project([kick()], { prelude: 'const swing = (' }), { fallback: ok.accepted });
    expect(broken.errors[PRELUDE_KEY]).toBeTruthy();
    expect(broken.code).toContain('const swing = x => x.swing(4)');
  });

  it('com cena, gera só as tracks da cena', () => {
    const scene = { id: 's1', name: 'Intro', trackIds: ['t2'] };
    const { code } = compile(project([kick(), hat()]), { scene });
    expect(code).not.toContain('bd*4');
    expect(code).toContain('hh*8');
  });

  it('nome da track não quebra o comentário gerado', () => {
    const t = createTrack(0, { name: 'Kick\n$: s("x")', code: 's("bd")' });
    expect(labels(compile(project([t])).code)).toEqual(['$']);
  });
});
