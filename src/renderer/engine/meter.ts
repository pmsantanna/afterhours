// Medidor do master: AnalyserNode pendurado na saída do superdough.
// O superdough recria o nó de saída em alguns resets, então reconectamos quando ele muda.
import { getAudioContext, getSuperdoughAudioController } from '@strudel/webaudio';

export interface Level {
  rms: number; // 0..1
  peak: number; // 0..1
}

let analyser: AnalyserNode | null = null;
let tappedNode: GainNode | null = null;
let buffer: Float32Array<ArrayBuffer> | null = null;

function ensureTap(): AnalyserNode | null {
  const output = getSuperdoughAudioController().output.destinationGain;
  if (!output) return null;
  if (!analyser) {
    const node = getAudioContext().createAnalyser();
    node.fftSize = 1024;
    buffer = new Float32Array(node.fftSize);
    analyser = node;
  }
  if (tappedNode !== output) {
    output.connect(analyser);
    tappedNode = output;
  }
  return analyser;
}

export function readMasterLevel(): Level {
  const a = ensureTap();
  if (!a || !buffer) return { rms: 0, peak: 0 };
  a.getFloatTimeDomainData(buffer);
  let sum = 0;
  let peak = 0;
  for (const v of buffer) {
    sum += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  return { rms: Math.sqrt(sum / buffer.length), peak };
}
