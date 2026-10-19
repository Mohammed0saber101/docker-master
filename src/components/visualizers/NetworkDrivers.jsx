import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Network, GitBranch, Server, Ban, Globe2 } from 'lucide-react';
import Panel from '../ui/Panel';
import Segmented from '../ui/Segmented';
import { cn } from '../../lib/cn';

/**
 * Animated packet-flow scenes for the four core network drivers. Each scene is
 * pure data (boxes, links, packet path) rendered by <Scene/>.
 */
const SCENES = {
  bridge: {
    icon: GitBranch,
    label: 'bridge',
    cmd: 'docker network create app-net && docker run --network app-net nginx',
    summary: 'Containers get a private IP on a virtual switch (Linux bridge). Outbound traffic is NATed through the host’s interface; inbound traffic needs -p.',
    use: ['Default for standalone containers', 'User-defined bridges add DNS by container name', 'Single-host only'],
    boxes: [
      { x: 8, y: 8, w: 544, h: 244, label: 'Docker host', frame: true },
      { x: 30, y: 40, w: 140, h: 56, label: 'web', sub: 'eth0 172.18.0.2', tone: 'cyan' },
      { x: 30, y: 164, w: 140, h: 56, label: 'api', sub: 'eth0 172.18.0.3', tone: 'cyan' },
      { x: 220, y: 100, w: 130, h: 56, label: 'br-app-net', sub: 'bridge 172.18.0.1', tone: 'blue' },
      { x: 400, y: 100, w: 130, h: 56, label: 'eth0 (host)', sub: 'NAT · MASQUERADE', tone: 'slate' },
    ],
    links: [
      { from: [170, 68], to: [220, 118], label: 'veth' },
      { from: [170, 192], to: [220, 138], label: 'veth' },
      { from: [350, 128], to: [400, 128] },
      { from: [530, 128], to: [560, 128] },
    ],
    packet: [[100, 68], [285, 128], [465, 128], [556, 128]],
  },
  host: {
    icon: Server,
    label: 'host',
    cmd: 'docker run --network host nginx',
    summary: 'No network namespace: the container uses the host’s interfaces directly. No NAT, no bridge, best raw performance. -p is ignored.',
    use: ['Latency-sensitive or very high packet-rate workloads', 'Apps that need many dynamic ports', 'Port conflicts with host services are your problem'],
    boxes: [
      { x: 8, y: 8, w: 544, h: 244, label: 'Docker host', frame: true },
      { x: 30, y: 40, w: 230, h: 180, label: 'container (shares host netns)', frame: true, dashed: true },
      { x: 60, y: 100, w: 170, h: 56, label: 'nginx', sub: 'bind 0.0.0.0:80', tone: 'cyan' },
      { x: 330, y: 100, w: 190, h: 56, label: 'Host network stack', sub: 'eth0 192.168.1.10:80', tone: 'slate' },
    ],
    links: [
      { from: [230, 128], to: [330, 128], label: 'direct' },
      { from: [520, 128], to: [560, 128] },
    ],
    packet: [[556, 128], [425, 128], [145, 128]],
  },
  none: {
    icon: Ban,
    label: 'none',
    cmd: 'docker run --network none alpine',
    summary: 'Only a loopback interface. The container is completely cut off from other containers and the outside world.',
    use: ['Batch jobs that must not talk to anything', 'Processing untrusted input', 'Maximum network isolation'],
    boxes: [
      { x: 120, y: 30, w: 290, h: 200, label: 'container --network none', frame: true },
      { x: 180, y: 100, w: 170, h: 56, label: 'lo', sub: '127.0.0.1 only', tone: 'cyan' },
      { x: 440, y: 100, w: 110, h: 56, label: 'Network', sub: 'unreachable', tone: 'rose' },
    ],
    links: [{ from: [410, 128], to: [440, 128], blocked: true }],
    packet: [[180, 128], [265, 92], [350, 128], [265, 164], [180, 128]],
  },
  overlay: {
    icon: Globe2,
    label: 'overlay',
    cmd: 'docker network create -d overlay --attachable backend',
    summary: 'A virtual network spanning many hosts. Frames are wrapped in VXLAN (UDP 4789) and sent over the hosts’ real network, so containers on different machines share one subnet.',
    use: ['Swarm services across nodes', 'Optional encryption (--opt encrypted, IPsec)', 'Ports: 2377/tcp, 7946/tcp+udp, 4789/udp'],
    boxes: [
      { x: 8, y: 8, w: 262, h: 244, label: 'Host A', frame: true },
      { x: 290, y: 8, w: 262, h: 244, label: 'Host B', frame: true },
      { x: 40, y: 46, w: 150, h: 52, label: 'web.1', sub: '10.0.1.5', tone: 'cyan' },
      { x: 322, y: 46, w: 150, h: 52, label: 'api.1', sub: '10.0.1.6', tone: 'cyan' },
      { x: 40, y: 168, w: 150, h: 52, label: 'VTEP vxlan0', sub: '192.168.1.10', tone: 'blue' },
      { x: 322, y: 168, w: 150, h: 52, label: 'VTEP vxlan0', sub: '192.168.1.11', tone: 'blue' },
    ],
    links: [
      { from: [115, 98], to: [115, 168] },
      { from: [190, 194], to: [322, 194], label: 'VXLAN · UDP 4789', tunnel: true },
      { from: [397, 168], to: [397, 98] },
    ],
    packet: [[115, 72], [115, 194], [397, 194], [397, 72]],
  },
};

const BOX_TONE = {
  cyan: 'fill-cyan-400/10 stroke-cyan-400/60',
  blue: 'fill-docker/15 stroke-docker',
  slate: 'fill-slate-500/10 stroke-slate-500/60',
  rose: 'fill-rose-500/10 stroke-rose-400/60',
};

function Scene({ scene, id }) {
  const xs = scene.packet.map((p) => p[0]);
  const ys = scene.packet.map((p) => p[1]);
  return (
    <svg viewBox="0 0 560 260" className="h-auto w-full">
      <defs>
        <filter id="pkt-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {scene.boxes.filter((b) => b.frame).map((b) => (
        <g key={b.label + b.x}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} className="fill-white/[0.015] stroke-slate-700" strokeDasharray={b.dashed ? '6 5' : undefined} />
          <text x={b.x + 12} y={b.y + 20} className="fill-slate-500 text-[11px] font-semibold">{b.label}</text>
        </g>
      ))}
      {scene.links.map((l, i) => (
        <g key={i}>
          <line
            x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]}
            className={cn(l.blocked ? 'stroke-rose-400/70' : l.tunnel ? 'stroke-docker animate-dash' : 'stroke-slate-500')}
            strokeWidth={l.tunnel ? 3 : 1.6}
            strokeDasharray={l.tunnel || l.blocked ? '6 6' : undefined}
          />
          {l.label && (
            <text x={(l.from[0] + l.to[0]) / 2} y={(l.from[1] + l.to[1]) / 2 - 8} textAnchor="middle" className="fill-slate-400 font-mono text-[10px]">
              {l.label}
            </text>
          )}
          {l.blocked && (
            <text x={(l.from[0] + l.to[0]) / 2} y={(l.from[1] + l.to[1]) / 2 + 5} textAnchor="middle" className="fill-rose-400 text-[16px] font-bold">✕</text>
          )}
        </g>
      ))}
      {scene.boxes.filter((b) => !b.frame).map((b) => (
        <g key={b.label + b.x}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} className={BOX_TONE[b.tone]} strokeWidth={1.4} />
          <text x={b.x + b.w / 2} y={b.y + b.h / 2 - 3} textAnchor="middle" className="fill-slate-100 text-[13px] font-semibold">{b.label}</text>
          <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 13} textAnchor="middle" className="fill-slate-400 font-mono text-[10px]">{b.sub}</text>
        </g>
      ))}
      <motion.circle
        key={id}
        r={6}
        className="fill-cyan-300"
        filter="url(#pkt-glow)"
        initial={{ cx: xs[0], cy: ys[0] }}
        animate={{ cx: xs, cy: ys }}
        transition={{ duration: 0.8 * (xs.length - 1), ease: 'linear', repeat: Infinity, repeatDelay: 0.5 }}
      />
    </svg>
  );
}

export default function NetworkDrivers() {
  const [driver, setDriver] = useState('bridge');
  const scene = SCENES[driver];

  return (
    <Panel
      title="Network drivers: packet flow"
      icon={Network}
      actions={
        <Segmented
          layoutId="net-driver"
          value={driver}
          onChange={setDriver}
          options={Object.entries(SCENES).map(([value, s]) => ({ value, label: s.label, icon: s.icon }))}
        />
      }
    >
      <div className="grid-bg rounded-xl border border-white/5 bg-ink-950/50 p-2">
        <AnimatePresence mode="wait">
          <motion.div key={driver} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Scene scene={scene} id={driver} />
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{scene.summary}</p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-3">
        {scene.use.map((u) => (
          <li key={u} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">{u}</li>
        ))}
      </ul>
      <div className="mt-3 overflow-x-auto whitespace-nowrap rounded-lg bg-ink-950/60 p-2.5 font-mono text-[11px] text-cyan-200">$ {scene.cmd}</div>
    </Panel>
  );
}
