import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Award } from 'lucide-react';
import { useLearning } from '../../store/useLearningStore';
import Button from './Button';
import { cn } from '../../lib/cn';

/**
 * Multiple-choice knowledge check. Records the final score in the store.
 * questions: [{ q, options: string[], answer: index, explain }]
 */
export default function Quiz({ moduleId, questions }) {
  const recordQuiz = useLearning((s) => s.recordQuiz);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[index];

  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setPicked(null);
    } else {
      recordQuiz(moduleId, score, questions.length);
      setDone(true);
    }
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const perfect = score === questions.length;
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-6 text-center">
        <Award className={cn('mx-auto h-10 w-10', perfect ? 'text-amber-300' : 'text-cyan-400')} />
        <div className="mt-3 text-2xl font-bold text-white">
          {score} / {questions.length}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {perfect ? 'Flawless. You clearly own this module.' : 'Review the explanations and give it another go.'}
        </p>
        <Button variant="ghost" icon={RotateCcw} onClick={restart} className="mt-4">
          Retake quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wider text-cyan-400">Knowledge check</span>
        <span>
          Question {index + 1} of {questions.length}
        </span>
      </div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-docker to-cyan-400"
          animate={{ width: `${((index + (picked !== null ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={index} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
          <h4 className="mb-4 text-base font-semibold text-white">{q.q}</h4>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const isAnswer = i === q.answer;
              const isPicked = i === picked;
              const revealed = picked !== null;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => choose(i)}
                  disabled={revealed}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition',
                    !revealed && 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-cyan-400/40 hover:bg-cyan-400/5',
                    revealed && isAnswer && 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100',
                    revealed && isPicked && !isAnswer && 'border-rose-400/50 bg-rose-400/10 text-rose-100',
                    revealed && !isAnswer && !isPicked && 'border-white/5 text-slate-500',
                  )}
                >
                  <span className="mt-0.5 font-mono text-xs text-slate-500">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{opt}</span>
                  {revealed && isAnswer && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                  {revealed && isPicked && !isAnswer && <XCircle className="h-4 w-4 shrink-0 text-rose-400" />}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
              {q.explain}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="mt-5 flex justify-end">
        <Button icon={ArrowRight} disabled={picked === null} onClick={next}>
          {index + 1 < questions.length ? 'Next question' : 'See results'}
        </Button>
      </div>
    </div>
  );
}
