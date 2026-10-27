import type { Project, Track } from './types';

export const DEFAULT_SAMPLE_SOURCES = ['github:tidalcycles/dirt-samples'];

const TRACK_COLORS = ['#ff5d73', '#ffb84d', '#5ee08a', '#4dc3ff', '#a98bff', '#ff7ad9', '#f2e85c', '#7af2e0'];

export function trackColor(index: number): string {
  return TRACK_COLORS[index % TRACK_COLORS.length];
}

export function createTrack(index: number, partial: Partial<Track> = {}): Track {
  return {
    id: `t${index + 1}`,
    name: `Track ${index + 1}`,
    color: trackColor(index),
    code: '',
    orbit: index + 1,
    mixer: { gain: 0.8, pan: 0.5, mute: false, solo: false },
    fx: { room: 0, delay: 0 },
    ...partial,
  };
}

/** Projeto inicial do spike: um loop simples só com dirt-samples e synths nativos. */
export function createDemoProject(): Project {
  return {
    version: 1,
    name: 'Sem título',
    bpm: 124,
    beatsPerCycle: 4,
    sampleSources: [...DEFAULT_SAMPLE_SOURCES],
    prelude: '',
    tracks: [
      createTrack(0, { name: 'Kick', code: 's("bd*4")', mixer: { gain: 0.9, pan: 0.5, mute: false, solo: false } }),
      createTrack(1, { name: 'Clap', code: 's("~ cp ~ cp")', mixer: { gain: 0.6, pan: 0.5, mute: false, solo: false } }),
      createTrack(2, { name: 'Hats', code: 's("hh*8").gain("[.6 1]*4")', mixer: { gain: 0.5, pan: 0.6, mute: false, solo: false } }),
      createTrack(3, {
        name: 'Bass',
        code: 'note("<c2 c2 eb2 g1>*2 ~ c3 ~").s("sawtooth").lpf(600).decay(.15).sustain(0)',
        mixer: { gain: 0.6, pan: 0.5, mute: false, solo: false },
      }),
    ],
    master: { gain: 0.9 },
    scenes: [],
    arrangement: [],
  };
}
