# Spec — Estúdio de Live Coding (Strudel + Electron)

Oct 21, 2026 · @Pedro

## Visão e objetivos

Um estúdio desktop de live coding para música eletrônica: cada track é um bloco de código Strudel, com mixer visual e arranjo por cenas por cima. Não compete com Ableton/FL; é um "DAW de código", open source (AGPL-3.0, igual ao Strudel) e de portfólio.

- **Compor em código, mixar com mouse:** pattern no editor, volume/mute/solo/FX em faders.
- **Do loop à música:** cenas (quais tracks tocam) encadeadas numa timeline de arranjo.
- **Tocar ao vivo:** lançar cenas quantizadas no próximo ciclo, bom pra stream.
- **Exportar:** gravar o master em WAV.
- **Ver o som:** visualizador 3D reaproveitando o Noise (fase posterior).

## Escopo do MVP

O MVP fecha quando dá pra montar um loop de 4–8 tracks, mixar, salvar o projeto e reabrir igual.

**Dentro do MVP**

- [ ] Projeto com BPM global e lista de tracks
- [ ] Editor Strudel por track (CodeMirror com highlight do Strudel)
- [ ] Play/stop global, avaliação ao vivo com Ctrl+Enter por track
- [ ] Mixer: volume, mute, solo por track + master
- [ ] Medidor de nível no master
- [ ] Salvar/abrir projeto (JSON) e autosave
- [ ] Samples padrão (dirt-samples) com cache

**Fase 2 em diante**

- Cenas, timeline de arranjo, lançamento quantizado
- FX por track (reverb, delay, filtro) e sends
- Export WAV
- Samples locais (pasta do usuário)
- MIDI in (controlador nos faders) e MIDI out
- Visualizador 3D

**Fora de escopo**

Gravação de áudio externo, VST/plugins nativos, piano roll, automação desenhada à mão, colaboração em rede.

## Stack técnica

Electron + Vite + React + TypeScript, com o Strudel rodando inteiro no renderer (é lá que existe Web Audio).

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Shell desktop | Electron + electron-vite | HMR no renderer, build de main/preload/renderer num lugar só |
| UI | React + TypeScript | Familiar; componentes de mixer e timeline |
| Estado | Zustand + zundo | Store simples com undo/redo pronto |
| Engine musical | @strudel/core, mini, transpiler, webaudio (superdough) | Patterns, mini-notation e sintetizador/sampler |
| Editor | @strudel/codemirror | Highlight e destaque de eventos tocando |
| Visual (fase 4) | Three.js | Reaproveita o visualizador do Noise |
| Testes | Vitest | Testar o compilador de projeto → código |
| Empacotamento | electron-builder | .exe/AppImage |

Fixar as versões dos pacotes `@strudel/*` no package.json; a API interna (orbits, superdough) muda entre versões.

## Arquitetura

A regra central: **o projeto é a fonte da verdade, e o código que o Strudel toca é gerado a partir dele.** A UI nunca mexe no Strudel direto; ela altera a store, e o compilador regenera o código.

&#91;embedded content: arquitetura · renderer, preload, main\]

A UI só fala com a store; o compilador é o único caminho até o Strudel, e o main só entra por IPC ou servindo samples.

**Main process (Node)**

- Abrir/salvar projetos, autosave, diálogos de arquivo
- Indexar a pasta de samples locais e gerar o manifesto `strudel.json`
- Protocolo customizado `samples://` servindo os arquivos locais pro renderer
- Gravar o WAV exportado em disco

**Preload**

- `contextBridge` expondo uma API tipada e mínima: `project.open/save`, `samples.scan`, `export.write`
- `contextIsolation: true`, `nodeIntegration: false`

**Renderer**

- **Store (Zustand):** projeto, tracks, mixer, cenas, transporte
- **Compilador:** função pura `compile(project, scene) → string` com o código Strudel final
- **Engine:** wrapper fino do Strudel (init, `evaluate`, start/stop, BPM). Única peça que importa `@strudel/*`
- **Medição:** `AnalyserNode` no master para VU e, depois, o visualizador

Fluxo de uma mudança: fader mexe → store atualiza → compilador gera código → engine reavalia (com debounce de \~50 ms). Reavaliar o Strudel é barato e não corta o som; ele troca o pattern no próximo evento.

## Modelo de dados

Um projeto é um JSON versionado; tudo que toca é derivável dele.

```typescript
interface Project {
  version: 1;
  name: string;
  bpm: number;              // cps = bpm / 60 / beatsPerCycle
  beatsPerCycle: number;    // padrão 4 (1 ciclo = 1 compasso)
  sampleSources: string[];  // 'github:tidalcycles/dirt-samples', 'local:/caminho'
  prelude: string;          // código global opcional (helpers, setup)
  tracks: Track[];
  master: { gain: number };
  scenes: Scene[];          // fase 2
  arrangement: Section[];   // fase 2
}

interface Track {
  id: string;
  name: string;
  color: string;
  code: string;             // UMA expressão Strudel, ex: s("bd*4").bank("tr909")
  orbit: number;            // 1 orbit por track = FX isolados
  mixer: { gain: number; pan: number; mute: boolean; solo: boolean };
  fx: { room: number; delay: number; lpf?: number };  // fase 2
}

interface Scene   { id: string; name: string; trackIds: string[] }
interface Section { sceneId: string; bars: number }
```

Restrição importante: `Track.code` é uma expressão (sem `setcps`, sem `samples()`). Tempo e samples ficam no projeto, assim o compilador controla tudo.

## Engine de áudio e mixer

O mixer não é um grafo de áudio separado: ele vira parâmetros no próprio código Strudel. Cada track é envolvida pelo compilador com `.orbit()`, `.gain()`, `.pan()` e FX.

Exemplo do que `compile()` gera para duas tracks (kick tocando, hat mutado):

```javascript
setcps(128 / 60 / 4)

$: (s("bd*4").bank("tr909"))
  .orbit(1).gain(0.9).pan(0.5).room(0.1)

_$: (s("hh*8"))            // _$ = track silenciada
  .orbit(2).gain(0.6).pan(0.6)
```

Regras do compilador:

1. Se alguma track tem solo, tocam só as com solo; as outras viram `_$:`.
2. Mute sempre vira `_$:`.
3. Gain efetivo = `track.gain × master.gain`.
4. Código da track entra entre parênteses, para que os métodos encadeados se apliquem à expressão inteira.
5. Track com erro de sintaxe: o compilador a marca e mantém a última versão válida tocando.

**Medição:** o master tem um `AnalyserNode` para VU e espectro. VU por track exige acessar a saída por orbit do superdough, que é API interna; fica como pesquisa da fase 2.

**Lançamento quantizado (fase 2):** trocar de cena reavalia no início do próximo ciclo, usando o relógio do scheduler do Strudel.

## Arranjo: cenas e timeline

Cena = conjunto de tracks ligadas. Arranjo = sequência de cenas com duração em compassos (1 compasso = 1 ciclo).

Dois modos de tocar:

- **Modo live:** o usuário dispara cenas; a troca entra no próximo ciclo. O compilador gera só as tracks da cena ativa.
- **Modo música:** o compilador transforma o arranjo inteiro num único pattern com `arrange()` do Strudel, que toca cada trecho pelo número de ciclos indicado. Determinístico, então é o modo usado no export.

```javascript
// esboço do código gerado no modo música
const intro = stack(kick, pad)
const drop  = stack(kick, hat, bass, lead)
$: arrange([8, intro], [16, drop], [8, intro])
```

No modo música, as tracks viram constantes nomeadas e as cenas viram `stack()`. A timeline na UI é só a visão desse array: blocos coloridos por cena, largura proporcional aos compassos, cursor sincronizado ao ciclo atual.

## UI e layout

Uma janela única, em quatro áreas:

- **Topo (transporte):** play/stop, BPM, modo live/música, CPU/estado do áudio, VU do master.
- **Esquerda (tracks):** lista de tracks com cor, nome, mute/solo; clicar abre o editor.
- **Centro (editor):** CodeMirror da track selecionada, com highlight dos eventos tocando e erro inline. Abas ou split para editar duas tracks.
- **Base (mixer / arranjo):** alterna entre o mixer (um canal por track + master) e a timeline de cenas.

Atalhos essenciais: `Ctrl+Enter` avalia a track, `Ctrl+.` para tudo, `Espaço` play/stop fora do editor, `1–9` dispara cenas no modo live.

## Export, persistência e samples

**Export (fase 2):** gravação em tempo real do master, no modo música. Um `AudioWorkletNode` no fim da cadeia captura PCM float32; ao terminar o arranjo, o renderer manda os buffers ao main, que escreve WAV 16/24-bit 44,1/48 kHz. Render offline (mais rápido que tempo real) depende de rodar o superdough num `OfflineAudioContext`; fica como pesquisa.

**Persistência:** arquivo `.json` com o `Project`, campo `version` para migrações. Autosave a cada 30 s e ao trocar de janela, em arquivo separado (`.autosave.json`), para nunca sobrescrever o salvo manualmente sem querer.

**Samples:**

- Padrão: `github:tidalcycles/dirt-samples`, com cache do navegador (precisa de internet na primeira vez).
- Locais (fase 2): o usuário escolhe uma pasta; o main varre os áudios, gera um `strudel.json` (nome do banco → arquivos) e serve tudo via `samples://`. Cada subpasta vira um banco: `samples/kicks/*.wav` → `s("kicks:2")`.

## Estrutura de pastas

```text
src/
  main/
    index.ts            # janela, menus, ciclo de vida
    project-files.ts    # abrir/salvar/autosave
    samples.ts          # varredura de pasta + manifesto + protocolo samples://
    export.ts           # escrita de WAV
  preload/
    index.ts            # contextBridge: window.studio.*
  shared/
    types.ts            # Project, Track, Scene, Section
    ipc.ts              # nomes e tipos dos canais IPC
  renderer/
    app/                # layout, atalhos
    store/              # Zustand: project, transport, ui
    compiler/
      compile.ts        # Project -> código Strudel (função pura)
      compile.test.ts   # testes de mute/solo/arranjo
    engine/
      strudel.ts        # init, evaluate, start/stop, bpm
      meter.ts          # AnalyserNode do master
      recorder.ts       # AudioWorklet de export (fase 2)
    features/
      tracks/  editor/  mixer/  arrangement/  transport/
```

O `compiler/` não importa nada do Strudel nem do React: é a parte mais testável e a que mais vai mudar.

## Roadmap e riscos

Começar por um spike de 1–2 dias que prove o caminho crítico: Strudel tocando dentro do Electron com código gerado.

1. **Fase 0 — Spike:** electron-vite + Strudel tocando `s("bd*4")`; reavaliar código gerado com `$:` e `_$:`; confirmar orbits e `setcps`.
2. **Fase 1 — MVP:** tracks, editor, mixer (gain/pan/mute/solo), VU do master, salvar/abrir, autosave.
3. **Fase 2 — Música:** cenas, modo live quantizado, `arrange()` no modo música, FX por track, export WAV, samples locais.
4. **Fase 3 — Performance:** MIDI in nos faders, MIDI out, atalhos de cena, modo tela cheia para stream.
5. **Fase 4 — Visual:** visualizador Three.js (Noise) no master, cor por track.

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| API interna do Strudel/superdough muda | Quebra orbits, medição ou export | Isolar tudo em `engine/`; fixar versões |
| VU por track e export offline dependem de internals | Features atrasam | Começar com VU de master e export em tempo real |
| Latência maior que DAW nativo (sem ASIO) | Incomoda tocando MIDI ao vivo | Aceitável para live coding; ajustar latencyHint |
| Reavaliação a cada fader causa engasgo | Clicks no áudio | Debounce; avaliar só quando o código gerado muda |
| Código do usuário com erro trava o pattern | Silêncio no meio da música | Manter a última versão válida por track |
| Licença AGPL-3.0 | O app inteiro precisa ser AGPL | Repo público com LICENSE AGPL desde o primeiro commit |
