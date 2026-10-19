import { motion } from 'framer-motion';
import { Clock, Target, CheckCircle2, ArrowRight, GraduationCap } from 'lucide-react';
import { MODULES, moduleById } from '../../data/modules';
import { useLearning } from '../../store/useLearningStore';
import Quiz from '../ui/Quiz';
import Button from '../ui/Button';

/**
 * Wraps a module: hero header with objectives, the lessons (children), and a
 * footer with the knowledge check and "complete & continue" navigation.
 */
export default function ModuleShell({ id, objectives = [], quiz = [], children }) {
  const meta = moduleById(id);
  const idx = MODULES.indexOf(meta);
  const next = MODULES[idx + 1];
  const completed = useLearning((s) => s.completed[id]);
  const markComplete = useLearning((s) => s.markComplete);
  const setActive = useLearning((s) => s.setActive);
  const Icon = meta.icon;

  const finish = () => {
    markComplete(id);
    setActive(next ? next.id : 'home');
  };

  return (
    <div>
      <header className="relative overflow-hidden border-b border-white/5 py-12">
        <div className="pointer-events-none absolute -right-16 -top-10 opacity-[0.06]">
          <Icon className="h-72 w-72 text-cyan-300" strokeWidth={1} />
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 font-mono text-xs font-semibold text-cyan-300">
              MODULE {String(meta.num).padStart(2, '0')}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" /> ~{meta.minutes} min
            </span>
            {completed && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">{meta.title}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-400">{meta.blurb}</p>
        </motion.div>

        {objectives.length > 0 && (
          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {objectives.map((o, i) => (
              <motion.div
                key={o}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-slate-300"
              >
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                {o}
              </motion.div>
            ))}
          </div>
        )}
      </header>

      {children}

      <section className="grid gap-6 border-t border-white/5 py-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Quiz key={id} moduleId={id} questions={quiz} />
        <div className="flex flex-col justify-between rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-docker/15 via-ink-800/60 to-ink-800/60 p-6">
          <div>
            <GraduationCap className="h-8 w-8 text-cyan-300" />
            <h3 className="mt-3 text-xl font-bold text-white">
              {completed ? 'Module complete' : 'Finished this module?'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {next
                ? `Up next: Module ${next.num} — ${next.title}. ${next.blurb}`
                : 'That was the last module. You now have the full mental model, from kernel primitives to a hardened, clustered deployment.'}
            </p>
          </div>
          <Button icon={next ? ArrowRight : CheckCircle2} onClick={finish} className="mt-6 py-2.5 text-sm">
            {next ? `Complete & continue` : 'Complete course'}
          </Button>
        </div>
      </section>
    </div>
  );
}
