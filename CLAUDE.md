# Afterhours

Estúdio de live coding (Electron + React + Strudel). Spec: `docs/spec.md`.

## Regras de arquitetura
- O projeto (store) é a fonte da verdade. A UI nunca chama o Strudel; ela altera a store.
- `src/renderer/compiler/` é puro: não importa Strudel, React nem Electron. Toda regra nova do compilador ganha teste em `compile.test.ts`.
- Só `src/renderer/engine/` importa `@strudel/*`. Versões de `@strudel/*` ficam fixadas (sem `^`).
- Main/preload ficam em `electron/` como CommonJS simples (mesmo setup do Noise, sem electron-vite): `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. O renderer fala com o main só por `window.studio`, implementado em `electron/preload.js` e tipado em `src/shared/ipc.ts` (manter os dois em sincronia).

## Antes de commitar
`npm test && npm run typecheck && npm run build`

## Branches
Base `main`. Prefixos `feat/`, `fix/`, `chore/`, `spec/`; nome = tema. Sessões web do Claude Code usam a branch `claude/<nome>` já criada.
