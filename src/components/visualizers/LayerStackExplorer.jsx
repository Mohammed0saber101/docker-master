import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hammer, Layers, Loader2, CheckCircle2, Zap, Box } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Switch from '../ui/Switch';
import Segmented from '../ui/Segmented';
import { cn } from '../../lib/cn';

/**
 * LayerStackExplorer
 *
 * Simulates BuildKit's layer cache. Each instruction's cache key depends on its
 * parent layer + its own inputs. The first instruction whose inputs changed is
 * a cache MISS, and every instruction after it must be rebuilt.
 *
 * `deps` lists which simulated changes invalidate an instruction directly.
 * `secs` is a realistic build time used for the summary.
 */
const FROM = { id: 'from', ins: 'FROM node:20-alpine', size: 132, secs: 6, deps: ['base'] };
const WORKDIR = { id: 'workdir', ins: 'WORKDIR /app', size: 0, secs: 0.1 };
const CMD = { id: 'cmd', ins: 'CMD ["node", "server.js"]', size: 0, secs: 0, meta: true };

const DOCKERFILES = {
  good: [
    FROM,
    WORKDIR,
    { id: 'pkg', ins: 'COPY package*.json ./', size: 0.3, secs: 0.2, deps: ['pkg'] },
    { id: 'install', ins: 'RUN npm ci --omit=dev', size: 48, secs: 22 },
    { id: 'src', ins: 'COPY . .', size: 2.4, secs: 0.4, deps: ['src'] },
    CMD,
  ],
  bad: [
    FROM,
    WORKDIR,
    { id: 'src', ins: 'COPY . .', size: 2.7, secs: 0.4, deps: ['src', 'pkg'] },
    { id: 'install', ins: 'RUN npm ci --omit=dev', size: 48, secs: 22 },
    CMD,
  ],
};

const NO_CHANGES = { src: false, pkg: false, base: false };

function makeHash(seed) {
  let h1 = 2166136261;
  let h2 = 5381;
  for (let i = 0; i < seed.length; i++) {
    h1 = Math.imul(h1 ^ seed.charCodeAt(i), 16777619);
    h2 = Math.imul(h2, 33) ^ seed.charCodeAt(i);
  }
  return ((h1 >>> 0).toString(16) + (h2 >>> 0).toString(16)).padEnd(12, '0').slice(0, 12);
}

const STATUS_STYLE = {
  pending: 'border-white/10 bg-white/[0.02] text-slate-500',
  building: 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100',
  cached: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
  built: 'border-amber-400/50 bg-amber-400/10 text-amber-100',
};

export default function LayerStackExplorer() {
  const [order, setOrder] = useState('good');
  const [changes, setChanges] = useState(NO_CHANGES);
  const [hasCache, setHasCache] = useState(false);
  const [plan, setPlan] = useState(null);
  const [cursor, setCursor] = useState(-1);
  const [statuses, setStatuses] = useState({});
  const [hashes, setHashes] = useState({});
  const [buildNo, setBuildNo] = useState(0);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false); // container started from the image

  const steps = DOCKERFILES[order];
  const building = cursor >= 0;

  useEffect(() => {
    if (cursor < 0 || !plan) return undefined;
    if (cursor >= plan.length) {
      const rebuilt = plan.filter((s) => !s.hit);
      setResult({
        secs: rebuilt.reduce((t, s) => t + s.secs, 0),
        cached: plan.length - rebuilt.length,
        total: plan.length,
      });
      setHasCache(true);
      setChanges(NO_CHANGES);
      setCursor(-1);
      return undefined;
    }
    const step = plan[cursor];
    setStatuses((s) => ({ ...s, [step.id]: step.hit ? 'cached' : 'building' }));
    const t = setTimeout(
      () => {
        if (!step.hit) {
          setStatuses((s) => ({ ...s, [step.id]: 'built' }));
          setHashes((h) => ({ ...h, [step.id]: makeHash(`${step.id}-${order}-${buildNo}`) }));
        }
        setCursor((c) => c + 1);
      },
      step.hit ? 260 : Math.min(400 + step.secs * 60, 1800),
    );
    return () => clearTimeout(t);
  }, [cursor, plan, buildNo, order]);

  const build = () => {
    const firstMiss = hasCache ? steps.findIndex((s) => s.deps?.some((d) => changes[d])) : 0;
    setPlan(steps.map((s, i) => ({ ...s, hit: firstMiss === -1 || i < firstMiss })));
    setStatuses(Object.fromEntries(steps.map((s) => [s.id, 'pending'])));
    setResult(null);
    setRunning(false);
    setBuildNo((n) => n + 1);
    setCursor(0);
  };

  const switchOrder = (o) => {
    setOrder(o);
    setHasCache(false);
    setPlan(null);
    setStatuses({});
    setHashes({});
    setResult(null);
    setRunning(false);
    setChanges(NO_CHANGES);
  };

  const visible = (plan || steps).filter((s) => !s.meta);
  const stack = [...visible].reverse();
  const totalSize = visible.reduce((t, s) => t + s.size, 0);

  return (
    <Panel
      title="Layer cache explorer"
      icon={Layers}
      actions={
        <Segmented
          layoutId="layer-order"
          value={order}
          onChange={(v) => !building && switchOrder(v)}
          options={[
            { value: 'good', label: 'Cache-friendly order' },
            { value: 'bad', label: 'Naive order' },
          ]}
        />
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Build steps */}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Build output</div>
          <div className="space-y-1.5 rounded-xl border border-white/5 bg-[#060a14] p-3 font-mono text-[11.5px]">
            {steps.map((s, i) => {
              const st = statuses[s.id] || 'pending';
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-slate-600">#{i + 1}</span>
                  <span className={cn('flex-1 truncate', st === 'pending' ? 'text-slate-500' : 'text-slate-200')}>{s.ins}</span>
                  {st === 'building' && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />}
                  {st === 'cached' && <span className="rounded bg-emerald-400/15 px-1.5 text-[10px] font-bold text-emerald-300">CACHED</span>}
                  {st === 'built' && <span className="rounded bg-amber-400/15 px-1.5 text-[10px] font-bold text-amber-300">{s.secs}s</span>}
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              What changed since the last build?
            </div>
            <Switch label="Edited src/server.js" checked={changes.src} disabled={!hasCache || building} onChange={(v) => setChanges((c) => ({ ...c, src: v }))} />
            <Switch label="Added a dependency (package.json)" checked={changes.pkg} disabled={!hasCache || building} onChange={(v) => setChanges((c) => ({ ...c, pkg: v }))} />
            <Switch label="Bumped base image tag" checked={changes.base} disabled={!hasCache || building} onChange={(v) => setChanges((c) => ({ ...c, base: v }))} />
            {!hasCache && <p className="px-2 text-[11px] text-slate-500">Build once to populate the cache.</p>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button icon={Hammer} onClick={build} disabled={building}>
              {hasCache ? 'Rebuild' : 'docker build -t app .'}
            </Button>
            <Button variant="ghost" icon={Box} onClick={() => setRunning((r) => !r)} disabled={!hasCache || building}>
              {running ? 'docker rm' : 'docker run'}
            </Button>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'mt-3 flex items-start gap-2 rounded-lg border p-3 text-xs leading-5',
                  result.secs > 10 ? 'border-amber-400/30 bg-amber-400/5 text-amber-100' : 'border-emerald-400/30 bg-emerald-400/5 text-emerald-100',
                )}
              >
                {result.secs > 10 ? <Zap className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>
                  Finished in ~{result.secs.toFixed(1)}s, {result.cached}/{result.total} steps cached.
                  {order === 'bad' && result.secs > 10 && buildNo > 1 && ' A source edit busted the npm install cache. Switch to the cache-friendly order.'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Layer stack */}
        <div>
          <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Image layers (top = newest)</span>
            <span className="font-mono normal-case">{totalSize.toFixed(1)} MB</span>
          </div>
          <div className="space-y-1.5">
            <AnimatePresence>
              {running && (
                <motion.div
                  key="rw"
                  initial={{ opacity: 0, y: -16, scaleY: 0.6 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="rounded-lg border-2 border-dashed border-cyan-300/60 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100"
                >
                  <div className="font-semibold">Container layer · read/write</div>
                  <div className="font-mono text-[10px] opacity-70">thin, per-container, deleted with the container</div>
                </motion.div>
              )}
            </AnimatePresence>
            {stack.map((s) => {
              const st = statuses[s.id] || 'pending';
              return (
                <motion.div
                  layout
                  key={s.id}
                  animate={st === 'building' ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={st === 'building' ? { repeat: Infinity, duration: 0.8 } : { duration: 0.2 }}
                  className={cn('rounded-lg border px-3 py-2 text-xs transition-colors', STATUS_STYLE[st])}
                  style={{ minHeight: 34 + Math.min(28, Math.sqrt(s.size) * 2.4) }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono">{s.ins}</span>
                    <span className="shrink-0 font-mono text-[10px] opacity-70">{s.size} MB</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] opacity-60">
                    {hashes[s.id] ? `sha256:${hashes[s.id]}…` : 'not built'} · read-only
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-400/60" /> cache hit</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400/60" /> rebuilt</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-cyan-400/60" /> building</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
