import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, BookOpen, X } from 'lucide-react';
import Panel from '../ui/Panel';
import CopyButton from '../ui/CopyButton';
import { CHEATSHEET, CATEGORIES } from '../../data/cheatsheet';
import { cn } from '../../lib/cn';

/**
 * Searchable Docker CLI reference. Each command's flags are rendered as
 * clickable tokens; clicking one reveals what it does (the live flag explainer).
 */
function tokenize(cmd) {
  // Split on spaces but keep "--flag=value" style tokens intact.
  return cmd.split(' ').filter(Boolean);
}

function flagKey(token, flags) {
  if (flags[token]) return token;
  const base = token.split('=')[0];
  return flags[base] ? base : null;
}

function CommandCard({ item, query }) {
  const [openFlag, setOpenFlag] = useState(null);
  const tokens = tokenize(item.cmd);
  const hasFlags = Object.keys(item.flags).length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex flex-col rounded-xl border border-white/10 bg-ink-950/50 p-3 transition hover:border-cyan-400/30"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-xs text-slate-400">{highlight(item.desc, query)}</span>
        <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">{item.cat}</span>
      </div>
      <div className="flex items-start gap-1 rounded-lg bg-[#060a14] px-2.5 py-2">
        <div className="flex flex-1 flex-wrap gap-x-1.5 gap-y-1 font-mono text-[11.5px] leading-5">
          {tokens.map((t, i) => {
            const key = flagKey(t, item.flags);
            if (key) {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setOpenFlag(openFlag === key ? null : key)}
                  title={item.flags[key]}
                  className={cn(
                    'rounded px-0.5 underline decoration-dotted underline-offset-4 transition',
                    openFlag === key ? 'bg-amber-400/20 text-amber-200' : 'text-amber-300 hover:bg-amber-400/10',
                  )}
                >
                  {t}
                </button>
              );
            }
            return (
              <span key={i} className={i === 0 ? 'text-cyan-300' : i === 1 ? 'text-sky-200' : 'text-slate-300'}>
                {t}
              </span>
            );
          })}
        </div>
        <CopyButton text={item.cmd} />
      </div>
      <AnimatePresence>
        {openFlag && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-2 text-[11.5px] text-amber-100">
              <code className="shrink-0 font-mono text-amber-300">{openFlag}</code>
              <span className="flex-1">{item.flags[openFlag]}</span>
              <button type="button" onClick={() => setOpenFlag(null)} className="text-amber-300/60 hover:text-amber-200">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {hasFlags && !openFlag && <div className="mt-1.5 text-[10px] text-slate-600">Click a highlighted flag to explain it</div>}
    </motion.div>
  );
}

function highlight(text, query) {
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-cyan-400/25 px-0.5 text-cyan-100">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

export default function CheatSheet() {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHEATSHEET.filter((c) => {
      if (cat !== 'All' && c.cat !== cat) return false;
      if (!q) return true;
      const hay = `${c.cmd} ${c.desc} ${Object.keys(c.flags).join(' ')} ${Object.values(c.flags).join(' ')}`.toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    });
  }, [query, cat]);

  return (
    <Panel title="Docker CLI cheat sheet" icon={BookOpen} actions={<span className="font-mono text-[11px] text-slate-500">{results.length} commands</span>}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search commands, flags or intent, e.g. "logs", "--rm", "rolling update"'
          className="w-full rounded-xl border border-white/10 bg-ink-950/70 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-400/50"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition',
              cat === c ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200' : 'border-white/10 text-slate-400 hover:text-slate-200',
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {results.map((item) => (
            <CommandCard key={item.cmd} item={item} query={query.trim()} />
          ))}
        </AnimatePresence>
      </div>
      {!results.length && <div className="py-10 text-center text-sm text-slate-500">No commands match “{query}”.</div>}
    </Panel>
  );
}
