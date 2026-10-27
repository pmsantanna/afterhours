// Contrato de window.studio, implementado em electron/preload.js. Mantenha os dois em sincronia.
export interface StudioApi {
  versions: { electron: string; chrome: string };
}
