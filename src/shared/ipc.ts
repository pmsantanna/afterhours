// Contrato entre preload e renderer (window.studio). Canais IPC entram aqui no MVP.
export interface StudioApi {
  versions: { electron: string; chrome: string };
}
