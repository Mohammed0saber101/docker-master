import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal, Plug, Server, Cloud, Boxes, Zap, Box, Play, RotateCcw, AlertTriangle, CheckCircle2, Circle, Cpu, Workflow,
} from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Switch from '../ui/Switch';
import { cn } from '../../lib/cn';

/**
 * ArchitectureVisualizer
 *
 * Reactive SVG of the Docker Engine stack. Press "docker run" to watch a packet
 * travel CLI → REST API → dockerd → (registry) → containerd → shim/runc → kernel →
 * running container. Components can be switched off to see exactly where and
 * how the request fails. Click any box for a description.
 */

const NODE_W = 150;
const NODE_H = 60;

const NODES = [
  { id: 'cli', x: 30, y: 30, label: 'Docker CLI', sub: 'docker run nginx', icon: Terminal,
    desc: 'The `docker` binary is just a client. It turns commands into HTTP requests against the Engine API. It can talk to a local or remote daemon (DOCKER_HOST, contexts).' },
  { id: 'api', x: 30, y: 170, label: 'REST API', sub: 'docker.sock', icon: Plug,
    desc: 'The Docker Engine API, served on the Unix socket /var/run/docker.sock (or TCP with TLS). Anyone who can write to this socket effectively has root on the host.' },
  { id: 'dockerd', x: 290, y: 170, label: 'dockerd', sub: 'Docker daemon', icon: Server, toggle: true,
    desc: 'The daemon: manages images, builds (BuildKit), networks, volumes and the API. It delegates actually running containers to containerd.' },
  { id: 'registry', x: 550, y: 30, label: 'Registry', sub: 'Hub·GHCR·ECR', icon: Cloud,
    desc: 'Stores images as a manifest + content-addressed layer blobs (sha256). `docker pull` fetches only the layers you do not already have.' },
  { id: 'containerd', x: 290, y: 290, label: 'containerd', sub: 'lifecycle·images', icon: Boxes, toggle: true,
    desc: 'A CNCF-graduated container runtime daemon. Manages image content, snapshots (overlay2), and container lifecycle over gRPC. Kubernetes talks to it directly via CRI.' },
  { id: 'runc', x: 290, y: 410, label: 'shim → runc', sub: 'OCI runtime', icon: Zap, toggle: true,
    desc: 'containerd starts containerd-shim-runc-v2 per container; the shim calls runc, the reference OCI runtime, which sets up the sandbox and execs your process, then exits. The shim stays as the parent, so dockerd/containerd can restart without killing containers.' },
  { id: 'container', x: 550, y: 290, label: 'Container', sub: 'nginx · PID 1', icon: Box,
    desc: 'Just a Linux process tree, isolated by namespaces, limited by cgroups, rooted in an overlay filesystem built from the image layers.' },
];

const KERNEL = { x: 30, y: 510, w: 660, h: 50,
  desc: 'The host Linux kernel does the real work: namespaces (isolation), cgroups (resource limits), overlayfs (layered filesystem), netfilter/iptables (networking), seccomp/capabilities (security).' };

const EDGES = [
  [[105, 90], [105, 170]],
  [[180, 200], [290, 200]],
  [[440, 180], [550, 75]],
  [[365, 230], [365, 290]],
  [[365, 350], [365, 410]],
  [[365, 470], [365, 510]],
  [[625, 510], [625, 350]],
];

const STEPS = [
  { id: 'cli', path: [[105, 60], [105, 200]], nodes: ['cli', 'api'], title: 'CLI → REST API',
    detail: 'docker run becomes HTTP calls over /var/run/docker.sock: POST /containers/create then POST /containers/{id}/start.' },
  { id: 'daemon', path: [[105, 200], [365, 200]], nodes: ['api', 'dockerd'], requires: 'dockerd', title: 'API → dockerd',
    detail: 'dockerd validates the request and checks its local image store for nginx:latest.' },
  { id: 'pull', pull: true, path: [[365, 200], [625, 60]], nodes: ['dockerd', 'registry'], requires: 'dockerd', title: 'dockerd → Registry (pull)',
    detail: 'Image not found locally. The daemon resolves the manifest for your platform (linux/amd64) and requests missing layers.' },
  { id: 'layers', pull: true, path: [[625, 60], [365, 200]], nodes: ['registry', 'dockerd'], requires: 'dockerd', title: 'Layers downloaded',
    detail: 'Each compressed layer is verified against its sha256 digest and unpacked as a snapshot in /var/lib/docker.' },
  { id: 'containerd', path: [[365, 200], [365, 320]], nodes: ['dockerd', 'containerd'], requires: 'containerd', title: 'dockerd → containerd (gRPC)',
    detail: 'dockerd asks containerd to create the container: an OCI runtime spec (config.json) plus a prepared rootfs snapshot.' },
  { id: 'runc', path: [[365, 320], [365, 440]], nodes: ['containerd', 'runc'], requires: 'runc', title: 'containerd → shim → runc',
    detail: 'containerd launches containerd-shim-runc-v2, which invokes `runc create` / `runc start` for this container.' },
  { id: 'kernel', path: [[365, 440], [365, 535]], nodes: ['runc', 'kernel'], requires: 'kernel', title: 'runc → kernel syscalls',
    detail: 'runc calls clone() with CLONE_NEWPID|NEWNET|NEWNS…, writes cgroup limits, pivot_root()s into the overlay rootfs, drops capabilities, then execve()s nginx and exits.' },
  { id: 'running', path: [[365, 535], [625, 535], [625, 320]], nodes: ['kernel', 'container'], requires: 'kernel', title: 'Container running',
    detail: 'nginx runs as an ordinary host process, re-parented to the shim. `docker ps` now lists it.' },
];

const ERRORS = {
  dockerd: 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?',
  containerd: 'Error response from daemon: failed to create task: connection error: dial unix /run/containerd/containerd.sock: connect: connection refused (simulated)',
  runc: 'Error response from daemon: OCI runtime create failed: runc: executable file not found in $PATH (simulated)',
  kernel: 'OCI runtime create failed: unable to create namespaces / cgroups: operation not supported by kernel (simulated)',
};

export default function ArchitectureVisualizer() {
  const [enabled, setEnabled] = useState({ dockerd: true, containerd: true, runc: true, kernel: true });
  const [cached, setCached] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [selected, setSelected] = useState('dockerd');

  const steps = useMemo(() => STEPS.filter((s) => !(s.pull && cached)), [cached]);
  const current = status === 'running' || status === 'error' ? steps[idx] : null;

  useEffect(() => {
    if (status !== 'running') return undefined;
    if (idx >= steps.length) {
      setStatus('done');
      return undefined;
    }
    const step = steps[idx];
    if (step.requires && !enabled[step.requires]) {
      setStatus('error');
      return undefined;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), 1500);
    return () => clearTimeout(t);
  }, [status, idx, steps, enabled]);

  const start = () => {
    setIdx(0);
    setStatus('running');
  };
  const reset = () => {
    setIdx(-1);
    setStatus('idle');
  };

  const failedOn = status === 'error' ? current?.requires : null;
  const info = selected === 'kernel' ? { label: 'Linux kernel', desc: KERNEL.desc } : NODES.find((n) => n.id === selected);
  const containerUp = status === 'done';

  return (
    <Panel
      title="Docker Engine architecture"
      icon={Workflow}
      actions={
        <>
          <Button icon={Play} onClick={start} disabled={status === 'running'}>docker run nginx</Button>
          <Button variant="ghost" icon={RotateCcw} onClick={reset} />
        </>
      }
    >
      <div className="grid-bg rounded-xl border border-white/5 bg-ink-950/50 p-2">
        <svg viewBox="0 0 720 580" className="h-auto w-full select-none" role="img" aria-label="Docker architecture diagram">
          <defs>
            <filter id="arch-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {EDGES.map(([a, b], i) => (
            <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="stroke-slate-600" strokeWidth={1.5} strokeDasharray="5 6" />
          ))}

          {current && (
            <polyline
              key={`trail-${idx}`}
              points={current.path.map((p) => p.join(',')).join(' ')}
              fill="none"
              className={cn('animate-dash', status === 'error' ? 'stroke-rose-400' : 'stroke-cyan-400')}
              strokeWidth={2.5}
              strokeDasharray="6 6"
            />
          )}

          {/* Kernel bar */}
          <g onClick={() => setSelected('kernel')} className="cursor-pointer" opacity={enabled.kernel ? 1 : 0.4}>
            <rect
              x={KERNEL.x} y={KERNEL.y} width={KERNEL.w} height={KERNEL.h} rx={12}
              className={cn(
                current?.nodes.includes('kernel') ? 'fill-emerald-400/15 stroke-emerald-300' : 'fill-ink-850 stroke-slate-600',
                selected === 'kernel' && 'stroke-docker',
              )}
              strokeWidth={1.4}
              strokeDasharray={enabled.kernel ? undefined : '4 4'}
            />
            <Cpu x={KERNEL.x + 14} y={KERNEL.y + 14} size={22} className="text-emerald-400" />
            <text x={KERNEL.x + 46} y={KERNEL.y + 22} className="fill-slate-100 text-[13px] font-semibold">Linux kernel</text>
            <text x={KERNEL.x + 46} y={KERNEL.y + 38} className="fill-slate-500 font-mono text-[10px]">
              namespaces · cgroups · overlayfs · netfilter · seccomp
            </text>
          </g>

          {NODES.map((n) => {
            const Icon = n.icon;
            const on = !n.toggle || enabled[n.id];
            const hot = current?.nodes.includes(n.id);
            const isFail = failedOn === n.id;
            const isUp = n.id === 'container' && containerUp;
            return (
              <g key={n.id} onClick={() => setSelected(n.id)} className="cursor-pointer" opacity={on ? 1 : 0.4}>
                <rect
                  x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx={12}
                  className={cn(
                    isFail ? 'fill-rose-500/15 stroke-rose-400'
                      : isUp ? 'fill-emerald-400/15 stroke-emerald-300'
                      : hot ? 'fill-cyan-400/15 stroke-cyan-300'
                      : selected === n.id ? 'fill-ink-700 stroke-docker' : 'fill-ink-850 stroke-slate-600',
                  )}
                  strokeWidth={hot || isUp ? 2 : 1.3}
                  strokeDasharray={on ? undefined : '4 4'}
                  filter={hot || isUp ? 'url(#arch-glow)' : undefined}
                />
                <Icon
                  x={n.x + 13} y={n.y + 19} size={22}
                  className={isFail ? 'text-rose-400' : hot || isUp ? 'text-cyan-300' : 'text-slate-400'}
                />
                <text x={n.x + 46} y={n.y + 27} className="fill-slate-100 text-[13px] font-semibold">{n.label}</text>
                <text x={n.x + 46} y={n.y + 44} className="fill-slate-500 font-mono text-[9.5px]">{n.sub}</text>
              </g>
            );
          })}

          {status === 'running' && current && (
            <motion.circle
              key={`packet-${idx}`}
              r={7}
              className="fill-cyan-300"
              filter="url(#arch-glow)"
              initial={{ cx: current.path[0][0], cy: current.path[0][1] }}
              animate={{ cx: current.path.map((p) => p[0]), cy: current.path.map((p) => p[1]) }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}
            />
          )}
        </svg>
      </div>

      {status === 'error' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 font-mono text-[11.5px] leading-5 text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {ERRORS[failedOn]}
        </motion.div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Components</div>
          <Switch label="dockerd (daemon)" checked={enabled.dockerd} onChange={(v) => setEnabled((e) => ({ ...e, dockerd: v }))} />
          <Switch label="containerd" checked={enabled.containerd} onChange={(v) => setEnabled((e) => ({ ...e, containerd: v }))} />
          <Switch label="runc (OCI runtime)" checked={enabled.runc} onChange={(v) => setEnabled((e) => ({ ...e, runc: v }))} />
          <Switch label="Kernel namespaces / cgroups" checked={enabled.kernel} onChange={(v) => setEnabled((e) => ({ ...e, kernel: v }))} />
          <Switch label="Image already cached locally" hint="Skips the registry pull" checked={cached} onChange={setCached} disabled={status === 'running'} />
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lifecycle</div>
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const done = status === 'done' || (idx > i && status !== 'idle');
              const active = i === idx && (status === 'running' || status === 'error');
              return (
                <li
                  key={s.id}
                  className={cn(
                    'flex items-start gap-2 rounded-md px-2 py-1 text-xs',
                    active && status === 'running' && 'bg-cyan-400/10 text-cyan-100',
                    active && status === 'error' && 'bg-rose-500/10 text-rose-200',
                    !active && done && 'text-slate-300',
                    !active && !done && 'text-slate-500',
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : active && status === 'error' ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                  ) : (
                    <Circle className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', active && 'animate-pulse text-cyan-300')} />
                  )}
                  <span>{s.title}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm leading-6 text-slate-300">
        {current && status === 'running' ? (
          <>
            <span className="font-semibold text-cyan-300">{current.title}. </span>
            {current.detail}
          </>
        ) : (
          <>
            <span className="font-semibold text-white">{info.label}. </span>
            {info.desc}
          </>
        )}
      </div>
    </Panel>
  );
}
