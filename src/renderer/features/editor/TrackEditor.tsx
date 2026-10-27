// Editor provisório (textarea) do spike. O MVP troca por @strudel/codemirror.
import { useState } from 'react';
import { useStudio } from '../../store/project';

export function TrackEditor() {
  const track = useStudio((s) => s.project.tracks.find((t) => t.id === s.selectedTrackId) ?? null);
  const draft = useStudio((s) => (s.selectedTrackId ? s.drafts[s.selectedTrackId] : undefined));
  const error = useStudio((s) => (s.selectedTrackId ? s.compileErrors[s.selectedTrackId] : undefined));
  const generated = useStudio((s) => s.generatedCode);
  const setDraft = useStudio((s) => s.setDraft);
  const commitTrack = useStudio((s) => s.commitTrack);
  const renameTrack = useStudio((s) => s.renameTrack);
  const [showGenerated, setShowGenerated] = useState(false);

  if (!track) return <section className="editor empty">Selecione uma track</section>;
  const text = draft ?? track.code;
  const dirty = text !== track.code;

  return (
    <section className="editor" style={{ '--track-color': track.color } as React.CSSProperties}>
      <div className="editor-head">
        <input className="track-name" value={track.name} onChange={(e) => renameTrack(track.id, e.target.value)} />
        <span className="hint">{dirty ? 'modificado · Ctrl+Enter para avaliar' : 'Ctrl+Enter avalia'}</span>
        <button className="link" onClick={() => setShowGenerated((v) => !v)}>
          {showGenerated ? 'esconder código gerado' : 'ver código gerado'}
        </button>
      </div>
      <textarea
        spellCheck={false}
        value={text}
        placeholder='s("bd*4")'
        onChange={(e) => setDraft(track.id, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            commitTrack(track.id);
          }
        }}
      />
      {error && (
        <div className="inline-error">
          {error} <em>(tocando a última versão válida)</em>
        </div>
      )}
      {showGenerated && <pre className="generated">{generated}</pre>}
    </section>
  );
}
