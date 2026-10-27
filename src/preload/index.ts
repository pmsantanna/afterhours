// API mínima exposta ao renderer. Projeto (open/save), samples e export entram aqui
// no MVP, sempre via IPC tipado em src/shared/ipc.ts.
import { contextBridge } from 'electron';
import type { StudioApi } from '../shared/ipc';

const api: StudioApi = {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
};

contextBridge.exposeInMainWorld('studio', api);
