import { cn } from '../../lib/cn';

/**
 * Card container for every playground. Optional header with icon, title and
 * right-aligned actions.
 */
export default function Panel({ title, icon: Icon, actions, children, className = '', bodyClass = 'p-4' }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-white/10 bg-ink-800/70 shadow-glow backdrop-blur',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            {Icon && <Icon className="h-4 w-4 text-cyan-400" />}
            {title}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}
