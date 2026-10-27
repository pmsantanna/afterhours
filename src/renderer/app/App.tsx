import { useEffect } from 'react';
import { TrackEditor } from '../features/editor/TrackEditor';
import { Mixer } from '../features/mixer/Mixer';
import { TrackList } from '../features/tracks/TrackList';
import { Transport } from '../features/transport/Transport';
import { startEngineSync, stop, togglePlay } from './engineSync';

export function App() {
  useEffect(() => startEngineSync(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '.' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void stop();
        return;
      }
      const target = e.target as HTMLElement;
      const typing = target.closest('textarea, input, [contenteditable]');
      if (e.code === 'Space' && !typing) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="studio">
      <Transport />
      <TrackList />
      <TrackEditor />
      <Mixer />
    </div>
  );
}
