import { useEffect, useRef } from 'react';
import { togglePlay } from '../../app/engineSync';
import { readMasterLevel } from '../../engine/meter';
import { useStudio } from '../../store/project';

export function Transport() {
  const transport = useStudio((s) => s.transport);
  const bpm = useStudio((s) => s.project.bpm);
  const setBpm = useStudio((s) => s.setBpm);
  const evalError = useStudio((s) => s.evalError);

  const label = transport === 'playing' ? 'Stop' : transport === 'starting' ? 'Carregando…' : 'Play';

  return (
    <header className="transport">
      <button
        className={`play ${transport}`}
        onClick={togglePlay}
        disabled={transport === 'starting'}
        title="Play/stop (Espaço fora do editor, Ctrl+. para parar)"
      >
        {transport === 'playing' ? '■' : '▶'} {label}
      </button>
      <label className="bpm">
        BPM
        <input type="number" min={20} max={300} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
      </label>
      <span className={`status ${evalError ? 'error' : ''}`} title={evalError ?? undefined}>
        {evalError ? `Erro: ${evalError}` : transport === 'playing' ? 'tocando' : 'parado'}
      </span>
      <MasterMeter active={transport === 'playing'} />
    </header>
  );
}

function MasterMeter({ active }: { active: boolean }) {
  const rmsRef = useRef<HTMLDivElement>(null);
  const peakRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      if (rmsRef.current) rmsRef.current.style.width = '0%';
      if (peakRef.current) peakRef.current.style.left = '0%';
      return;
    }
    let frame = 0;
    let peakHold = 0;
    const tick = () => {
      const { rms, peak } = readMasterLevel();
      peakHold = Math.max(peak, peakHold * 0.96);
      // escala em dB: -60 dB .. 0 dB
      const pct = (v: number) => Math.max(0, Math.min(100, ((20 * Math.log10(v || 1e-6) + 60) / 60) * 100));
      if (rmsRef.current) rmsRef.current.style.width = `${pct(rms)}%`;
      if (peakRef.current) {
        peakRef.current.style.left = `${pct(peakHold)}%`;
        peakRef.current.classList.toggle('clip', peakHold >= 1);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <div className="meter" title="Nível do master (RMS e pico, -60..0 dB)">
      <div className="meter-rms" ref={rmsRef} />
      <div className="meter-peak" ref={peakRef} />
    </div>
  );
}
