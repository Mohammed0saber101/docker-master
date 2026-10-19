import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, FileCode, Pause, Play } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import CodeBlock from '../ui/CodeBlock';
import { cn } from '../../lib/cn';

/**
 * Interactive Dockerfile walkthrough. Each line is annotated with what kind of
 * artifact it produces (filesystem layer / metadata / new stage) and why it is
 * written that way. Click a line or step through with the controls.
 */
const LINES = [
  { code: '# syntax=docker/dockerfile:1', kind: 'directive', title: 'Parser directive',
    text: 'Pins the BuildKit Dockerfile frontend so newer syntax (heredocs, RUN --mount, COPY --link) is available regardless of your Docker version.' },
  { code: 'FROM node:20-alpine AS build', kind: 'stage', title: 'FROM … AS build: stage 1',
    text: 'Starts a new build stage from a base image and names it "build". Everything here is temporary tooling: compilers, dev dependencies, source code.' },
  { code: 'WORKDIR /app', kind: 'meta', title: 'WORKDIR',
    text: 'Sets (and creates if needed) the working directory for following RUN, COPY, CMD and ENTRYPOINT instructions. Prefer it over `RUN cd …`.' },
  { code: 'COPY package*.json ./', kind: 'layer', title: 'COPY the manifest first',
    text: 'Copies only package.json and package-lock.json. Because these rarely change, the next (expensive) layer can be served from cache on most builds.' },
  { code: 'RUN npm ci', kind: 'layer', title: 'RUN: install dependencies',
    text: 'Executes a command in a temporary container and snapshots the filesystem diff as a new layer. `npm ci` installs exactly what the lockfile says.' },
  { code: 'COPY . .', kind: 'layer', title: 'COPY the source',
    text: 'Copies the rest of the build context (filtered by .dockerignore). Any source change invalidates this layer and everything after it, but not the install above.' },
  { code: 'RUN npm run build && npm prune --omit=dev', kind: 'layer', title: 'Build, then prune',
    text: 'Compiles the app and removes devDependencies in the same RUN, so the pruned node_modules is what later stages copy.' },
  { code: '', kind: 'blank' },
  { code: 'FROM gcr.io/distroless/nodejs20-debian12 AS runtime', kind: 'stage', title: 'FROM … AS runtime: stage 2',
    text: 'A fresh stage. Nothing from "build" comes along unless explicitly copied. Distroless images contain the runtime only: no shell, no package manager.' },
  { code: 'WORKDIR /app', kind: 'meta', title: 'WORKDIR (again)',
    text: 'Each stage starts clean, so state such as WORKDIR, ENV and USER must be set again.' },
  { code: 'ENV NODE_ENV=production', kind: 'meta', title: 'ENV',
    text: 'Sets an environment variable that persists into running containers. Never put secrets here: ENV values are stored in the image config and history.' },
  { code: 'COPY --from=build /app/node_modules ./node_modules', kind: 'layer', title: 'COPY --from: cherry-pick artifacts',
    text: 'Copies production dependencies out of the build stage. Compilers, caches and dev deps stay behind.' },
  { code: 'COPY --from=build /app/dist ./dist', kind: 'layer', title: 'COPY --from (compiled output)',
    text: 'Only the compiled JavaScript ships. The original TypeScript sources and tests never reach production.' },
  { code: 'USER nonroot', kind: 'meta', title: 'USER: drop root',
    text: 'Distroless provides a `nonroot` user (UID 65532). Every following instruction and the container process run as this user.' },
  { code: 'EXPOSE 3000', kind: 'meta', title: 'EXPOSE: documentation',
    text: 'Records which port the app listens on. It does NOT publish anything. Publishing happens at runtime with -p.' },
  { code: 'CMD ["dist/server.js"]', kind: 'meta', title: 'CMD (exec form)',
    text: 'Default arguments. The distroless node image’s ENTRYPOINT is the node binary, so this runs `node dist/server.js` as PID 1 and receives signals directly.' },
];

const KIND = {
  layer: { label: 'Creates a layer', cls: 'bg-amber-400/15 text-amber-200 border-amber-400/30' },
  meta: { label: 'Metadata only', cls: 'bg-slate-500/15 text-slate-300 border-slate-400/20' },
  stage: { label: 'New stage', cls: 'bg-violet-400/15 text-violet-200 border-violet-400/30' },
  directive: { label: 'Directive', cls: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/30' },
};

const steppable = LINES.map((l, i) => (l.kind === 'blank' ? null : i)).filter((i) => i !== null);

export default function DockerfileParser() {
  const [active, setActive] = useState(1);
  const [playing, setPlaying] = useState(false);
  const line = LINES[active];
  const pos = steppable.indexOf(active);

  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => {
      if (pos + 1 < steppable.length) setActive(steppable[pos + 1]);
      else setPlaying(false);
    }, 2600);
    return () => clearTimeout(t);
  }, [playing, pos]);

  const go = (delta) => {
    const nextPos = Math.max(0, Math.min(steppable.length - 1, pos + delta));
    setActive(steppable[nextPos]);
  };

  const lineMeta = Object.fromEntries(
    LINES.map((l, i) => [
      i,
      l.kind === 'blank' ? null : (
        <span className={cn('hidden rounded border px-1.5 text-[10px] sm:inline', KIND[l.kind].cls, i !== active && 'opacity-40')}>
          {l.kind === 'layer' ? 'layer' : l.kind === 'stage' ? 'stage' : l.kind === 'meta' ? 'meta' : 'dir'}
        </span>
      ),
    ]),
  );

  return (
    <Panel
      title="Dockerfile anatomy: multi-stage Node.js build"
      icon={FileCode}
      actions={
        <>
          <Button variant="ghost" icon={ChevronLeft} onClick={() => go(-1)} disabled={pos <= 0} />
          <Button icon={playing ? Pause : Play} onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Auto-play'}</Button>
          <Button variant="ghost" icon={ChevronRight} onClick={() => go(1)} disabled={pos >= steppable.length - 1} />
        </>
      }
    >
      <CodeBlock
        code={LINES.map((l) => l.code).join('\n')}
        language="dockerfile"
        title="Dockerfile"
        activeLine={active}
        lineMeta={lineMeta}
        onLineClick={(i) => {
          if (LINES[i].kind !== 'blank') {
            setActive(i);
            setPlaying(false);
          }
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={cn('rounded-md border px-2 py-0.5 text-[11px] font-semibold', KIND[line.kind].cls)}>{KIND[line.kind].label}</span>
            <span className="text-sm font-semibold text-white">{line.title}</span>
            <span className="ml-auto font-mono text-[11px] text-slate-500">
              step {pos + 1}/{steppable.length}
            </span>
          </div>
          <p className="text-sm leading-6 text-slate-300">{line.text}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 rounded-xl border border-white/5 bg-ink-950/50 p-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Final image size (typical)</div>
        {[
          { label: 'Single stage on node:20', size: 1100, cls: 'from-rose-500 to-rose-400' },
          { label: 'Single stage on node:20-alpine', size: 310, cls: 'from-amber-500 to-amber-300' },
          { label: 'Multi-stage → distroless', size: 160, cls: 'from-emerald-500 to-emerald-300' },
        ].map((b, i) => (
          <div key={b.label} className="mb-2 last:mb-0">
            <div className="mb-1 flex justify-between text-[11px] text-slate-400">
              <span>{b.label}</span>
              <span className="font-mono">~{b.size} MB</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className={cn('h-full rounded-full bg-gradient-to-r', b.cls)}
                initial={{ width: 0 }}
                whileInView={{ width: `${(b.size / 1100) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.15 }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
