import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Database, FolderOpen, Folder, FileText, MemoryStick, HardDrive, Plus, Trash2, Play, Box, Ban, Search,
} from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Segmented from '../ui/Segmented';
import { cn } from '../../lib/cn';

/**
 * VolumeInspector
 *
 * Maps a host location to the container path /var/lib/postgresql/data for each
 * mount type, then lets the learner write rows, delete the container and start a
 * new one to see which data survives.
 */
const CONTAINER_PATH = '/var/lib/postgresql/data';

const TYPES = {
  volume: {
    label: 'Named volume', icon: Database, persists: true,
    hostLabel: 'Docker-managed area', hostPath: '/var/lib/docker/volumes/pgdata/_data',
    flag: 'docker run -d --name db -v pgdata:/var/lib/postgresql/data postgres:16',
    note: 'Created and owned by Docker, independent of any container. Portable across hosts with volume drivers, and the recommended choice for databases.',
  },
  bind: {
    label: 'Bind mount', icon: FolderOpen, persists: true,
    hostLabel: 'Your project directory', hostPath: '/home/dev/project/pgdata',
    flag: 'docker run -d --name db --mount type=bind,src="$(pwd)"/pgdata,dst=/var/lib/postgresql/data postgres:16',
    note: 'Any host path, mounted as-is. Great for live-reloading source code in development. Couples the container to the host’s directory layout and file permissions.',
  },
  tmpfs: {
    label: 'tmpfs', icon: MemoryStick, persists: false, memory: true,
    hostLabel: 'Host RAM', hostPath: null,
    flag: 'docker run -d --name db --tmpfs /var/lib/postgresql/data postgres:16',
    note: 'Lives in memory only and is never written to disk. Very fast and good for secrets or scratch space. Gone as soon as the container stops.',
  },
  none: {
    label: 'No mount', icon: Ban, persists: false,
    hostLabel: 'Container writable layer', hostPath: '/var/lib/docker/overlay2/3f9c2a…/diff/var/lib/postgresql/data',
    flag: 'docker run -d --name db postgres:16   # (writes land in the container layer)',
    note: 'Data is written to the container’s upperdir and deleted with the container. Fine for stateless apps, a data-loss incident for databases.',
  },
};

const NAMES = ['ada', 'linus', 'grace', 'ken', 'margaret', 'dennis', 'barbara', 'guido'];

function PathTree({ path, files, faded }) {
  const parts = path.split('/').filter(Boolean);
  return (
    <div className={cn('font-mono text-[11px] leading-5 transition-opacity', faded && 'opacity-40')}>
      {parts.map((p, i) => (
        <div
          key={`${p}-${i}`}
          style={{ paddingLeft: i * 10 }}
          className={cn('flex items-center gap-1 truncate', i === parts.length - 1 ? 'text-cyan-200' : 'text-slate-500')}
        >
          {i === parts.length - 1 ? <FolderOpen className="h-3 w-3 shrink-0" /> : <Folder className="h-3 w-3 shrink-0" />}
          {p}/
        </div>
      ))}
      <AnimatePresence>
        {files.map((f) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            style={{ paddingLeft: parts.length * 10 }}
            className="flex items-center gap-1 text-slate-300"
          >
            <FileText className="h-3 w-3 shrink-0 text-slate-500" />
            {f}
          </motion.div>
        ))}
      </AnimatePresence>
      {!files.length && (
        <div style={{ paddingLeft: parts.length * 10 }} className="text-slate-600">(empty)</div>
      )}
    </div>
  );
}

export default function VolumeInspector() {
  const [type, setType] = useState('volume');
  const [alive, setAlive] = useState(true);
  const [initialized, setInitialized] = useState(true);
  const [rows, setRows] = useState([]);
  const [generation, setGeneration] = useState(1);
  const [log, setLog] = useState([]);
  const cfg = TYPES[type];

  const say = (text, tone = 'info') => setLog((l) => [{ id: Date.now() + Math.random(), text, tone }, ...l].slice(0, 4));

  const changeType = (t) => {
    setType(t);
    setAlive(true);
    setInitialized(true);
    setRows([]);
    setGeneration(1);
    setLog([]);
  };

  const insert = () => {
    const name = NAMES[rows.length % NAMES.length];
    setRows((r) => [...r, { id: r.length + 1, name }]);
    say(`INSERT INTO users VALUES (${rows.length + 1}, '${name}')`);
  };

  const remove = () => {
    setAlive(false);
    if (!cfg.persists) {
      setInitialized(false);
      setRows([]);
      say(type === 'tmpfs' ? 'docker rm -f db → tmpfs memory released, data gone' : 'docker rm -f db → writable layer deleted, data gone', 'err');
    } else {
      say(`docker rm -f db → container gone, ${type === 'volume' ? 'volume pgdata' : 'host directory'} untouched`, 'ok');
    }
  };

  const recreate = () => {
    setAlive(true);
    setGeneration((g) => g + 1);
    if (!initialized) {
      setInitialized(true);
      say('docker run … → empty data dir, initdb creates a fresh cluster', 'warn');
    } else {
      say(`docker run … → found existing data, ${rows.length} row(s) restored`, 'ok');
    }
  };

  const dataFiles = initialized ? ['PG_VERSION', 'postgresql.conf', `base/users.dat  (${rows.length} rows)`] : [];
  // The "none" type's storage lives inside the container itself.
  const hostFiles = type === 'none' && !alive ? [] : dataFiles;

  return (
    <Panel
      title="Volume inspector"
      icon={HardDrive}
      actions={
        <Segmented
          layoutId="vol-type"
          value={type}
          onChange={changeType}
          options={Object.entries(TYPES).map(([value, t]) => ({ value, label: t.label, icon: t.icon }))}
        />
      }
    >
      <div className="grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)]">
        {/* Host side */}
        <div className="rounded-xl border border-white/10 bg-ink-950/50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200">
            {cfg.memory ? <MemoryStick className="h-4 w-4 text-fuchsia-300" /> : <HardDrive className="h-4 w-4 text-slate-400" />}
            Host · {cfg.hostLabel}
          </div>
          {cfg.memory ? (
            <div className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-400/5 p-3 font-mono text-[11px] text-fuchsia-100">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-fuchsia-300">RAM pages (no disk path)</div>
              {alive && initialized ? (
                <div className="grid grid-cols-8 gap-1">
                  {Array.from({ length: 8 + rows.length * 2 }).map((_, i) => (
                    <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-2.5 rounded-sm bg-fuchsia-300/60" />
                  ))}
                </div>
              ) : (
                <div className="text-slate-500">released</div>
              )}
            </div>
          ) : (
            <PathTree path={cfg.hostPath} files={hostFiles} faded={type === 'none' && !alive} />
          )}
          {type === 'volume' && (
            <div className="mt-3 rounded-lg bg-white/[0.03] p-2 font-mono text-[10.5px] leading-4 text-slate-400">
              <div className="mb-1 flex items-center gap-1 text-slate-500"><Search className="h-3 w-3" /> docker volume inspect pgdata</div>
              {'{ "Name": "pgdata", "Driver": "local",'}<br />
              {'  "Mountpoint": "/var/lib/docker/volumes/pgdata/_data" }'}
            </div>
          )}
        </div>

        {/* Mount pipe */}
        <div className="flex items-center justify-center">
          <div className="relative flex h-10 w-full items-center md:h-full md:flex-col md:justify-center">
            <div className={cn('h-1.5 w-full rounded-full md:hidden', alive ? 'flow-pipe' : 'bg-slate-700')} />
            <div className={cn('hidden w-1.5 flex-1 rounded-full md:block', alive ? 'flow-pipe-v' : 'bg-slate-700')} />
            <span className="absolute rounded-md border border-white/10 bg-ink-800 px-1.5 py-0.5 text-center font-mono text-[9px] text-cyan-300">
              {type === 'none' ? 'upper' : type === 'tmpfs' ? 'tmpfs' : 'mount'}
            </span>
          </div>
        </div>

        {/* Container side */}
        <div className="relative rounded-xl border border-white/10 bg-ink-950/50 p-3">
          <AnimatePresence mode="wait">
            {alive ? (
              <motion.div key={`c-${generation}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, rotate: -2 }}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Box className="h-4 w-4 text-cyan-400" /> Container db
                  <span className="font-mono text-[10px] font-normal text-slate-500">#{generation}</span>
                </div>
                <PathTree path={CONTAINER_PATH} files={dataFiles} />
                <div className="mt-3 overflow-hidden rounded-lg border border-white/5">
                  <div className="bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-slate-500">SELECT * FROM users;</div>
                  <div className="max-h-28 overflow-y-auto">
                    <AnimatePresence>
                      {rows.map((r) => (
                        <motion.div key={r.id} initial={{ opacity: 0, backgroundColor: 'rgba(34,211,238,0.25)' }} animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }} className="flex gap-3 border-t border-white/5 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                          <span className="w-4 text-slate-500">{r.id}</span>
                          {r.name}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {!rows.length && <div className="px-2 py-1 font-mono text-[11px] text-slate-600">(0 rows)</div>}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="gone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-full min-h-[160px] place-items-center text-center">
                <div>
                  <Trash2 className="mx-auto h-6 w-6 text-slate-600" />
                  <div className="mt-2 text-xs text-slate-500">Container removed</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button icon={Plus} onClick={insert} disabled={!alive}>Insert row</Button>
        <Button variant="danger" icon={Trash2} onClick={remove} disabled={!alive}>docker rm -f db</Button>
        <Button variant="success" icon={Play} onClick={recreate} disabled={alive}>docker run (new container)</Button>
      </div>

      <div className="mt-3 min-h-[60px] space-y-1 font-mono text-[11px]">
        <AnimatePresence initial={false}>
          {log.map((l) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                l.tone === 'ok' && 'text-emerald-400',
                l.tone === 'err' && 'text-rose-400',
                l.tone === 'warn' && 'text-amber-300',
                l.tone === 'info' && 'text-slate-400',
              )}
            >
              › {l.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
        <div className="overflow-x-auto whitespace-nowrap font-mono text-[11px] text-cyan-200">$ {cfg.flag}</div>
        <p className="mt-2 text-xs leading-5 text-slate-400">{cfg.note}</p>
      </div>
    </Panel>
  );
}
