import { useEffect, useRef, useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import CopyButton from './CopyButton';
import { cn } from '../../lib/cn';

/**
 * Mock terminal with click-to-run commands.
 *
 * props.commands: [{ cmd: string, output: (string | { text, tone })[], speed?: ms per line }]
 *   tone ∈ ok | err | warn | dim | info
 * props.onRun(entry) fires when a command starts — lets visualizers sync with the shell.
 *
 * Learners can also type a suggested command (exact match) or `clear`.
 */
const TONE = {
  ok: 'text-emerald-400',
  err: 'text-rose-400',
  warn: 'text-amber-300',
  dim: 'text-slate-500',
  info: 'text-cyan-300',
};

const norm = (l) => (typeof l === 'string' ? { text: l } : l);
const squash = (s) => s.trim().replace(/\s+/g, ' ');

export default function Terminal({
  title = 'bash — docker',
  commands = [],
  onRun,
  welcome = 'Click a command below (or type it) to run it in this simulated shell.',
  heightClass = 'h-72',
  className = '',
}) {
  const [lines, setLines] = useState(() => [{ id: 0, type: 'out', text: welcome, tone: 'dim' }]);
  const [running, setRunning] = useState(false);
  const [input, setInput] = useState('');
  const nextId = useRef(1);
  const timers = useRef([]);
  const bodyRef = useRef(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const push = (line) => setLines((prev) => [...prev, { id: nextId.current++, ...line }]);

  const run = (entry) => {
    if (running) return;
    push({ type: 'cmd', text: entry.cmd });
    onRun?.(entry);
    const out = (entry.output || []).map(norm);
    if (!out.length) return;
    setRunning(true);
    out.forEach((line, i) => {
      timers.current.push(
        setTimeout(() => {
          push({ type: 'out', ...line });
          if (i === out.length - 1) setRunning(false);
        }, (i + 1) * (entry.speed ?? 70)),
      );
    });
  };

  const submit = (e) => {
    e.preventDefault();
    const value = input.trim();
    if (!value || running) return;
    setInput('');
    if (value === 'clear') {
      setLines([]);
      return;
    }
    const match = commands.find((c) => squash(c.cmd) === squash(value));
    if (match) run(match);
    else {
      push({ type: 'cmd', text: value });
      push({ type: 'out', tone: 'warn', text: 'Simulated shell: try one of the suggested commands below.' });
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-xl border border-white/10 bg-[#060a14] shadow-glow', className)}>
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </span>
          <span className="font-mono text-[11px] text-slate-500">{title}</span>
        </div>
        <button
          type="button"
          onClick={() => setLines([])}
          className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-300"
          title="Clear"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div ref={bodyRef} className={cn('overflow-y-auto px-4 py-3 font-mono text-[12px] leading-5', heightClass)}>
        {lines.map((l) =>
          l.type === 'cmd' ? (
            <div key={l.id} className="mt-1 whitespace-pre-wrap break-all text-slate-100">
              <span className="text-emerald-400">dev@host</span>
              <span className="text-slate-500">:</span>
              <span className="text-docker-light">~</span>
              <span className="text-slate-500">$ </span>
              {l.text}
            </div>
          ) : (
            <div key={l.id} className={cn('whitespace-pre-wrap break-all', TONE[l.tone] || 'text-slate-300')}>
              {l.text || ' '}
            </div>
          ),
        )}
        <form onSubmit={submit} className="mt-1 flex items-center">
          <span className="shrink-0 text-emerald-400">dev@host</span>
          <span className="text-slate-500">:</span>
          <span className="text-docker-light">~</span>
          <span className="shrink-0 text-slate-500">$&nbsp;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={running}
            spellCheck={false}
            aria-label="Terminal input"
            className="min-w-0 flex-1 bg-transparent text-slate-100 caret-cyan-400 outline-none"
          />
        </form>
      </div>

      {commands.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-white/5 bg-ink-950/60 p-2.5">
          {commands.map((c) => (
            <div
              key={c.cmd}
              className="group flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] pr-1 transition hover:border-cyan-400/30 hover:bg-cyan-400/5"
            >
              <button
                type="button"
                disabled={running}
                onClick={() => run(c)}
                className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left disabled:opacity-50"
              >
                <Play className="h-3 w-3 shrink-0 text-cyan-400" />
                <span className="truncate font-mono text-[11.5px] text-slate-300 group-hover:text-white">{c.cmd}</span>
              </button>
              <CopyButton text={c.cmd} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
