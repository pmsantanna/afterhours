import type { StudioApi } from '../shared/ipc';

declare global {
  interface Window {
    /** Ausente quando o renderer roda no navegador (npm run dev:web). */
    studio?: StudioApi;
  }
}
