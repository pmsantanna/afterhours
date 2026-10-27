// Compilador: Project -> código Strudel. Função pura, sem Strudel nem React
// (ver docs/spec.md, "Engine de áudio e mixer" para as regras).
import { parse } from 'acorn';
import type { Project, Scene, Track } from '../../shared/types';

export interface CompileOptions {
  /** Cena ativa (modo live). Sem cena, todas as tracks entram. */
  scene?: Scene | null;
  /**
   * Última versão válida de cada track (e do prelude, na chave PRELUDE_KEY).
   * Se o código atual não compila, o compilador usa esta versão (regra 5).
   */
  fallback?: Record<string, string>;
}

export interface CompileResult {
  /** Código pronto para o `evaluate` do Strudel. */
  code: string;
  /** Erros de sintaxe por track id (e PRELUDE_KEY). */
  errors: Record<string, string>;
  /** Código que efetivamente entrou no resultado, por track id. Vira o próximo `fallback`. */
  accepted: Record<string, string>;
}

export const PRELUDE_KEY = '__prelude__';

const ECMA = { ecmaVersion: 2022, allowAwaitOutsideFunction: true } as const;

export function compile(project: Project, options: CompileOptions = {}): CompileResult {
  const { scene = null, fallback = {} } = options;
  const errors: Record<string, string> = {};
  const accepted: Record<string, string> = {};
  const lines: string[] = [`setcps(${num(project.bpm)} / 60 / ${num(project.beatsPerCycle)})`];

  const prelude = pick(PRELUDE_KEY, project.prelude, checkProgram, fallback, errors);
  if (prelude) {
    accepted[PRELUDE_KEY] = prelude.source;
    lines.push('', prelude.output);
  }

  const tracks = scene ? project.tracks.filter((t) => scene.trackIds.includes(t.id)) : project.tracks;
  const anySolo = tracks.some((t) => t.mixer.solo);

  for (const track of tracks) {
    const expr = pick(track.id, track.code, checkExpression, fallback, errors);
    if (!expr) continue;
    accepted[track.id] = expr.source;
    const audible = !track.mixer.mute && (!anySolo || track.mixer.solo);
    lines.push('', renderTrack(track, expr.output, audible, project.master.gain));
  }

  return { code: lines.join('\n') + '\n', errors, accepted };
}

function renderTrack(track: Track, expr: string, audible: boolean, masterGain: number): string {
  const { gain, pan } = track.mixer;
  const chain = [`.orbit(${track.orbit})`, `.postgain(${num(gain * masterGain)})`, `.pan(${num(pan)})`];
  if (track.fx.room > 0) chain.push(`.room(${num(track.fx.room)})`);
  if (track.fx.delay > 0) chain.push(`.delay(${num(track.fx.delay)})`);
  if (track.fx.lpf != null) chain.push(`.lpf(${num(track.fx.lpf)})`);
  // `_$:` é o mute nativo do Strudel: a track é avaliada mas não toca.
  const label = audible ? '$' : '_$';
  return `// ${oneLine(track.name)} (${track.id})\n${label}: (${expr})\n  ${chain.join('')}`;
}

/**
 * Escolhe o código que entra: o atual se for válido, senão a última versão válida.
 * Devolve null quando não há nada tocável.
 */
function pick(
  key: string,
  source: string,
  check: (src: string) => string,
  fallback: Record<string, string>,
  errors: Record<string, string>,
): { source: string; output: string } | null {
  const attempt = (src: string) => {
    const output = check(src);
    return output ? { source: src, output } : null;
  };
  if (!source.trim()) return null;
  try {
    return attempt(source);
  } catch (err) {
    errors[key] = err instanceof Error ? err.message : String(err);
    const previous = fallback[key];
    if (!previous) return null;
    try {
      return attempt(previous);
    } catch {
      return null;
    }
  }
}

/**
 * Valida que o código da track é UMA expressão e devolve só ela, sem `;` final
 * nem comentários nas pontas, para poder ser envolvida em parênteses (regra 4).
 */
export function checkExpression(source: string): string {
  const ast = parse(source, ECMA);
  const [first, ...rest] = ast.body;
  if (!first) return '';
  if (rest.length > 0 || first.type !== 'ExpressionStatement') {
    throw new Error('O código da track deve ser uma única expressão (sem setcps, samples ou várias linhas $:).');
  }
  return source.slice(first.expression.start, first.expression.end);
}

/** O prelude pode ter várias instruções; só precisa ser JS válido. */
function checkProgram(source: string): string {
  parse(source, ECMA);
  return source.trim();
}

/** Número curto e estável no código gerado (evita 0.6000000000000001). */
function num(n: number): string {
  return String(Math.round(n * 10000) / 10000);
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
