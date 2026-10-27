import { useStudio } from '../../store/project';

export function TrackList() {
  const tracks = useStudio((s) => s.project.tracks);
  const selected = useStudio((s) => s.selectedTrackId);
  const errors = useStudio((s) => s.compileErrors);
  const selectTrack = useStudio((s) => s.selectTrack);
  const setMixer = useStudio((s) => s.setMixer);
  const addTrack = useStudio((s) => s.addTrack);

  return (
    <nav className="tracks">
      <ul>
        {tracks.map((t) => (
          <li
            key={t.id}
            className={`track-row ${t.id === selected ? 'selected' : ''}`}
            style={{ '--track-color': t.color } as React.CSSProperties}
            onClick={() => selectTrack(t.id)}
          >
            <span className="swatch" />
            <span className="name">{t.name}</span>
            {errors[t.id] && <span className="err-dot" title={errors[t.id]}>!</span>}
            <button
              className={`ms mute ${t.mixer.mute ? 'on' : ''}`}
              onClick={(e) => (e.stopPropagation(), setMixer(t.id, { mute: !t.mixer.mute }))}
              title="Mute"
            >
              M
            </button>
            <button
              className={`ms solo ${t.mixer.solo ? 'on' : ''}`}
              onClick={(e) => (e.stopPropagation(), setMixer(t.id, { solo: !t.mixer.solo }))}
              title="Solo"
            >
              S
            </button>
          </li>
        ))}
      </ul>
      <button className="add-track" onClick={addTrack}>
        + Track
      </button>
    </nav>
  );
}
