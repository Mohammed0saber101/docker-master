import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Box, Hand, Radio, RotateCcw, Unplug } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Segmented from '../ui/Segmented';
import { cn } from '../../lib/cn';

/**
 * NetworkSandbox
 *
 * Drag containers between the "detached" strip, the default bridge and a
 * user-defined bridge. Then ping between them by name or IP and watch the
 * packet: DNS lookup to 127.0.0.11, routing through the bridge, or isolation.
 *
 * Network membership is derived from which zone a container's centre lies in.
 */
const NODE_W = 112;
const NODE_H = 60;
const TOP = 92;
const CANVAS_H = 430;

const CONTAINERS = [
  { id: 'web', image: 'nginx:1.27', ring: 'border-cyan-400/60', dot: 'bg-cyan-400' },
  { id: 'api', image: 'node:20', ring: 'border-violet-400/60', dot: 'bg-violet-400' },
  { id: 'db', image: 'postgres:16', ring: 'border-amber-400/60', dot: 'bg-amber-400' },
];

function makeZones(w) {
  const half = (w - 24) / 2;
  const h = CANVAS_H - TOP - 8;
  const compact = w < 560; // phones: shorter labels so the two hubs don't collide
  return {
    none: { x: 8, y: 8, w: w - 16, h: TOP - 16, label: 'Detached · --network none' },
    bridge: { x: 8, y: TOP, w: half, h, label: compact ? 'default bridge' : 'default bridge (docker0)', subnet: '172.17.0', dns: false, hubLabel: 'docker0 · no DNS' },
    appnet: { x: 16 + half, y: TOP, w: half, h, label: compact ? 'app-net' : 'user-defined bridge (app-net)', subnet: '172.18.0', dns: true, hubLabel: compact ? 'DNS 127.0.0.11' : 'br-app-net · DNS 127.0.0.11' },
  };
}

const hubOf = (z) => ({ x: z.x + z.w / 2, y: z.y + 40 });
const inside = (p, z) => p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;

function initialPositions(z) {
  return {
    web: { x: z.appnet.x + 14, y: z.appnet.y + 100 },
    api: { x: z.appnet.x + z.appnet.w - NODE_W - 14, y: z.appnet.y + 220 },
    db: { x: z.bridge.x + z.bridge.w / 2 - NODE_W / 2, y: z.bridge.y + 170 },
  };
}

function DraggableNode({ def, pos, canvasRef, onMove, ip, net }) {
  const x = useMotionValue(pos.x);
  const y = useMotionValue(pos.y);

  // Sync when the parent repositions us (e.g. reset).
  useEffect(() => {
    if (Math.abs(x.get() - pos.x) > 0.5) x.set(pos.x);
    if (Math.abs(y.get() - pos.y) > 0.5) y.set(pos.y);
  }, [pos.x, pos.y, x, y]);

  const report = () => onMove(def.id, { x: x.get(), y: y.get() });

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={canvasRef}
      onDrag={report}
      onDragEnd={report}
      whileDrag={{ scale: 1.06, zIndex: 30 }}
      style={{ x, y, width: NODE_W, height: NODE_H }}
      className={cn(
        'absolute left-0 top-0 z-10 cursor-grab touch-none select-none rounded-xl border-2 bg-ink-800/95 px-2.5 py-1.5 shadow-lg active:cursor-grabbing',
        def.ring,
      )}
    >
      <div className="flex items-center gap-1.5">
        <Box className="h-3.5 w-3.5 text-slate-300" />
        <span className="text-sm font-semibold text-white">{def.id}</span>
        <span className={cn('ml-auto h-2 w-2 rounded-full', net === 'none' ? 'bg-slate-600' : def.dot)} />
      </div>
      <div className="font-mono text-[10px] text-slate-500">{def.image}</div>
      <div className={cn('font-mono text-[10px]', ip ? 'text-cyan-300' : 'text-slate-600')}>{ip || 'no interface'}</div>
    </motion.div>
  );
}

export default function NetworkSandbox() {
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [pos, setPos] = useState(null);
  const [src, setSrc] = useState('web');
  const [dst, setDst] = useState('db');
  const [mode, setMode] = useState('name');
  const [packet, setPacket] = useState(null);
  const [log, setLog] = useState([{ id: 0, text: 'Drag containers between networks, then send a ping.', tone: 'dim' }]);
  const logId = useRef(1);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zones = useMemo(() => (width ? makeZones(width) : null), [width]);

  useEffect(() => {
    if (zones && !pos) setPos(initialPositions(zones));
  }, [zones, pos]);

  const center = (id) => ({ x: pos[id].x + NODE_W / 2, y: pos[id].y + NODE_H / 2 });
  const netOf = (id) => {
    if (!zones || !pos) return 'none';
    const c = center(id);
    if (inside(c, zones.appnet)) return 'appnet';
    if (inside(c, zones.bridge)) return 'bridge';
    return 'none';
  };
  const ipOf = (id) => {
    const net = netOf(id);
    if (net === 'none') return null;
    const members = CONTAINERS.filter((c) => netOf(c.id) === net).map((c) => c.id);
    return `${zones[net].subnet}.${members.indexOf(id) + 2}`;
  };

  const addLog = (lines) =>
    setLog((l) => [...l, ...lines.map((x) => ({ id: logId.current++, ...x }))].slice(-14));

  const ping = () => {
    if (!pos || src === dst || packet) return;
    const sNet = netOf(src);
    const dNet = netOf(dst);
    const s = center(src);
    const d = center(dst);
    const dIp = ipOf(dst);
    const target = mode === 'name' ? dst : dIp || dst;
    const head = { text: `$ docker exec ${src} ping -c 2 ${target}`, tone: 'cmd' };
    const success = (ip) => [
      { text: `PING ${target} (${ip}): 56 data bytes`, tone: 'out' },
      { text: `64 bytes from ${ip}: seq=0 ttl=64 time=0.094 ms`, tone: 'ok' },
      { text: `64 bytes from ${ip}: seq=1 ttl=64 time=0.071 ms`, tone: 'ok' },
      { text: '2 packets transmitted, 2 received, 0% packet loss', tone: 'ok' },
    ];

    if (sNet === 'none') {
      addLog([head, { text: 'ping: sendto: Network unreachable', tone: 'err' }, { text: `# ${src} only has a loopback interface.`, tone: 'dim' }]);
      return;
    }
    const hub = hubOf(zones[sNet]);
    const route = (points, lines) => setPacket({ key: Date.now(), points, lines: [head, ...lines] });

    if (mode === 'name') {
      if (sNet === 'bridge') {
        route([s, hub, s], [
          { text: `ping: bad address '${dst}'`, tone: 'err' },
          { text: '# The default bridge has no embedded DNS for container names.', tone: 'dim' },
        ]);
        return;
      }
      if (dNet === 'appnet') {
        route([s, hub, s, hub, d, hub, s], [
          { text: `[dns] 127.0.0.11: ${dst} → ${dIp}`, tone: 'info' },
          ...success(dIp),
        ]);
      } else {
        route([s, hub, s], [
          { text: `[dns] 127.0.0.11: ${dst} → NXDOMAIN`, tone: 'info' },
          { text: `ping: bad address '${dst}'`, tone: 'err' },
          { text: '# Embedded DNS only resolves containers attached to the same network.', tone: 'dim' },
        ]);
      }
      return;
    }

    // Ping by IP
    if (!dIp) {
      route([s, hub], [
        { text: `ping: ${dst} has no IP address (attached to "none")`, tone: 'err' },
      ]);
      return;
    }
    if (sNet === dNet) {
      route([s, hub, d, hub, s], success(dIp));
    } else {
      route([s, hub], [
        { text: `PING ${dIp} (${dIp}): 56 data bytes`, tone: 'out' },
        { text: '2 packets transmitted, 0 received, 100% packet loss', tone: 'err' },
        { text: '# Different bridges are isolated by the DOCKER-ISOLATION iptables chains.', tone: 'dim' },
      ]);
    }
  };

  const reset = () => {
    if (zones) setPos(initialPositions(zones));
    setPacket(null);
  };

  const nets = pos ? Object.fromEntries(CONTAINERS.map((c) => [c.id, netOf(c.id)])) : {};

  return (
    <Panel
      title="Network sandbox"
      icon={Radio}
      actions={<Button variant="ghost" icon={RotateCcw} onClick={reset}>Reset</Button>}
    >
      <div
        ref={canvasRef}
        className="grid-bg relative w-full overflow-hidden rounded-xl border border-white/10 bg-ink-950/60"
        style={{ height: CANVAS_H }}
      >
        {zones && (
          <>
            <div
              className="absolute flex items-center justify-center rounded-lg border border-dashed border-slate-700 text-[11px] text-slate-500"
              style={{ left: zones.none.x, top: zones.none.y, width: zones.none.w, height: zones.none.h }}
            >
              <Unplug className="mr-1.5 h-3.5 w-3.5" /> {zones.none.label}
            </div>
            {['bridge', 'appnet'].map((k) => {
              const z = zones[k];
              const hub = hubOf(z);
              return (
                <div key={k}>
                  <div
                    className={cn(
                      'absolute rounded-xl border',
                      k === 'appnet' ? 'border-cyan-400/25 bg-cyan-400/[0.03]' : 'border-slate-600/40 bg-slate-500/[0.03]',
                    )}
                    style={{ left: z.x, top: z.y, width: z.w, height: z.h }}
                  >
                    <div className={cn('px-3 pt-2 text-[11px] font-semibold', k === 'appnet' ? 'text-cyan-300' : 'text-slate-400')}>{z.label}</div>
                  </div>
                  <div
                    className={cn(
                      'absolute z-[5] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px]',
                      k === 'appnet' ? 'border-cyan-400/50 bg-ink-900 text-cyan-200' : 'border-slate-500/50 bg-ink-900 text-slate-300',
                    )}
                    style={{ left: hub.x, top: hub.y }}
                  >
                    {z.hubLabel}
                  </div>
                </div>
              );
            })}

            {pos && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {CONTAINERS.filter((c) => nets[c.id] !== 'none').map((c) => {
                  const ce = center(c.id);
                  const hub = hubOf(zones[nets[c.id]]);
                  return (
                    <line
                      key={c.id}
                      x1={ce.x} y1={ce.y} x2={hub.x} y2={hub.y}
                      className={cn('animate-dash', nets[c.id] === 'appnet' ? 'stroke-cyan-400/60' : 'stroke-slate-500/70')}
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                    />
                  );
                })}
              </svg>
            )}

            {pos &&
              CONTAINERS.map((c) => (
                <DraggableNode
                  key={c.id}
                  def={c}
                  pos={pos[c.id]}
                  canvasRef={canvasRef}
                  net={nets[c.id]}
                  ip={ipOf(c.id)}
                  onMove={(id, p) => setPos((prev) => ({ ...prev, [id]: p }))}
                />
              ))}

            {packet && (
              <motion.div
                key={packet.key}
                className="pointer-events-none absolute left-0 top-0 z-40 h-3.5 w-3.5 rounded-full bg-cyan-300 shadow-[0_0_14px_4px_rgba(103,232,249,0.7)]"
                initial={{ x: packet.points[0].x - 7, y: packet.points[0].y - 7 }}
                animate={{ x: packet.points.map((p) => p.x - 7), y: packet.points.map((p) => p.y - 7) }}
                transition={{ duration: 0.45 * (packet.points.length - 1), ease: 'easeInOut' }}
                onAnimationComplete={() => {
                  addLog(packet.lines);
                  setPacket(null);
                }}
              />
            )}
          </>
        )}
        <div className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-1 text-[10px] text-slate-600">
          <Hand className="h-3 w-3" /> drag containers
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-slate-500">docker exec</span>
        <select value={src} onChange={(e) => setSrc(e.target.value)} className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 font-mono text-slate-200">
          {CONTAINERS.map((c) => <option key={c.id}>{c.id}</option>)}
        </select>
        <span className="font-mono text-slate-500">ping</span>
        <select value={dst} onChange={(e) => setDst(e.target.value)} className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 font-mono text-slate-200">
          {CONTAINERS.map((c) => <option key={c.id}>{c.id}</option>)}
        </select>
        <Segmented
          layoutId="ping-mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'name', label: 'by name' },
            { value: 'ip', label: 'by IP' },
          ]}
        />
        <Button icon={Radio} onClick={ping} disabled={!pos || src === dst || Boolean(packet)}>Ping</Button>
      </div>

      <div ref={logRef} className="mt-3 h-40 overflow-y-auto rounded-lg border border-white/5 bg-[#060a14] p-3 font-mono text-[11px] leading-5">
        {log.map((l) => (
          <div
            key={l.id}
            className={cn(
              l.tone === 'cmd' && 'mt-1 text-slate-100',
              l.tone === 'ok' && 'text-emerald-400',
              l.tone === 'err' && 'text-rose-400',
              l.tone === 'info' && 'text-cyan-300',
              l.tone === 'dim' && 'text-slate-500',
              l.tone === 'out' && 'text-slate-300',
            )}
          >
            {l.text}
          </div>
        ))}
      </div>
    </Panel>
  );
}
