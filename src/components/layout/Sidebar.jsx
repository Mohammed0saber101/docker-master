import { motion } from 'framer-motion';
import { Container, Home, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { MODULES } from '../../data/modules';
import { useLearning } from '../../store/useLearningStore';
import { cn } from '../../lib/cn';

/** Course navigation. Fixed on desktop, a slide-in drawer on mobile. */
export default function Sidebar() {
  const active = useLearning((s) => s.active);
  const setActive = useLearning((s) => s.setActive);
  const completed = useLearning((s) => s.completed);
  const quiz = useLearning((s) => s.quiz);
  const open = useLearning((s) => s.sidebarOpen);
  const close = useLearning((s) => s.closeSidebar);
  const resetProgress = useLearning((s) => s.resetProgress);

  const done = MODULES.filter((m) => completed[m.id]).length;
  const pct = Math.round((done / MODULES.length) * 100);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={close} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/5 bg-ink-950/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <button type="button" onClick={() => setActive('home')} className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-docker to-cyan-400 shadow-lg shadow-docker/30">
              <Container className="h-5 w-5 text-white" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-bold text-white">Docker Mastery</span>
              <span className="block text-[11px] text-slate-500">Fundamentals → Production</span>
            </span>
          </button>
          <button type="button" onClick={close} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-5 mb-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="mb-2 flex justify-between text-[11px] text-slate-400">
            <span>Course progress</span>
            <span className="font-mono text-cyan-300">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div className="h-full bg-gradient-to-r from-docker to-cyan-400" animate={{ width: `${pct}%` }} />
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <NavItem active={active === 'home'} onClick={() => setActive('home')} icon={Home} label="Overview" />
          <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Modules</div>
          {MODULES.map((m) => (
            <NavItem
              key={m.id}
              active={active === m.id}
              onClick={() => setActive(m.id)}
              icon={m.icon}
              label={m.short}
              num={m.num}
              done={completed[m.id]}
              score={quiz[m.id]}
            />
          ))}
        </nav>

        <div className="border-t border-white/5 p-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all progress and quiz scores?')) resetProgress();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset progress
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({ active, onClick, icon: Icon, label, num, done, score }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
        active ? 'text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200',
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl border border-cyan-400/20 bg-gradient-to-r from-docker/20 to-transparent"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
        />
      )}
      <span
        className={cn(
          'relative grid h-7 w-7 shrink-0 place-items-center rounded-lg border',
          active ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300' : 'border-white/5 bg-white/[0.03]',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="relative flex-1 truncate">
        {num && <span className="mr-1.5 font-mono text-[11px] text-slate-600">{String(num).padStart(2, '0')}</span>}
        {label}
      </span>
      {score && (
        <span className="relative font-mono text-[10px] text-slate-500">
          {score.score}/{score.total}
        </span>
      )}
      {done && <CheckCircle2 className="relative h-4 w-4 shrink-0 text-emerald-400" />}
    </button>
  );
}
