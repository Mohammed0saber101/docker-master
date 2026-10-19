import { Highlight } from 'prism-react-renderer';
import { codeTheme } from '../../lib/prism';
import CopyButton from './CopyButton';
import { cn } from '../../lib/cn';

/**
 * Syntax-highlighted code with a title bar and copy button.
 *
 * Optional interactivity (used by the Dockerfile parser):
 *  - `activeLine`   zero-based index of the highlighted line
 *  - `onLineClick`  makes every line clickable, receives the line index
 *  - `lineMeta`     { [index]: ReactNode } rendered at the end of a line (badges etc.)
 */
export default function CodeBlock({
  code,
  language = 'bash',
  title,
  activeLine,
  onLineClick,
  lineMeta,
  showLineNumbers = true,
  className = '',
}) {
  const source = code.replace(/\s+$/, '');
  return (
    <div className={cn('overflow-hidden rounded-xl border border-white/10 bg-ink-950/80', className)}>
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </span>
          <span className="font-mono text-[11px] text-slate-500">{title || language}</span>
        </div>
        <CopyButton text={source} />
      </div>
      <Highlight theme={codeTheme} code={source} language={language}>
        {({ className: cls, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={cn(cls, 'overflow-x-auto py-3 font-mono text-[12.5px] leading-6')} style={style}>
            {tokens.map((line, i) => {
              const { className: lineCls, ...lineProps } = getLineProps({ line });
              const active = activeLine === i;
              return (
                <div
                  key={i}
                  {...lineProps}
                  onClick={onLineClick ? () => onLineClick(i) : undefined}
                  className={cn(
                    lineCls,
                    'flex min-w-max px-3 transition-colors',
                    onLineClick && 'cursor-pointer hover:bg-white/5',
                    active && 'bg-cyan-400/10 shadow-[inset_3px_0_0_#22d3ee]',
                  )}
                >
                  {showLineNumbers && (
                    <span className="w-7 shrink-0 select-none pr-3 text-right text-slate-600">{i + 1}</span>
                  )}
                  <span className="flex-1 whitespace-pre">
                    {line.map((token, k) => (
                      <span key={k} {...getTokenProps({ token })} />
                    ))}
                  </span>
                  {lineMeta?.[i] && <span className="ml-4 shrink-0">{lineMeta[i]}</span>}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
