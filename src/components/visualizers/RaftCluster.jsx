import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Vote, ShieldAlert, ShieldCheck } from 'lucide-react';
import Panel from '../ui/Panel';
import Segmented from '../ui/Segmented';
import { cn } from '../../lib/cn';

/**
 * Raft consensus among Swarm managers. Click a manager to take it down or bring
 * it back. Losing the leader triggers an election (if a quorum remains); losing
 * quorum freezes the control plane.
 */
const CX = 200;
const CY = 150;
const R = 105;

export default function RaftCluster() {
  const [n, setN] = useState(3);
  const [alive, setAlive] = useState([true, true, true]);
  const [leader, setLeader] = useState(0);
  const [term, setTerm] = useState(1);
  const [electing, setElecting] = useState(false);

  const quorum = Math.floor(n / 2) + 1;
  const aliveCount = alive.filter(Boolean).length;
  const hasQuorum = aliveCount >= quorum;
  const leaderOk = leader !== null && alive[leader];

  const resize = (size) => {
    setN(size);
    setAlive(Array(size).fill(true));
    setLeader(0);
    setTerm(1);
  };

  // Leader election whenever there is no live leader but a quorum exists.
  useEffect(() => {
    if (leaderOk) {
      setElecting(false);
      return undefined;
    }
    if (!hasQuorum) {
      setElecting(false);
      return undefined;
    }
    setElecting(true);
    const timer = setTimeout(() => {
      const candidates = alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
      setLeader(candidates[Math.floor(Math.random() * candidates.length)]);
      setTerm((t) => t + 1);
      setElecting(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, [leaderOk, hasQuorum, alive]);

  const toggle = (i) => setAlive((a) => a.map((v, j) => (j === i ? !v : v)));

  const points = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  });

  return (
    <Panel
      title="Raft consensus between managers"
      icon={Vote}
      actions={
        <Segmented
          layoutId="raft-size"
          value={n}
          onChange={resize}
          options={[
            { value: 3, label: '3 managers' },
            { value: 5, label: '5 managers' },
            { value: 7, label: '7 managers' },
          ]}
        />
      }
    >
      <div className="grid-bg rounded-xl border border-white/5 bg-ink-950/50">
        <svg viewBox="0 0 400 300" className="mx-auto h-auto w-full max-w-md select-none">
          {points.map((p, i) =>
            points.slice(i + 1).map((q, j) => (
              <line key={`${i}-${j}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="stroke-slate-700/60" strokeWidth={1} />
            )),
          )}

          {leaderOk && hasQuorum &&
            points.map((p, i) =>
              i !== leader && alive[i] ? (
                <motion.circle
                  key={`hb-${leader}-${term}-${i}`}
                  r={4.5}
                  className="fill-amber-300"
                  initial={{ cx: points[leader].x, cy: points[leader].y, opacity: 0 }}
                  animate={{ cx: [points[leader].x, p.x], cy: [points[leader].y, p.y], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.4, ease: 'easeInOut' }}
                />
              ) : null,
            )}

          {points.map((p, i) => {
            const isLeader = leaderOk && i === leader;
            const down = !alive[i];
            const candidate = electing && !down;
            return (
              <g key={i} onClick={() => toggle(i)} className="cursor-pointer">
                {isLeader && (
                  <motion.circle cx={p.x} cy={p.y} r={34} className="fill-none stroke-amber-300/50" animate={{ r: [30, 40], opacity: [0.8, 0] }} transition={{ duration: 1.4, repeat: Infinity }} strokeWidth={2} />
                )}
                <circle
                  cx={p.x} cy={p.y} r={28}
                  className={cn(
                    down ? 'fill-rose-500/10 stroke-rose-400/60'
                      : isLeader ? 'fill-amber-400/15 stroke-amber-300'
                      : candidate ? 'fill-violet-400/15 stroke-violet-300'
                      : 'fill-cyan-400/10 stroke-cyan-400/60',
                  )}
                  strokeWidth={2}
                  strokeDasharray={down ? '4 4' : undefined}
                />
                {isLeader && <Crown x={p.x - 9} y={p.y - 22} size={18} className="text-amber-300" />}
                <text x={p.x} y={p.y + (isLeader ? 9 : 4)} textAnchor="middle" className="fill-slate-100 text-[11px] font-semibold">
                  mgr-{i + 1}
                </text>
                <text x={p.x} y={p.y + 44} textAnchor="middle" className={cn('text-[10px]', down ? 'fill-rose-400' : isLeader ? 'fill-amber-300' : candidate ? 'fill-violet-300' : 'fill-slate-500')}>
                  {down ? 'down' : isLeader ? 'leader' : candidate ? 'candidate' : 'follower'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Quorum needed" value={`${quorum} of ${n}`} />
        <Stat label="Fault tolerance" value={`${Math.floor((n - 1) / 2)} manager${Math.floor((n - 1) / 2) === 1 ? '' : 's'}`} />
        <Stat label="Raft term" value={term} />
      </div>

      <div
        className={cn(
          'mt-3 flex gap-2 rounded-lg border p-3 text-xs leading-5',
          hasQuorum ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-100' : 'border-rose-400/40 bg-rose-500/10 text-rose-100',
        )}
      >
        {hasQuorum ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
        {!hasQuorum
          ? `Quorum lost (${aliveCount}/${n} alive). Running tasks keep serving, but no deploys, scaling or rescheduling are possible until managers return.`
          : electing
            ? 'Leader lost: followers time out, become candidates and vote. The node with a majority of votes becomes the new leader.'
            : `${aliveCount}/${n} managers healthy. The leader replicates every cluster change to the Raft log and commits once ${quorum} managers have acknowledged it.`}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Click a manager to take it down or bring it back.</p>
    </Panel>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 font-mono text-sm text-white">{value}</div>
    </div>
  );
}
