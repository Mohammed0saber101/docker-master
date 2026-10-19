import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, MousePointerClick, TerminalSquare, Sparkles } from 'lucide-react';
import { MODULES } from '../../data/modules';
import { useLearning } from '../../store/useLearningStore';
import Button from '../ui/Button';

const LAYERS = [
  { label: 'Container layer (R/W)', cls: 'border-dashed border-cyan-300/60 bg-cyan-300/10 text-cyan-200' },
  { label: 'COPY . /app', cls: 'border-violet-400/40 bg-violet-400/10 text-violet-200' },
  { label: 'RUN npm ci', cls: 'border-sky-400/40 bg-sky-400/10 text-sky-200' },
  { label: 'COPY package.json', cls: 'border-indigo-400/40 bg-indigo-400/10 text-indigo-200' },
  { label: 'FROM node:20-alpine', cls: 'border-slate-500/40 bg-slate-500/10 text-slate-300' },
];

/** Course landing page: hero, how-it-works and the module map. */
export default function Home() {
  const setActive = useLearning((s) => s.setActive);
  const completed = useLearning((s) => s.completed);
  const firstOpen = MODULES.find((m) => !completed[m.id]) || MODULES[0];

  return (
    <div className="pb-8">
      <section className="grid items-center gap-12 py-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" /> 7 modules · 20+ interactive labs
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl">
            Master Docker by{' '}
            <span className="bg-gradient-to-r from-docker-light via-cyan-300 to-docker bg-clip-text text-transparent">
              seeing it work
            </span>
            .
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-400">
            From kernel namespaces to a self-healing Swarm cluster. Every concept comes with a live diagram,
            simulation or terminal you can poke at.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button icon={ArrowRight} onClick={() => setActive(firstOpen.id)} className="px-5 py-3 text-sm">
              {Object.keys(completed).length ? `Continue: ${firstOpen.short}` : 'Start Module 1'}
            </Button>
            <Button variant="ghost" onClick={() => setActive('security')} className="px-5 py-3 text-sm">
              Jump to CLI cheat sheet
            </Button>
          </div>
        </motion.div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute inset-0 -z-10 rounded-full bg-docker/20 blur-3xl" />
          <div className="space-y-2 [perspective:1000px]">
            {LAYERS.map((l, i) => (
              <motion.div
                key={l.label}
                initial={{ opacity: 0, x: 40, rotateX: 20 }}
                animate={{ opacity: 1, x: 0, rotateX: 0 }}
                transition={{ delay: 0.15 + (LAYERS.length - i) * 0.12, type: 'spring', bounce: 0.3 }}
                whileHover={{ x: -8, scale: 1.02 }}
                className={`flex items-center justify-between rounded-xl border px-4 py-3.5 font-mono text-sm ${l.cls}`}
              >
                <span>{l.label}</span>
                <span className="text-[10px] opacity-60">{i === 0 ? 'thin · writable' : 'read-only'}</span>
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">An image is a stack of read-only layers. Hover them.</p>
        </div>
      </section>

      <section className="grid gap-4 border-y border-white/5 py-8 sm:grid-cols-3">
        {[
          { icon: MousePointerClick, t: 'Split-screen lessons', d: 'Concept on the left, a live playground on the right.' },
          { icon: TerminalSquare, t: 'Click-to-run terminals', d: 'Realistic CLI output, copy any command to your own shell.' },
          { icon: CheckCircle2, t: 'Progress & quizzes', d: 'Knowledge checks per module, progress saved locally.' },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="flex gap-3">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
            <div>
              <div className="text-sm font-semibold text-white">{t}</div>
              <div className="text-sm text-slate-400">{d}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="py-12">
        <h2 className="mb-6 text-2xl font-bold text-white">Curriculum</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.button
                key={m.id}
                type="button"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => setActive(m.id)}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-800/60 p-5 text-left transition hover:border-cyan-400/40"
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-docker/10 blur-2xl transition group-hover:bg-cyan-400/20" />
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  {completed[m.id] ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <span className="font-mono text-xs text-slate-600">{String(m.num).padStart(2, '0')}</span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{m.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-400">{m.blurb}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-cyan-400">
                  Open module <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
