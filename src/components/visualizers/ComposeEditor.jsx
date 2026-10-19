import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Workflow, Play, Square, AlertTriangle, XCircle, Heart, Globe, Database, FolderOpen, KeyRound } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import { parseCompose } from '../../lib/compose';
import { cn } from '../../lib/cn';

/**
 * Live docker-compose.yml editor. Every keystroke re-parses the YAML and
 * re-renders the topology: services laid out by dependency depth, depends_on
 * edges (labelled with their condition), published ports, networks, volumes and
 * healthchecks. "docker compose up" replays the startup order.
 */
const PRESETS = {
  'Full stack': `services:
  proxy:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    networks: [frontend]

  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/app
      REDIS_URL: redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    networks: [frontend, backend]

  cache:
    image: redis:7-alpine
    networks: [backend]

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      retries: 5
    networks: [backend]

networks:
  frontend:
  backend:

volumes:
  pgdata:
`,
  'With workers': `services:
  proxy:
    image: nginx:1.27-alpine
    ports: ["80:80"]
    depends_on: [api]
    networks: [frontend]

  api:
    build: ./api
    depends_on:
      db: { condition: service_healthy }
      queue: { condition: service_healthy }
    networks: [frontend, backend]

  worker:
    build: ./api
    command: npm run worker
    deploy:
      replicas: 3
    depends_on:
      queue: { condition: service_healthy }
      db: { condition: service_healthy }
    networks: [backend]

  queue:
    image: rabbitmq:3.13-alpine
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
    networks: [backend]

  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
    networks: [backend]

networks:
  frontend:
  backend:

volumes:
  pgdata:
`,
  'Spot the bugs': `services:
  web:
    image: node:20-alpine
    ports: ["3000:3000"]
    depends_on:
      db:
        condition: service_healthy
    networks: [frontend]

  db:
    image: mysql:8
    ports: ["3306:3306"]
    volumes:
      - dbdata:/var/lib/mysql
    networks: [backend]

networks:
  frontend:
  backend:
`,
};

const NET_COLORS = ['#22d3ee', '#a78bfa', '#f59e0b', '#34d399', '#f472b6', '#60a5fa'];
const NW = 168;
const NH = 96;
const COLW = 214;
const ROWH = 116;
const LEFT = 116;
const PAD = 16;

const CONDITION = {
  service_healthy: { label: 'healthy', color: '#34d399' },
  service_started: { label: 'started', color: '#64748b' },
  service_completed_successfully: { label: 'completed', color: '#a78bfa' },
};

const STATUS = {
  creating: { ring: 'border-amber-400/70', dot: 'bg-amber-400 animate-pulse', label: 'starting' },
  running: { ring: 'border-cyan-400/70', dot: 'bg-cyan-400', label: 'running' },
  healthy: { ring: 'border-emerald-400/70', dot: 'bg-emerald-400', label: 'healthy' },
};

function useLayout(model) {
  return useMemo(() => {
    if (!model?.services) return null;
    const maxLevel = Math.max(0, ...model.services.map((s) => s.level));
    const cols = {};
    model.services.forEach((s) => {
      const c = maxLevel - s.level;
      if (!cols[c]) cols[c] = [];
      cols[c].push(s.name);
    });
    const maxRows = Math.max(1, ...Object.values(cols).map((c) => c.length));
    const pos = {};
    Object.entries(cols).forEach(([c, names]) => {
      const offset = ((maxRows - names.length) * ROWH) / 2;
      names.forEach((n, r) => {
        pos[n] = { x: LEFT + Number(c) * COLW, y: PAD + offset + r * ROWH };
      });
    });
    const width = LEFT + maxLevel * COLW + NW + PAD;
    const height = Math.max(220, PAD * 2 + maxRows * ROWH - (ROWH - NH));
    return { pos, width, height };
  }, [model]);
}

export default function ComposeEditor() {
  const [text, setText] = useState(PRESETS['Full stack']);
  const deferred = useDeferredValue(text);
  const parsed = useMemo(() => parseCompose(deferred), [deferred]);
  const [model, setModel] = useState(() => parseCompose(PRESETS['Full stack']));
  const [evIdx, setEvIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (!parsed.error) setModel(parsed);
    setPlaying(false);
    setEvIdx(0);
  }, [parsed]);

  const layout = useLayout(model);
  const byName = useMemo(() => Object.fromEntries((model.services || []).map((s) => [s.name, s])), [model]);
  const netColor = (n) => NET_COLORS[(model.networks || []).indexOf(n) % NET_COLORS.length];

  const events = useMemo(() => {
    if (!model.services) return [];
    const ev = [];
    model.networks.forEach((n) => ev.push({ text: `✔ Network app_${n}  Created` }));
    model.volumes.forEach((v) => ev.push({ text: `✔ Volume "app_${v}"  Created` }));
    model.order.forEach((name) => {
      const s = byName[name];
      const waits = s.deps.filter((d) => d.condition === 'service_healthy' && byName[d.name]);
      if (waits.length) ev.push({ text: `⠿ Container app-${name}-1  Waiting for ${waits.map((w) => w.name).join(', ')}` });
      const n = s.replicas || 1;
      ev.push({ svc: name, status: 'creating', text: `⠿ Container app-${name}-1${n > 1 ? `..${n}` : ''}  Starting` });
      ev.push({ svc: name, status: 'running', text: `✔ Container app-${name}-1${n > 1 ? `..${n}` : ''}  Started`, tone: 'ok' });
      if (s.health) ev.push({ svc: name, status: 'healthy', text: `✔ Container app-${name}-1  Healthy`, tone: 'ok' });
    });
    return ev;
  }, [model, byName]);

  useEffect(() => {
    if (!playing) return undefined;
    if (evIdx >= events.length) {
      setPlaying(false);
      return undefined;
    }
    const t = setTimeout(() => setEvIdx((i) => i + 1), 420);
    return () => clearTimeout(t);
  }, [playing, evIdx, events.length]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [evIdx]);

  const statuses = {};
  events.slice(0, evIdx).forEach((e) => { if (e.svc) statuses[e.svc] = e.status; });

  const onKeyDown = (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el = e.target;
    const { selectionStart: s, selectionEnd: end } = el;
    setText(text.slice(0, s) + '  ' + text.slice(end));
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; });
  };

  const lineCount = text.split('\n').length;
  const anyPorts = model.services?.some((s) => s.ports.length);

  return (
    <Panel
      title="Live compose.yaml → topology"
      icon={Workflow}
      actions={
        <>
          {Object.keys(PRESETS).map((p) => (
            <Button key={p} variant="ghost" onClick={() => setText(PRESETS[p])}>{p}</Button>
          ))}
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Editor */}
        <div className="min-w-0">
          <div className="max-h-[620px] overflow-auto rounded-xl border border-white/10 bg-[#060a14]">
            <div className="flex min-w-max">
              <div className="select-none border-r border-white/5 py-3 pl-3 pr-2 text-right font-mono text-[12.5px] leading-5 text-slate-600">
                {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                spellCheck={false}
                wrap="off"
                aria-label="compose.yaml editor"
                style={{ height: lineCount * 20 + 26 }}
                className="w-[440px] resize-none overflow-hidden bg-transparent px-3 py-3 font-mono text-[12.5px] leading-5 text-slate-200 caret-cyan-400 outline-none"
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Edit freely: rename services, add <code className="inline-code">depends_on</code>, move a service to another network, delete a healthcheck.
          </p>
        </div>

        {/* Topology */}
        <div className="min-w-0 space-y-3">
          <AnimatePresence>
            {parsed.error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2 rounded-lg border border-rose-400/40 bg-rose-500/10 p-2.5 font-mono text-[11px] text-rose-200">
                <XCircle className="h-4 w-4 shrink-0" /> {parsed.error} <span className="text-rose-300/60">(showing last valid file)</span>
              </motion.div>
            )}
          </AnimatePresence>

          {layout && (
            <div className="grid-bg overflow-x-auto rounded-xl border border-white/5 bg-ink-950/50">
              {/* Scales down to fit the panel; never below 560px wide (scrolls on phones instead). */}
              <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                className="mx-auto block h-auto w-full"
                style={{ maxWidth: layout.width, minWidth: Math.min(layout.width, 560) }}
              >
                <defs>
                  <marker id="cmp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="#64748b" />
                  </marker>
                </defs>

                {anyPorts && (
                  <g>
                    <rect x={8} y={layout.height / 2 - 30} width={72} height={60} rx={12} className="fill-ink-800 stroke-slate-600" />
                    <Globe x={33} y={layout.height / 2 - 22} size={22} className="text-sky-300" />
                    <text x={44} y={layout.height / 2 + 18} textAnchor="middle" className="fill-slate-300 text-[11px] font-semibold">Host</text>
                  </g>
                )}

                {model.services.filter((s) => s.ports.length).map((s) => {
                  const p = layout.pos[s.name];
                  const y1 = layout.height / 2;
                  const y2 = p.y + NH / 2;
                  return (
                    <g key={`port-${s.name}`}>
                      <path d={`M80,${y1} C${(80 + p.x) / 2},${y1} ${(80 + p.x) / 2},${y2} ${p.x},${y2}`} fill="none" className="stroke-sky-400/70 animate-dash" strokeWidth={1.8} strokeDasharray="6 5" markerEnd="url(#cmp-arrow)" />
                      <text x={p.x - 8} y={y2 - 8} textAnchor="end" className="fill-sky-300 font-mono text-[10px]">:{s.ports.join(', :')}</text>
                    </g>
                  );
                })}

                {model.services.flatMap((s) =>
                  s.deps.filter((d) => byName[d.name]).map((d) => {
                    const a = layout.pos[s.name];
                    const b = layout.pos[d.name];
                    const x1 = a.x + NW;
                    const y1 = a.y + NH / 2;
                    const x2 = b.x;
                    const y2 = b.y + NH / 2;
                    const mx = (x1 + x2) / 2;
                    const cond = CONDITION[d.condition] || CONDITION.service_started;
                    return (
                      <g key={`${s.name}-${d.name}`}>
                        <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 2},${y2}`} fill="none" stroke={cond.color} strokeWidth={1.8} markerEnd="url(#cmp-arrow)" />
                        <text x={mx} y={(y1 + y2) / 2 - 6} textAnchor="middle" fill={cond.color} className="font-mono text-[10px]">{cond.label}</text>
                      </g>
                    );
                  }),
                )}

                {model.services.map((s) => {
                  const p = layout.pos[s.name];
                  const st = STATUS[statuses[s.name]];
                  const named = s.volumes.filter((v) => v.kind === 'volume').length;
                  const binds = s.volumes.filter((v) => v.kind === 'bind').length;
                  return (
                    <foreignObject key={s.name} x={p.x} y={p.y} width={NW} height={NH}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn('flex h-full flex-col rounded-xl border-2 bg-ink-800 p-2 text-[11px]', st ? st.ring : 'border-white/10')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', st ? st.dot : 'bg-slate-600')} />
                          <span className="truncate text-[13px] font-semibold text-white">{s.name}</span>
                          {s.replicas > 1 && <span className="rounded bg-white/10 px-1 font-mono text-[9px] text-slate-300">×{s.replicas}</span>}
                          {s.health && <Heart className={cn('ml-auto h-3.5 w-3.5 shrink-0', statuses[s.name] === 'healthy' ? 'fill-emerald-400 text-emerald-400' : 'text-rose-300')} />}
                        </div>
                        <div className="truncate font-mono text-[10px] text-slate-500">{s.image}</div>
                        <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                          {s.networks.map((n) => (
                            <span key={n} className="flex items-center gap-1" title={`network: ${n}`}>
                              <span className="h-2 w-2 rounded-full" style={{ background: netColor(n) }} />
                              {n}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 flex gap-2 text-[10px] text-slate-500">
                          {s.env.length > 0 && <span className="flex items-center gap-0.5" title={s.env.join(', ')}><KeyRound className="h-3 w-3" />{s.env.length}</span>}
                          {named > 0 && <span className="flex items-center gap-0.5" title="named volumes"><Database className="h-3 w-3" />{named}</span>}
                          {binds > 0 && <span className="flex items-center gap-0.5" title="bind mounts"><FolderOpen className="h-3 w-3" />{binds}</span>}
                          {st && <span className="ml-auto text-slate-400">{st.label}</span>}
                        </div>
                      </motion.div>
                    </foreignObject>
                  );
                })}
              </svg>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
            {(model.networks || []).map((n) => (
              <span key={n} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: netColor(n) }} /> net: {n}</span>
            ))}
            <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-emerald-400" /> depends_on (healthy)</span>
            <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-slate-500" /> depends_on (started)</span>
          </div>

          {model.warnings?.length > 0 && (
            <div className="space-y-1 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
              {model.warnings.map((w) => (
                <div key={w} className="flex gap-2 text-xs text-amber-100">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> {w}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-[#060a14]">
            <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
              <span className="font-mono text-[11px] text-slate-400">$ docker compose up -d</span>
              <div className="flex gap-2">
                <Button icon={Play} onClick={() => { setEvIdx(0); setPlaying(true); }} disabled={playing || !events.length}>Up</Button>
                <Button variant="ghost" icon={Square} onClick={() => { setPlaying(false); setEvIdx(0); }}>Down</Button>
              </div>
            </div>
            <div ref={logRef} className="h-36 overflow-y-auto p-3 font-mono text-[11px] leading-5">
              {evIdx === 0 && <div className="text-slate-600">Press Up to start the stack in dependency order.</div>}
              {events.slice(0, evIdx).map((e, i) => (
                <div key={i} className={e.tone === 'ok' ? 'text-emerald-400' : 'text-slate-300'}>{e.text}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
