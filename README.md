# Docker Mastery

An interactive course that takes you from Docker fundamentals to production orchestration. Each lesson is split-screen: the concept on the left and a live playground on the right (an animated diagram, a simulator, or a mock terminal).

## Quick start

Requires **Node.js 18+**.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production bundle in dist/
npm run preview   # serve the production build
```

## Stack

| Concern | Choice |
| --- | --- |
| Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 (dark-first, `ink` + `docker` palette, Inter / JetBrains Mono) |
| Motion | Framer Motion (SVG packet flows, layout transitions, drag) |
| Icons | lucide-react |
| Code | prism-react-renderer with custom Dockerfile + shell grammars (`src/lib/prism.js`) |
| State | Zustand with `persist` (progress and quiz scores in localStorage) |
| YAML | js-yaml (live Compose editor) |

## Curriculum

| # | Module | Interactive pieces |
| --- | --- | --- |
| 1 | Foundations & Architecture | `VmVsContainer`, `NamespacesCgroups` (OOM-killer sim), **`ArchitectureVisualizer`**, lifecycle terminal |
| 2 | Images, Containers & Builds | `DockerfileParser`, `CmdEntrypointLab`, **`LayerStackExplorer`**, `UnionFsVisualizer` (copy-up / whiteouts) |
| 3 | Storage & Volumes | **`VolumeInspector`** (volume / bind / tmpfs / none persistence experiment), comparison table |
| 4 | Networking | `NetworkDrivers` (bridge/host/none/overlay packet flows), **`NetworkSandbox`** (drag & ping with DNS), `PortMapping` |
| 5 | Compose | `ComposeEditor`: live YAML → topology, warnings, `compose up` replay |
| 6 | Swarm | `RaftCluster` (quorum & elections), `SwarmScheduler` (reconciliation, rolling updates, routing mesh) |
| 7 | Security, Optimization & CLI | `SecurityBuilder` (hardening workbench), scan terminal, searchable `CheatSheet` with flag explainer |

Every module ends with a quiz and a "complete & continue" step. Progress shows in the sidebar.

## Project structure

```
src/
├── App.jsx                     # shell, hash routing (#/networking), page transitions
├── store/useLearningStore.js   # Zustand: active page, completion, quiz scores
├── data/
│   ├── modules.js              # curriculum metadata
│   ├── quizzes.js              # knowledge checks per module
│   └── cheatsheet.js           # CLI reference + per-flag explanations
├── lib/
│   ├── prism.js                # Dockerfile/bash grammars + theme
│   ├── compose.js              # compose parser: normalisation, warnings, dependency levels, cycles
│   └── cn.js
├── components/
│   ├── layout/                 # Sidebar, TopBar, Home, ModuleShell, Lesson (split-screen)
│   ├── ui/                     # Panel, Button, Switch, Segmented, Callout, CodeBlock, Terminal, Quiz
│   └── visualizers/            # one file per interactive diagram / simulator
└── modules/                    # Module1Foundations … Module7Security (lesson content)
```

## Adding a lesson

```jsx
<Lesson eyebrow="4.5 · Topic" title="Lesson title" visual={<MyVisualizer />}>
  <p>Explanation on the left…</p>
</Lesson>
```

Pass `wide` when a playground needs the full width (editors, canvases). A terminal is pure data:

```jsx
<Terminal commands={[{ cmd: 'docker ps', output: ['CONTAINER ID   IMAGE …', { text: 'done', tone: 'ok' }] }]} />
```

## Notes

- Every simulation runs in the browser. Nothing talks to a real Docker daemon. Terminal output is representative, and image sizes and CVE counts are illustrative.
- The packet animations are SVG/DOM animated with Framer Motion (no canvas), so they stay sharp and accessible at any size.
