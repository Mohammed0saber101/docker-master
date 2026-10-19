import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/**
 * Segmented control / tab strip with a sliding highlight.
 * `layoutId` must be unique per instance on the page.
 */
export default function Segmented({ options, value, onChange, layoutId = 'segmented', className = '' }) {
  return (
    <div className={cn('inline-flex flex-wrap gap-1 rounded-xl border border-white/10 bg-ink-950/60 p-1', className)}>
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              active ? 'text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-docker/40 to-cyan-500/25 ring-1 ring-cyan-400/40"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
