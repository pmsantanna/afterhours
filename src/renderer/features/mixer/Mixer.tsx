import { useStudio } from '../../store/project';

export function Mixer() {
  const tracks = useStudio((s) => s.project.tracks);
  const master = useStudio((s) => s.project.master);
  const setMixer = useStudio((s) => s.setMixer);
  const setMasterGain = useStudio((s) => s.setMasterGain);
  const selectTrack = useStudio((s) => s.selectTrack);

  return (
    <section className="mixer">
      {tracks.map((t) => (
        <div key={t.id} className="strip" style={{ '--track-color': t.color } as React.CSSProperties}>
          <button className="strip-name" onClick={() => selectTrack(t.id)}>
            {t.name}
          </button>
          <input
            className="pan"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={t.mixer.pan}
            onChange={(e) => setMixer(t.id, { pan: Number(e.target.value) })}
            onDoubleClick={() => setMixer(t.id, { pan: 0.5 })}
            title={`Pan ${t.mixer.pan.toFixed(2)} (duplo clique centraliza)`}
          />
          <Fader value={t.mixer.gain} onChange={(gain) => setMixer(t.id, { gain })} />
          <div className="strip-buttons">
            <button className={`ms mute ${t.mixer.mute ? 'on' : ''}`} onClick={() => setMixer(t.id, { mute: !t.mixer.mute })}>
              M
            </button>
            <button className={`ms solo ${t.mixer.solo ? 'on' : ''}`} onClick={() => setMixer(t.id, { solo: !t.mixer.solo })}>
              S
            </button>
          </div>
        </div>
      ))}
      <div className="strip master">
        <span className="strip-name">Master</span>
        <div className="pan-spacer" />
        <Fader value={master.gain} onChange={setMasterGain} />
      </div>
    </section>
  );
}

function Fader({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="fader">
      <input type="range" min={0} max={1.2} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span>{value.toFixed(2)}</span>
    </label>
  );
}
