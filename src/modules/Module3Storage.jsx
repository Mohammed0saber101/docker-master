import ModuleShell from '../components/layout/ModuleShell';
import Lesson from '../components/layout/Lesson';
import Callout from '../components/ui/Callout';
import Terminal from '../components/ui/Terminal';
import CodeBlock from '../components/ui/CodeBlock';
import Panel from '../components/ui/Panel';
import VolumeInspector from '../components/visualizers/VolumeInspector';
import { QUIZZES } from '../data/quizzes';
import { Table2 } from 'lucide-react';

const COMPARISON = [
  ['', 'Named volume', 'Bind mount', 'tmpfs'],
  ['Lives in', '/var/lib/docker/volumes', 'Any host path', 'Host RAM'],
  ['Managed by', 'Docker', 'You', 'Kernel'],
  ['Survives docker rm', 'Yes', 'Yes', 'No'],
  ['Pre-populated from image', 'Yes (if empty)', 'No (hides image files)', 'No'],
  ['Typical use', 'Databases, app state', 'Dev source code, configs', 'Secrets, scratch, caches'],
];

const COMMANDS = [
  { cmd: 'docker volume create pgdata', output: ['pgdata'] },
  {
    cmd: 'docker volume ls',
    output: ['DRIVER    VOLUME NAME', 'local     pgdata', 'local     3b1f0c9e2d7a4f…   ', { text: '# ↑ anonymous volume: probably orphaned by an image VOLUME instruction', tone: 'dim' }],
  },
  {
    cmd: 'docker run -d --name db -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data postgres:16',
    output: [{ text: 'b71d0c3a92e4f8…', tone: 'info' }],
  },
  {
    cmd: 'docker run --rm -v pgdata:/data -v "$(pwd)":/backup alpine tar czf /backup/pgdata.tgz -C /data .',
    output: [{ text: '# Backup: a throwaway container mounts the volume and your cwd, then tars one into the other.', tone: 'dim' }],
  },
  {
    cmd: 'docker volume prune',
    output: [
      { text: 'WARNING! This will remove anonymous local volumes not used by at least one container.', tone: 'warn' },
      'Are you sure you want to continue? [y/N] y',
      'Deleted Volumes:',
      '3b1f0c9e2d7a4f…',
      { text: 'Total reclaimed space: 48.21MB', tone: 'ok' },
    ],
  },
];

const COMPOSE_SNIPPET = `services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/pg_password
    volumes:
      - pgdata:/var/lib/postgresql/data   # named volume = durable state
      - ./initdb:/docker-entrypoint-initdb.d:ro  # bind mount, read-only
    tmpfs:
      - /tmp                              # scratch space in RAM
    secrets: [pg_password]
    stop_grace_period: 30s                # let Postgres checkpoint cleanly

volumes:
  pgdata:

secrets:
  pg_password:
    file: ./secrets/pg_password.txt`;

export default function Module3Storage() {
  return (
    <ModuleShell
      id="storage"
      objectives={[
        'Choose between bind mounts, named volumes and tmpfs',
        'Prove which data survives container deletion',
        'Run a stateful database container safely',
      ]}
      quiz={QUIZZES.storage}
    >
      <Lesson eyebrow="3.1 · The problem" title="Containers are disposable. Data is not." visual={<VolumeInspector />}>
        <p>
          The container layer from Module 2 is deleted together with the container. Production treats containers as
          cattle: they get replaced on every deploy, crash or reschedule. Anything worth keeping has to live
          <strong> outside</strong> the container’s filesystem.
        </p>
        <p>Docker offers three kinds of mounts, plus the implicit option of not mounting anything:</p>
        <ul>
          <li><strong>Named volumes</strong>: storage that Docker creates, names and manages.</li>
          <li><strong>Bind mounts</strong>: an existing host path mapped into the container.</li>
          <li><strong>tmpfs</strong>: an in-memory filesystem that never touches disk.</li>
        </ul>
        <h3>Try the experiment</h3>
        <p>
          For each mount type: insert a few rows, <code>docker rm -f</code> the container, then start a new one. Check
          which runs still have their data.
        </p>
      </Lesson>

      <Lesson
        eyebrow="3.2 · Comparison"
        title="Picking the right mount"
        visual={
          <Panel title="Mount types at a glance" icon={Table2} bodyClass="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row[0] || 'head'} className={i === 0 ? 'bg-white/[0.03] text-slate-200' : 'border-t border-white/5 text-slate-400'}>
                      {row.map((cell, j) => (
                        <td key={j} className={`px-4 py-2.5 ${j === 0 ? 'font-medium text-slate-300' : ''} ${i === 0 ? 'font-semibold' : ''}`}>
                          {cell === 'Yes' ? <span className="text-emerald-400">✓ Yes</span> : cell === 'No' ? <span className="text-rose-400">✗ No</span> : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        }
      >
        <p>
          Prefer the explicit <code>--mount</code> syntax in scripts. It is more verbose than <code>-v</code>, but it
          fails loudly. With <code>-v</code>, a typo in a bind source path silently creates an empty directory
          on the host.
        </p>
        <Callout type="info">
          When an <strong>empty named volume</strong> is mounted over a directory that has files in the image,
          Docker copies those files into the volume first. Bind mounts never do this. They simply hide what was
          there.
        </Callout>
      </Lesson>

      <Lesson
        eyebrow="3.3 · Production"
        title="Stateful containers done right"
        visual={<CodeBlock code={COMPOSE_SNIPPET} language="yaml" title="compose.yaml (database service)" />}
      >
        <ul>
          <li><strong>One named volume per data directory</strong>, declared explicitly. Avoid anonymous volumes.</li>
          <li><strong>Secrets as files</strong> (<code>*_FILE</code> env vars + secrets), never baked into the image.</li>
          <li><strong>Graceful shutdown</strong>: raise <code>stop_grace_period</code> so the DB can flush before SIGKILL.</li>
          <li><strong>Back up the volume, not the container</strong>: use the DB’s native dump tool or a tar sidecar.</li>
          <li><strong>Pin the major version</strong>. On-disk formats change between Postgres majors.</li>
        </ul>
        <Callout type="warn">
          Never let two database containers write to the same volume at once. Most engines assume exclusive access
          and will corrupt data.
        </Callout>
      </Lesson>

      <Lesson eyebrow="3.4 · Hands-on" title="Volume lifecycle commands" visual={<Terminal title="bash — volumes" commands={COMMANDS} />}>
        <p>
          Volumes have their own lifecycle. <code>docker rm</code> leaves them alone unless you add <code>-v</code>.
          Over time, anonymous volumes pile up, and <code>docker volume prune</code> reclaims them.
        </p>
        <p>
          The backup command is a useful pattern: a short-lived <code>alpine</code> container mounts both the
          volume and a host directory, so you can move data with plain shell tools.
        </p>
      </Lesson>
    </ModuleShell>
  );
}
