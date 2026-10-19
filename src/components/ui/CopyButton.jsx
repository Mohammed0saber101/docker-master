import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Copies `text` to the clipboard and briefly shows a check mark. */
export default function CopyButton({ text, className = '', label }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable (insecure context) — fail silently */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy to clipboard"
      className={cn(
        'inline-flex items-center gap-1 rounded-md p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-200',
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {label && <span className="text-[11px]">{copied ? 'Copied' : label}</span>}
    </button>
  );
}
