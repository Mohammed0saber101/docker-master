import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, FilePen, FileX, FilePlus, RotateCcw, Layers3, Eraser } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import { cn } from '../../lib/cn';

/**
 * Overlay2 / union filesystem simulator.
 *
 * lowerdir = read-only image layers, upperdir = the container's writable layer,
 * merged = the single view the container sees. Writes trigger copy-up; deletes
 * create whiteout files; removing the container discards upperdir.
 */
const LOWER = [
  { id: 'l3', name: 'L3 · COPY ./site /app', tone: 'violet', files: { '/app/index.html': '<h1>v1</h1>', '/app/debug.log': '…' } },
  { id: 'l2', name: 'L2 · RUN apt-get install nginx', tone: 'sky', files: { '/usr/sbin/nginx': 'ELF', '/etc/nginx/nginx.conf': 'worker_processes 1;' } },
  { id: 'l1', name: 'L1 · FROM debian:bookworm-slim', tone: 'slate', files: { '/bin/bash': 'ELF', '/etc/os-release': 'Debian 12' } },
];

const TONE = {
  violet: { box: 'border-violet-400/30 bg-violet-400/5', dot: 'bg-violet-400', text: 'text-violet-200' },
  sky: { box: 'border-sky-400/30 bg-sky-400/5', dot: 'bg-sky-400', text: 'text-sky-200' },
  slate: { box: 'border-slate-500/30 bg-slate-500/5', dot: 'bg-slate-400', text: 'text-slate-300' },
  upper: { box: 'border-cyan-300/50 bg-cyan-300/5 border-dashed', dot: 'bg-cyan-300', text: 'text-cyan-200' },
};

const ACTIONS = [
  { id: 'modify', label: 'Edit nginx.conf', icon: FilePen, path: '/etc/nginx/nginx.conf',
    apply: (u) => ({ ...u, '/etc/nginx/nginx.conf': { type: 'file', op: 'copy-up' } }),
    explain: 'Copy-up: the whole file is copied from L2 into the upper layer, then modified there. L2 is untouched and still shared with every other container.' },
  { id: 'delete', label: 'rm /app/debug.log', icon: FileX, path: '/app/debug.log',
    apply: (u) => ({ ...u, '/app/debug.log': { type: 'whiteout' } }),
    explain: 'Lower layers are read-only, so the file cannot really be deleted. overlay2 writes a whiteout entry in upperdir that hides it from the merged view. The image does not get smaller.' },
  { id: 'create', label: 'Create /app/upload.png', icon: FilePlus, path: '/app/upload.png',
    apply: (u) => ({ ...u, '/app/upload.png': { type: 'file', op: 'new' } }),
    explain: 'New files are written straight to upperdir. They live only as long as this container. Use a volume for anything you want to keep.' },
];

export default function UnionFsVisualizer() {
  const [upper, setUpper] = useState({});
  const [last, setLast] = useState(null);

  const merged = useMemo(() => {
    const view = {};
    [...LOWER].reverse().forEach((layer) => {
      Object.keys(layer.files).forEach((p) => { view[p] = layer.id; });
    });
    Object.entries(upper).forEach(([p, e]) => {
      if (e.type === 'whiteout') delete view[p];
      else view[p] = 'upper';
    });
    return Object.entries(view).sort(([a], [b]) => a.localeCompare(b));
  }, [upper]);

  const toneOf = (src) => (src === 'upper' ? TONE.upper : TONE[LOWER.find((l) => l.id === src).tone]);

  return (
    <Panel
      title="Union filesystem (overlay2)"
      icon={Layers3}
      actions={<Button variant="ghost" icon={RotateCcw} onClick={() => { setUpper({}); setLast(null); }}>docker rm + run</Button>}
    >
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <Button
            key={a.id}
            variant="ghost"
            icon={a.icon}
            onClick={() => { setUpper(a.apply); setLast(a); }}
            disabled={Boolean(upper[a.path])}
          >
            {a.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Layers on disk</div>
          <div className={cn('rounded-lg border p-2.5', TONE.upper.box)}>
            <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-200">
              <span>upperdir · container layer (R/W)</span>
            </div>
            <div className="mt-1 min-h-[22px] space-y-0.5">
              <AnimatePresence>
                {Object.entries(upper).map(([p, e]) => (
                  <motion.div
                    key={p}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn('flex items-center gap-1.5 font-mono text-[11px]', e.type === 'whiteout' ? 'text-rose-300' : 'text-cyan-100')}
                  >
                    {e.type === 'whiteout' ? <Eraser className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                    {p}
                    <span className="text-[10px] opacity-60">{e.type === 'whiteout' ? '(whiteout c 0:0)' : e.op === 'copy-up' ? '(copied up)' : '(new)'}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!Object.keys(upper).length && <div className="font-mono text-[11px] text-slate-600">empty</div>}
            </div>
          </div>
          {LOWER.map((l) => (
            <div key={l.id} className={cn('rounded-lg border p-2.5', TONE[l.tone].box)}>
              <div className={cn('text-[11px] font-semibold', TONE[l.tone].text)}>{l.name} <span className="font-normal opacity-50">· lowerdir (R/O)</span></div>
              <div className="mt-1 space-y-0.5">
                {Object.keys(l.files).map((p) => (
                  <div key={p} className={cn('flex items-center gap-1.5 font-mono text-[11px] text-slate-400', upper[p] && 'line-through opacity-50')}>
                    <FileText className="h-3 w-3" />
                    {p}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">merged · what the container sees</div>
          <div className="mt-1.5 rounded-lg border border-white/10 bg-[#060a14] p-3">
            <div className="mb-2 font-mono text-[11px] text-slate-500">$ find / -type f</div>
            <div className="space-y-1">
              <AnimatePresence>
                {merged.map(([p, src]) => (
                  <motion.div
                    layout
                    key={p}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 font-mono text-[11.5px] text-slate-200"
                  >
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', toneOf(src).dot)} />
                    {p}
                    <span className="ml-auto text-[10px] text-slate-500">{src === 'upper' ? 'upper' : src.toUpperCase()}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {last && (
              <motion.p key={last.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-xs leading-5 text-slate-300">
                {last.explain}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg bg-ink-950/60 p-2.5 font-mono text-[10.5px] leading-5 text-slate-500">
        mount -t overlay overlay -o lowerdir=<span className="text-violet-300">L3</span>:<span className="text-sky-300">L2</span>:<span className="text-slate-300">L1</span>,upperdir=<span className="text-cyan-300">diff</span>,workdir=work merged
      </div>
    </Panel>
  );
}
