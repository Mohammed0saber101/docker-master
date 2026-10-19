import { motion } from 'framer-motion';
import { useState } from 'react';
import { ArrowDown, FlaskConical } from 'lucide-react';
import Panel from '../ui/Panel';
import { cn } from '../../lib/cn';

/**
 * CMD vs ENTRYPOINT calculator (exec form).
 * Rule: argv = ENTRYPOINT + (docker run args ?? CMD)
 */
const ENTRY = [
  { label: '(none)', value: null },
  { label: '["python", "app.py"]', value: ['python', 'app.py'] },
  { label: '["docker-entrypoint.sh"]', value: ['docker-entrypoint.sh'] },
];
const CMD = [
  { label: '(none)', value: null },
  { label: '["--port", "8000"]', value: ['--port', '8000'] },
  { label: '["python", "app.py"]', value: ['python', 'app.py'] },
];
const ARGS = [
  { label: '(no args)', value: null },
  { label: '--port 9000', value: ['--port', '9000'] },
  { label: 'bash', value: ['bash'] },
];

function Picker({ title, options, value, onChange }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[11px] text-slate-500">{title}</div>
      <div className="flex flex-col gap-1">
        {options.map((o, i) => (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(i)}
            className={cn(
              'rounded-lg border px-2.5 py-1.5 text-left font-mono text-[11px] transition',
              value === i ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-400 hover:border-white/20',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CmdEntrypointLab() {
  const [e, setE] = useState(1);
  const [c, setC] = useState(1);
  const [a, setA] = useState(0);

  const entry = ENTRY[e].value;
  const cmd = CMD[c].value;
  const args = ARGS[a].value;
  const params = args ?? cmd ?? [];
  const argv = entry ? [...entry, ...params] : params;

  let note;
  if (!argv.length) note = 'Error: no command specified. The image needs a CMD or ENTRYPOINT.';
  else if (entry && args) note = 'Runtime args replaced CMD and were appended to ENTRYPOINT.';
  else if (entry && cmd) note = 'CMD supplies default arguments to ENTRYPOINT.';
  else if (!entry && args) note = 'With no ENTRYPOINT, runtime args replace CMD entirely.';
  else note = 'CMD is the whole command.';

  // docker-entrypoint.sh + CMD ["python", "app.py"] is the classic wrapper pattern (script ends in exec "$@"),
  // but ENTRYPOINT python app.py + CMD python app.py passes "python" as an argument to the app.
  const weird = e === 1 && params[0] === 'python';
  const wrapper = e === 2 && params[0] === 'python';

  return (
    <Panel title="CMD vs ENTRYPOINT lab" icon={FlaskConical}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Picker title="ENTRYPOINT" options={ENTRY} value={e} onChange={setE} />
        <Picker title="CMD" options={CMD} value={c} onChange={setC} />
        <Picker title="docker run img …" options={ARGS} value={a} onChange={setA} />
      </div>
      <div className="my-3 flex justify-center text-slate-600">
        <ArrowDown className="h-4 w-4" />
      </div>
      <motion.div
        key={argv.join(' ')}
        initial={{ scale: 0.97, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          'rounded-xl border p-4',
          argv.length ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-rose-400/30 bg-rose-400/5',
        )}
      >
        <div className="text-[11px] uppercase tracking-wider text-slate-500">PID 1 executes</div>
        <div className="mt-1 break-all font-mono text-sm text-white">
          {argv.length ? argv.map((t, i) => (
            <span key={i} className={i < (entry?.length ?? 0) ? 'text-cyan-300' : 'text-amber-200'}>
              {t}{' '}
            </span>
          )) : '—'}
        </div>
        <div className="mt-2 text-xs text-slate-400">{note}</div>
        {weird && (
          <div className="mt-2 text-xs text-amber-300">
            Probably a bug: the program receives “python” as an argument. Use ENTRYPOINT for the executable and CMD for its default flags.
          </div>
        )}
        {wrapper && (
          <div className="mt-2 text-xs text-emerald-300">
            Classic wrapper pattern: the script does its setup (migrations, config templating), then runs <code className="inline-code">exec "$@"</code> so the app becomes PID 1.
          </div>
        )}
      </motion.div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        <span className="text-cyan-300">cyan</span> = from ENTRYPOINT · <span className="text-amber-200">amber</span> = from CMD or runtime args.
        Shell form (<code className="inline-code">CMD node app.js</code>) wraps the command in <code className="inline-code">/bin/sh -c</code>, so your app is not PID 1 and won’t receive SIGTERM.
      </p>
    </Panel>
  );
}
