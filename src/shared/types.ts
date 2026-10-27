// Modelo de dados do projeto (ver docs/spec.md, "Modelo de dados").
// O projeto é a fonte da verdade: tudo que toca é derivado dele pelo compilador.

export interface Project {
  version: 1;
  name: string;
  bpm: number; // cps = bpm / 60 / beatsPerCycle
  beatsPerCycle: number; // padrão 4 (1 ciclo = 1 compasso)
  sampleSources: string[]; // 'github:tidalcycles/dirt-samples', 'local:/caminho'
  prelude: string; // código global opcional (helpers, setup)
  tracks: Track[];
  master: { gain: number };
  scenes: Scene[]; // fase 2
  arrangement: Section[]; // fase 2
}

export interface Track {
  id: string;
  name: string;
  color: string;
  code: string; // UMA expressão Strudel, ex: s("bd*4").bank("tr909")
  orbit: number; // 1 orbit por track = FX isolados
  mixer: TrackMixer;
  fx: { room: number; delay: number; lpf?: number }; // fase 2
}

export interface TrackMixer {
  gain: number;
  pan: number; // 0 = esquerda, 0.5 = centro, 1 = direita
  mute: boolean;
  solo: boolean;
}

export interface Scene {
  id: string;
  name: string;
  trackIds: string[];
}

export interface Section {
  sceneId: string;
  bars: number;
}
