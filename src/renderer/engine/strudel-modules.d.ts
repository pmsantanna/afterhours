// Os pacotes @strudel/* não publicam tipos. Declaramos só o que o engine usa.
declare module '@strudel/core' {
  export interface Repl {
    evaluate(code: string, autostart?: boolean, shouldHush?: boolean): Promise<unknown>;
    start(): void;
    stop(): void;
    setCps(cps: number): void;
    scheduler: { now(): number; started: boolean; cps: number };
    state: { evalError?: Error; started: boolean };
  }
  export function repl(options: Record<string, unknown>): Repl;
  export function evalScope(...modules: unknown[]): Promise<unknown>;
  export function setTime(fn: () => number): void;
}
declare module '@strudel/mini';
declare module '@strudel/tonal';
declare module '@strudel/transpiler' {
  export const transpiler: unknown;
}
declare module '@strudel/webaudio' {
  export function getAudioContext(): AudioContext;
  export function initAudio(options?: Record<string, unknown>): Promise<void>;
  export function registerSynthSounds(): Promise<void>;
  export function samples(source: string | object, baseUrl?: string): Promise<void>;
  export const webaudioOutput: unknown;
  export function getSuperdoughAudioController(): {
    output: { destinationGain: GainNode | null };
  };
}
