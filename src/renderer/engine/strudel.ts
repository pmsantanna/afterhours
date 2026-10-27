// Wrapper fino do Strudel. Única peça do app que importa @strudel/*:
// a API interna (orbits, superdough) muda entre versões, então fica isolada aqui.
import * as core from '@strudel/core';
import { evalScope, repl, setTime, type Repl } from '@strudel/core';
import * as mini from '@strudel/mini';
import * as tonal from '@strudel/tonal';
import { transpiler } from '@strudel/transpiler';
import * as webaudio from '@strudel/webaudio';
import { getAudioContext, initAudio, registerSynthSounds, samples, webaudioOutput } from '@strudel/webaudio';

let instance: Repl | null = null;
let ready: Promise<Repl> | null = null;
const loadedSources = new Set<string>();

/** Inicializa áudio, módulos e synths. Idempotente; chame a partir de um gesto do usuário. */
export function initEngine(): Promise<Repl> {
  ready ??= (async () => {
    const ctx = getAudioContext();
    await initAudio();
    await Promise.all([
      // expõe as funções do Strudel (s, note, stack...) para o código avaliado
      evalScope(core, mini, tonal, webaudio),
      registerSynthSounds(),
    ]);
    instance = repl({
      defaultOutput: webaudioOutput,
      getTime: () => ctx.currentTime,
      transpiler,
    });
    setTime(() => instance!.scheduler.now());
    return instance;
  })();
  return ready;
}

/** Carrega os bancos de samples do projeto (cada fonte só uma vez). */
export async function loadSampleSources(sources: string[]): Promise<void> {
  const pending = sources.filter((s) => !loadedSources.has(s));
  pending.forEach((s) => loadedSources.add(s));
  await Promise.all(
    pending.map((s) =>
      samples(s).catch((err: unknown) => {
        loadedSources.delete(s);
        throw err;
      }),
    ),
  );
}

/**
 * Avalia o código gerado. Se falhar, o Strudel mantém o pattern anterior tocando;
 * devolvemos o erro para a UI mostrar.
 */
export async function evaluate(code: string): Promise<Error | null> {
  const r = await initEngine();
  await r.evaluate(code, true);
  return r.state.evalError ?? null;
}

export async function stop(): Promise<void> {
  instance?.stop();
}

export function audioContext(): AudioContext {
  return getAudioContext();
}
