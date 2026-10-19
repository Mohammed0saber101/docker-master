import { useEffect, useReducer } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ship, Server, Power, RefreshCw, Globe, Minus, Plus, Crown } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Segmented from '../ui/Segmented';
import { cn } from '../../lib/cn';

/**
 * Swarm orchestrator simulation.
 *
 * A reconciliation loop runs every tick and takes ONE step toward the desired
 * state, just like the real orchestrator: replace tasks lost on dead nodes,
 * promote starting → running, scale up/down, then roll stale versions forward
 * `parallelism` tasks at a time. Requests hit any node and are routed by the
 * ingress mesh (IPVS) to a running task, wherever it lives.
 */
const INITIAL = {
  nodes: [
    { id: 'w1', name: 'worker-1', up: true },
    { id: 'w2', name: 'worker-2', up: true },
    { id: 'w3', name: 'worker-3', up: true },
  ],
  tasks: [],
  desired: 4,
  target: 'v1',
  parallelism: 1,
  nextId: 1,
  rr: 0,
  hit: null,
  log: ['docker service create --name web --replicas 4 -p 8080:80 web:v1'],
};

const pushLog = (log, msg) => [msg, ...log].slice(0, 7);

function tick(prev) {
  // Clear the routing-mesh highlight after a moment.
  const state = prev.hit && Date.now() - prev.hit.at > 1500 ? { ...prev, hit: null } : prev;
  const upIds = new Set(state.nodes.filter((n) => n.up).map((n) => n.id));
  let { tasks } = state;

  // 1. Remove tasks already marked failed / shut down.
  if (tasks.some((t) => t.status === 'failed' || t.status === 'shutdown')) {
    return { ...state, tasks: tasks.filter((t) => t.status !== 'failed' && t.status !== 'shutdown') };
  }

  // 2. Tasks on dead nodes fail.
  const lost = tasks.filter((t) => !upIds.has(t.node));
  if (lost.length) {
    tasks = tasks.map((t) => (upIds.has(t.node) ? t : { ...t, status: 'failed' }));
    return { ...state, tasks, log: pushLog(state.log, `node down: ${lost.length} task(s) failed → actual < desired`) };
  }

  // 3. Starting → running; updating → starting (new version).
  if (tasks.some((t) => t.status === 'starting' || t.status === 'updating')) {
    tasks = tasks.map((t) => {
      if (t.status === 'starting') return { ...t, status: 'running' };
      if (t.status === 'updating') return { ...t, status: 'starting', version: state.target };
      return t;
    });
    return { ...state, tasks };
  }

  const running = tasks.filter((t) => t.status === 'running');

  // 4. Scale up: place on the least-loaded healthy node (spread strategy).
  if (running.length < state.desired && upIds.size) {
    const load = Object.fromEntries([...upIds].map((id) => [id, 0]));
    tasks.forEach((t) => { if (load[t.node] !== undefined) load[t.node] += 1; });
    const node = [...upIds].sort((a, b) => load[a] - load[b])[0];
    const nodeName = state.nodes.find((n) => n.id === node).name;
    return {
      ...state,
      tasks: [...tasks, { id: state.nextId, node, version: state.target, status: 'starting' }],
      nextId: state.nextId + 1,
      log: pushLog(state.log, `scheduler: web.${state.nextId} → ${nodeName}`),
    };
  }

  // 5. Scale down.
  if (running.length > state.desired) {
    const victim = running[running.length - 1];
    return {
      ...state,
      tasks: tasks.map((t) => (t.id === victim.id ? { ...t, status: 'shutdown' } : t)),
      log: pushLog(state.log, `scale down: web.${victim.id} shut down`),
    };
  }

  // 6. Rolling update.
  const stale = running.filter((t) => t.version !== state.target);
  if (stale.length) {
    const batch = new Set(stale.slice(0, state.parallelism).map((t) => t.id));
    return {
      ...state,
      tasks: tasks.map((t) => (batch.has(t.id) ? { ...t, status: 'updating' } : t)),
      log: pushLog(state.log, `rolling update: ${[...batch].map((id) => `web.${id}`).join(', ')} → ${state.target}`),
    };
  }

  return state; // converged: same reference, so React skips the render
}

function reducer(state, action) {
  switch (action.type) {
    case 'tick':
      return tick(state);
    case 'scale':
      return { ...state, desired: Math.max(0, Math.min(12, action.value)), log: pushLog(state.log, `docker service scale web=${Math.max(0, Math.min(12, action.value))}`) };
    case 'toggleNode': {
      const node = state.nodes.find((n) => n.id === action.id);
      return {
        ...state,
        nodes: state.nodes.map((n) => (n.id === action.id ? { ...n, up: !n.up } : n)),
        log: pushLog(state.log, `${node.name} ${node.up ? 'went DOWN' : 'is back (Ready)'}`),
      };
    }
    case 'update': {
      const target = state.target === 'v1' ? 'v2' : 'v1';
      return {
        ...state,
        target,
        log: pushLog(state.log, `docker service update --image web:${target} --update-parallelism ${state.parallelism} web`),
      };
    }
    case 'parallelism':
      return { ...state, parallelism: action.value };
    case 'request': {
      const entry = state.nodes.find((n) => n.id === action.node);
      const running = state.tasks.filter((t) => t.status === 'running');
      if (!entry.up) return { ...state, log: pushLog(state.log, `curl ${entry.name}:8080 → connection refused (node down)`) };
      if (!running.length) return { ...state, log: pushLog(state.log, `curl ${entry.name}:8080 → no running tasks`) };
      const task = running[state.rr % running.length];
      const target = state.nodes.find((n) => n.id === task.node);
      return {
        ...state,
        rr: state.rr + 1,
        hit: { entry: entry.id, task: task.id, at: Date.now() },
        log: pushLog(state.log, `curl ${entry.name}:8080 → ingress IPVS → web.${task.id} on ${target.name} (${task.version})`),
      };
    }
    default:
      return state;
  }
}

const TASK_STYLE = {
  starting: 'border-amber-400/60 bg-amber-400/10 text-amber-100 animate-pulse',
  running: '',
  updating: 'border-violet-400/60 bg-violet-400/10 text-violet-100 animate-pulse',
  failed: 'border-rose-400/60 bg-rose-500/15 text-rose-200 line-through',
  shutdown: 'border-slate-500/40 bg-slate-500/10 text-slate-400 line-through',
};

const VERSION_STYLE = {
  v1: 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100',
  v2: 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100',
};

export default function SwarmScheduler() {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'tick' }), 650);
    return () => clearInterval(t);
  }, []);

  const running = state.tasks.filter((t) => t.status === 'running').length;
  const converged = running === state.desired && state.tasks.every((t) => t.status === 'running' && t.version === state.target);
  const hitFresh = Boolean(state.hit);

  return (
    <Panel title="Services, tasks and the reconciliation loop" icon={Ship}>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100">
        <Crown className="h-4 w-4 text-amber-300" />
        <span className="font-semibold">Manager (leader)</span>
        <span className="text-amber-100/70">orchestrator · scheduler · dispatcher · Raft store</span>
        <span className="ml-auto font-mono">
          desired <span className="text-white">{state.desired}</span> · running{' '}
          <span className={running === state.desired ? 'text-emerald-300' : 'text-rose-300'}>{running}</span> · image{' '}
          <span className="text-white">web:{state.target}</span>
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {state.nodes.map((node) => {
          const tasks = state.tasks.filter((t) => t.node === node.id);
          const isEntry = hitFresh && state.hit.entry === node.id;
          return (
            <motion.div
              key={node.id}
              animate={isEntry ? { boxShadow: ['0 0 0 0 rgba(56,189,248,0.0)', '0 0 0 3px rgba(56,189,248,0.6)', '0 0 0 0 rgba(56,189,248,0.0)'] } : {}}
              transition={{ duration: 1 }}
              className={cn(
                'rounded-xl border p-3 transition-colors',
                node.up ? 'border-white/10 bg-ink-950/50' : 'border-rose-400/30 bg-rose-500/5 opacity-70',
              )}
            >
              <div className="flex items-center gap-2">
                <Server className={cn('h-4 w-4', node.up ? 'text-slate-300' : 'text-rose-400')} />
                <span className="text-sm font-semibold text-white">{node.name}</span>
                <span className={cn('ml-auto rounded px-1.5 text-[10px] font-semibold', node.up ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300')}>
                  {node.up ? 'Ready' : 'Down'}
                </span>
              </div>
              <div className="mt-3 flex min-h-[64px] flex-wrap content-start gap-1.5">
                <AnimatePresence>
                  {tasks.map((t) => {
                    const isHit = hitFresh && state.hit.task === t.id;
                    return (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: isHit ? [1, 1.18, 1] : 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        className={cn(
                          'rounded-lg border px-2 py-1 font-mono text-[10.5px]',
                          t.status === 'running' ? VERSION_STYLE[t.version] : TASK_STYLE[t.status],
                          isHit && 'ring-2 ring-sky-300',
                        )}
                      >
                        web.{t.id} <span className="opacity-70">{t.version}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant={node.up ? 'danger' : 'success'} icon={Power} onClick={() => dispatch({ type: 'toggleNode', id: node.id })} className="flex-1">
                  {node.up ? 'Kill' : 'Revive'}
                </Button>
                <Button variant="ghost" icon={Globe} onClick={() => dispatch({ type: 'request', node: node.id })} className="flex-1">
                  :8080
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
          <Button variant="ghost" icon={Minus} onClick={() => dispatch({ type: 'scale', value: state.desired - 1 })} />
          <span className="w-20 text-center font-mono text-xs text-slate-300">replicas {state.desired}</span>
          <Button variant="ghost" icon={Plus} onClick={() => dispatch({ type: 'scale', value: state.desired + 1 })} />
        </div>
        <Button icon={RefreshCw} onClick={() => dispatch({ type: 'update' })}>
          Rolling update → {state.target === 'v1' ? 'v2' : 'v1'}
        </Button>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          parallelism
          <Segmented
            layoutId="swarm-par"
            value={state.parallelism}
            onChange={(v) => dispatch({ type: 'parallelism', value: v })}
            options={[{ value: 1, label: '1' }, { value: 2, label: '2' }]}
          />
        </div>
        <span className={cn('ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold', converged ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300')}>
          {converged ? 'converged' : 'reconciling…'}
        </span>
      </div>

      <div className="mt-3 h-36 overflow-hidden rounded-lg border border-white/5 bg-[#060a14] p-3 font-mono text-[11px] leading-5">
        {state.log.map((l, i) => (
          <div key={`${l}-${i}`} className={i === 0 ? 'text-cyan-200' : 'text-slate-500'}>› {l}</div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Kill a worker and watch its tasks get rescheduled. Click <span className="font-mono">:8080</span> on any node, even one with no tasks, to see the routing mesh deliver the request.
      </p>
    </Panel>
  );
}
