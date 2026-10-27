// Liga a store ao Strudel: projeto muda -> compila -> reavalia (debounce ~50 ms),
// só quando o código gerado muda de fato.
import { compile } from '../compiler/compile';
import * as engine from '../engine/strudel';
import { useStudio } from '../store/project';

const DEBOUNCE_MS = 50;

let fallback: Record<string, string> = {};
let lastEvaluated: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function regenerate(): string {
  const { project } = useStudio.getState();
  const result = compile(project, { fallback });
  fallback = { ...fallback, ...result.accepted };
  useStudio.getState().setEngineFeedback({ compileErrors: result.errors, generatedCode: result.code });
  return result.code;
}

async function evaluateNow(code: string): Promise<void> {
  if (code === lastEvaluated) return;
  lastEvaluated = code;
  const err = await engine.evaluate(code);
  useStudio.getState().setEngineFeedback({ evalError: err ? err.message : null });
}

function schedule(): void {
  const code = regenerate();
  if (useStudio.getState().transport !== 'playing') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void evaluateNow(code);
  }, DEBOUNCE_MS);
}

export async function play(): Promise<void> {
  const { transport, project, setTransport, setEngineFeedback } = useStudio.getState();
  if (transport !== 'stopped') return;
  setTransport('starting');
  try {
    await engine.initEngine();
    await engine.loadSampleSources(project.sampleSources);
    setTransport('playing');
    lastEvaluated = null;
    await evaluateNow(regenerate());
  } catch (err) {
    setTransport('stopped');
    setEngineFeedback({ evalError: err instanceof Error ? err.message : String(err) });
  }
}

export async function stop(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  lastEvaluated = null;
  await engine.stop();
  useStudio.getState().setTransport('stopped');
}

export function togglePlay(): void {
  void (useStudio.getState().transport === 'stopped' ? play() : stop());
}

/** Começa a observar a store. Devolve a função para parar. */
export function startEngineSync(): () => void {
  regenerate();
  return useStudio.subscribe((state, prev) => {
    if (state.project !== prev.project) schedule();
  });
}
