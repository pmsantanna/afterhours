// Store do projeto. A UI só fala com a store; o código que toca é derivado dela
// pelo compilador (ver app/engineSync.ts).
import { create } from 'zustand';
import { createDemoProject, createTrack } from '../../shared/defaults';
import type { Project, Track, TrackMixer } from '../../shared/types';

export type TransportStatus = 'stopped' | 'starting' | 'playing';

interface StudioState {
  project: Project;
  selectedTrackId: string | null;
  /** Texto no editor de cada track. Só vira `track.code` com Ctrl+Enter. */
  drafts: Record<string, string>;
  transport: TransportStatus;
  /** Erros de sintaxe por track (vindos do compilador). */
  compileErrors: Record<string, string>;
  /** Erro de avaliação do Strudel (o pattern anterior continua tocando). */
  evalError: string | null;
  generatedCode: string;

  setBpm(bpm: number): void;
  setMasterGain(gain: number): void;
  selectTrack(id: string): void;
  setDraft(id: string, text: string): void;
  commitTrack(id: string): void;
  setMixer(id: string, patch: Partial<TrackMixer>): void;
  addTrack(): void;
  renameTrack(id: string, name: string): void;
  setTransport(status: TransportStatus): void;
  setEngineFeedback(feedback: { compileErrors?: Record<string, string>; evalError?: string | null; generatedCode?: string }): void;
}

const initial = createDemoProject();

function updateTrack(project: Project, id: string, fn: (t: Track) => Track): Project {
  return { ...project, tracks: project.tracks.map((t) => (t.id === id ? fn(t) : t)) };
}

export const useStudio = create<StudioState>()((set, get) => ({
  project: initial,
  selectedTrackId: initial.tracks[0]?.id ?? null,
  drafts: Object.fromEntries(initial.tracks.map((t) => [t.id, t.code])),
  transport: 'stopped',
  compileErrors: {},
  evalError: null,
  generatedCode: '',

  setBpm: (bpm) => {
    if (!Number.isFinite(bpm) || bpm < 20 || bpm > 300) return;
    set((s) => ({ project: { ...s.project, bpm } }));
  },
  setMasterGain: (gain) => set((s) => ({ project: { ...s.project, master: { gain } } })),
  selectTrack: (id) => set({ selectedTrackId: id }),
  setDraft: (id, text) => set((s) => ({ drafts: { ...s.drafts, [id]: text } })),
  commitTrack: (id) => {
    const code = get().drafts[id];
    if (code == null) return;
    set((s) => ({ project: updateTrack(s.project, id, (t) => ({ ...t, code })) }));
  },
  setMixer: (id, patch) =>
    set((s) => ({ project: updateTrack(s.project, id, (t) => ({ ...t, mixer: { ...t.mixer, ...patch } })) })),
  addTrack: () =>
    set((s) => {
      const used = new Set(s.project.tracks.map((t) => t.id));
      let i = s.project.tracks.length;
      while (used.has(`t${i + 1}`)) i++;
      const orbit = Math.max(0, ...s.project.tracks.map((t) => t.orbit)) + 1;
      const track = createTrack(i, { orbit });
      return {
        project: { ...s.project, tracks: [...s.project.tracks, track] },
        drafts: { ...s.drafts, [track.id]: track.code },
        selectedTrackId: track.id,
      };
    }),
  renameTrack: (id, name) => set((s) => ({ project: updateTrack(s.project, id, (t) => ({ ...t, name })) })),
  setTransport: (transport) => set({ transport }),
  setEngineFeedback: (feedback) => set(feedback),
}));
