import { cn } from '../../lib/cn';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-docker to-cyan-500 text-white shadow-lg shadow-docker/20 hover:brightness-110',
  ghost: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
  danger: 'border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
  success: 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
};

/** Small, consistent action button. `icon` takes a lucide component. */
export default function Button({ variant = 'primary', icon: Icon, className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
