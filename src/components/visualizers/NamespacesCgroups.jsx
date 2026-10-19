import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Gauge, Play, RotateCcw, Skull } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import { cn } from '../../lib/cn';

const NAMESPACES = [
  { id: 'pid', desc: 'Isolates the process tree. The container sees its main process as PID 1 and nothing else.', inside: 'PID 1   nginx: master process', outside: 'PID 48213   nginx: master process' },
  { id: 'net', desc: 'A private network stack: interfaces, routes, iptables rules and port space.', inside: 'eth0  172.17.0.2/16', outside: 'veth9c1e2 → docker0 bridge' },
  { id: 'mnt', desc: 'A private mount table. "/" is the image root filesystem (an overlay2 mount).', inside: '/  (overlay: merged image layers)', outside: '/var/lib/docker/overlay2/<id>/merged' },
  { id: 'uts', desc: 'Its own hostname and NIS domain name.', inside: 'hostname → 3f9c2a1b7d4e', outside: 'hostname → prod-host-01' },
  { id: 'ipc', desc: 'Separate System V IPC objects and POSIX message queues / shared memory.', inside: 'ipcs → (empty)', outside: 'ipcs → host segments' },
  { id: 'user', desc: 'Maps UIDs: root inside the container can be an unprivileged UID on the host (rootless / userns-remap).', inside: 'uid=0(root)', outside: 'uid=100000 (unprivileged)' },
  { id: 'cgroup', desc: 'Virtualises the view of /sys/fs/cgroup so the container sees its own cgroup as the root.', inside: '/sys/fs/cgroup → "/"', outside: '/sys/fs/cgroup/system.slice/docker-<id>.scope' },
];

const APP_PEAK = 300; // MB the demo workload needs

/** Namespaces explorer + a cgroup memory-limit / OOM-killer simulation. */
export default function NamespacesCgroups() {
  const [ns, setNs] = useState(NAMESPACES[0]);
  const [limit, setLimit] = useState(256);
  const [cpus, setCpus] = useState(1.5);
  const [usage, setUsage] = useState(0);
  const [state, setState] = useState('idle'); // idle | running | stable | oom

  useEffect(() => {
    if (state !== 'running') return undefined;
    const t = setInterval(() => setUsage((u) => u + 12), 90);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (state !== 'running') return;
    if (usage >= limit) setState('oom');
    else if (usage >= APP_PEAK) setState('stable');
  }, [usage, limit, state]);

  const start = () => {
    setUsage(0);
    setState('running');
  };
  const pct = Math.min(100, (usage / limit) * 100);

  return (
    <Panel title="Kernel primitives behind every container" icon={Eye}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Namespaces: what a process can see</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {NAMESPACES.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setNs(n)}
            className={cn(
              'rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase transition',
              ns.id === n.id ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200',
            )}
          >
            {n.id}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={ns.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
          <p className="text-sm leading-6 text-slate-300">{ns.desc}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-cyan-400">Inside the container</div>
              <div className="mt-1 font-mono text-xs text-slate-200">{ns.inside}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">From the host</div>
              <div className="mt-1 font-mono text-xs text-slate-300">{ns.outside}</div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500">cgroups: what a process can use</div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-slate-400">
          Memory limit <span className="font-mono text-cyan-300">--memory={limit}m</span>
          <input
            type="range"
            min={128}
            max={512}
            step={32}
            value={limit}
            disabled={state === 'running'}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setState('idle');
              setUsage(0);
            }}
            className="mt-2 w-full accent-cyan-400"
          />
        </label>
        <label className="text-xs text-slate-400">
          CPU quota <span className="font-mono text-cyan-300">--cpus={cpus}</span>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={cpus}
            onChange={(e) => setCpus(Number(e.target.value))}
            className="mt-2 w-full accent-cyan-400"
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            = {Math.round(cpus * 100000)}µs of CPU time per 100ms period (cpu.max)
          </span>
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-ink-950/50 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs text-slate-300">
            <Gauge className="h-4 w-4 text-cyan-400" /> App needs ~{APP_PEAK} MB at peak
          </span>
          <div className="flex gap-2">
            <Button icon={Play} onClick={start} disabled={state === 'running'}>Run workload</Button>
            <Button variant="ghost" icon={RotateCcw} onClick={() => { setState('idle'); setUsage(0); }} />
          </div>
        </div>
        <div className="relative h-6 overflow-hidden rounded-md bg-white/5">
          <motion.div
            className={cn('h-full', state === 'oom' ? 'bg-rose-500/70' : pct > 80 ? 'bg-amber-400/70' : 'bg-cyan-400/60')}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.1 }}
          />
          <span className="absolute inset-0 grid place-items-center font-mono text-[11px] text-white">
            {Math.min(usage, limit)} / {limit} MB
          </span>
        </div>
        <div className="mt-2 min-h-[20px] font-mono text-[11px]">
          {state === 'oom' && (
            <span className="flex items-center gap-1.5 text-rose-400">
              <Skull className="h-3.5 w-3.5" /> OOMKilled: the kernel killed the process (exit code 137). Raise the limit or fix the leak.
            </span>
          )}
          {state === 'stable' && <span className="text-emerald-400">Workload stable at {APP_PEAK} MB, within the cgroup limit.</span>}
          {state === 'running' && <span className="text-slate-400">Allocating memory…</span>}
        </div>
      </div>
    </Panel>
  );
}
