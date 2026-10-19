import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/** Labelled toggle switch. */
export default function Switch({ checked, onChange, label, hint, disabled = false }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <button type="button" onClick={() => onChange(!checked)} className="text-left text-xs text-slate-300">
        {label}
        {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-cyan-500' : 'bg-slate-700',
        )}
      >
        <motion.span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
          animate={{ left: checked ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}
