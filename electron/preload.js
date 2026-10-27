// API mínima exposta ao renderer como window.studio. O contrato tipado fica em
// src/shared/ipc.ts; projeto (open/save), samples e export entram aqui no MVP.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('studio', {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
})
