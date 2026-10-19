import { Menu, ChevronRight, ChevronLeft } from 'lucide-react';
import { MODULES, moduleById } from '../../data/modules';
import { useLearning } from '../../store/useLearningStore';

/** Sticky header: mobile menu toggle, breadcrumb and prev/next module navigation. */
export default function TopBar() {
  const active = useLearning((s) => s.active);
  const setActive = useLearning((s) => s.setActive);
  const toggleSidebar = useLearning((s) => s.toggleSidebar);
  const meta = moduleById(active);
  const idx = meta ? MODULES.indexOf(meta) : -1;
  const prev = idx > 0 ? MODULES[idx - 1] : null;
  const next = idx >= 0 ? MODULES[idx + 1] : MODULES[0];

  return (
    <div className="sticky top-0 z-20 border-b border-white/5 bg-ink-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <button type="button" onClick={() => setActive('home')} className="text-slate-500 hover:text-slate-300">
            Course
          </button>
          {meta && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              <span className="truncate font-medium text-slate-200">
                <span className="mr-1.5 font-mono text-cyan-400">{String(meta.num).padStart(2, '0')}</span>
                {meta.title}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {prev && (
            <button
              type="button"
              onClick={() => setActive(prev.id)}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              title={`Previous: ${prev.title}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {next && (
            <button
              type="button"
              onClick={() => setActive(next.id)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <span className="hidden sm:inline">{meta ? 'Next' : 'Start'}: {next.short}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
