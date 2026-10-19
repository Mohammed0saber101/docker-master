import { Lightbulb, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/cn';

const STYLES = {
  tip: { icon: Lightbulb, cls: 'border-emerald-400/20 bg-emerald-400/5', accent: 'text-emerald-300', label: 'Best practice' },
  warn: { icon: AlertTriangle, cls: 'border-amber-400/20 bg-amber-400/5', accent: 'text-amber-300', label: 'Watch out' },
  info: { icon: Info, cls: 'border-cyan-400/20 bg-cyan-400/5', accent: 'text-cyan-300', label: 'Under the hood' },
};

export default function Callout({ type = 'info', title, children, className = '' }) {
  const s = STYLES[type];
  const Icon = s.icon;
  return (
    <div className={cn('my-5 flex gap-3 rounded-xl border p-4', s.cls, className)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', s.accent)} />
      <div className="min-w-0 text-sm leading-6 text-slate-300">
        <div className={cn('mb-1 text-xs font-semibold uppercase tracking-wider', s.accent)}>{title || s.label}</div>
        {children}
      </div>
    </div>
  );
}
