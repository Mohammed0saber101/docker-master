import ModuleShell from '../components/layout/ModuleShell';
import Lesson from '../components/layout/Lesson';
import Callout from '../components/ui/Callout';
import Terminal from '../components/ui/Terminal';
import CodeBlock from '../components/ui/CodeBlock';
import ComposeEditor from '../components/visualizers/ComposeEditor';
import { QUIZZES } from '../data/quizzes';

const BEFORE = `# Without Compose: imperative, order-dependent, easy to get wrong
docker network create backend
docker network create frontend
docker volume create pgdata
docker run -d --name db --network backend \\
  -v pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=secret postgres:16
docker run -d --name cache --network backend redis:7
docker run -d --name api --network backend -e DATABASE_URL=… my/api
docker network connect frontend api
docker run -d --name proxy --network frontend -p 80:80 nginx`;

const HEALTH = `services:
  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s      # how often to probe
      timeout: 3s       # probe must answer within
      retries: 5        # failures before "unhealthy"
      start_period: 10s # grace period while booting

  api:
    build: ./api
    env_file: .env      # keep config out of the YAML
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://app:\${DB_PASSWORD}@db:5432/app
    depends_on:
      db:
        condition: service_healthy
        restart: true   # restart api if db is restarted
    restart: unless-stopped`;

const COMMANDS = [
  {
    cmd: 'docker compose up -d',
    speed: 140,
    output: [
      '[+] Running 8/8',
      { text: ' ✔ Network app_frontend   Created', tone: 'ok' },
      { text: ' ✔ Network app_backend    Created', tone: 'ok' },
      { text: ' ✔ Volume "app_pgdata"    Created', tone: 'ok' },
      { text: ' ✔ Container app-cache-1  Started', tone: 'ok' },
      { text: ' ✔ Container app-db-1     Healthy', tone: 'ok' },
      { text: ' ✔ Container app-api-1    Started', tone: 'ok' },
      { text: ' ✔ Container app-proxy-1  Started', tone: 'ok' },
    ],
  },
  {
    cmd: 'docker compose ps',
    output: [
      'NAME          IMAGE                SERVICE   STATUS                    PORTS',
      'app-api-1     app-api              api       Up 12 seconds             3000/tcp',
      'app-cache-1   redis:7-alpine       cache     Up 13 seconds             6379/tcp',
      'app-db-1      postgres:16-alpine   db        Up 13 seconds (healthy)   5432/tcp',
      'app-proxy-1   nginx:1.27-alpine    proxy     Up 11 seconds             0.0.0.0:80->80/tcp',
    ],
  },
  {
    cmd: 'docker compose logs -f --tail=3 api',
    output: [
      'api-1  | [db] connected to postgres://db:5432/app',
      'api-1  | [cache] connected to redis://cache:6379',
      { text: 'api-1  | listening on :3000', tone: 'ok' },
    ],
  },
  { cmd: 'docker compose exec db psql -U app -c "select 1"', output: [' ?column? ', '----------', '        1', '(1 row)'] },
  {
    cmd: 'docker compose up -d --scale api=3',
    output: [
      { text: ' ✔ Container app-api-1  Running', tone: 'ok' },
      { text: ' ✔ Container app-api-2  Started', tone: 'ok' },
      { text: ' ✔ Container app-api-3  Started', tone: 'ok' },
      { text: '# nginx can now resolve "api" to three IPs (DNS round-robin).', tone: 'dim' },
    ],
  },
  {
    cmd: 'docker compose down',
    output: [
      ' ✔ Container app-proxy-1  Removed',
      ' ✔ Container app-api-1    Removed',
      ' ✔ Container app-cache-1  Removed',
      ' ✔ Container app-db-1     Removed',
      ' ✔ Network app_frontend   Removed',
      ' ✔ Network app_backend    Removed',
      { text: '# Volumes are kept. Add -v to delete them as well.', tone: 'dim' },
    ],
  },
];

export default function Module5Compose() {
  return (
    <ModuleShell
      id="compose"
      objectives={[
        'Describe a multi-tier stack declaratively in compose.yaml',
        'Control startup order with depends_on conditions and healthchecks',
        'Segment tiers with networks and manage config with env files',
      ]}
      quiz={QUIZZES.compose}
    >
      <Lesson eyebrow="5.1 · Why Compose" title="From shell scripts to a declarative stack" visual={<CodeBlock code={BEFORE} language="bash" title="the hard way" />}>
        <p>
          Real applications are several containers: a reverse proxy, an API, a cache and a database. Wiring them
          together with <code>docker run</code> means a fragile script of networks, volumes, flags and ordering.
        </p>
        <p>
          <strong>Docker Compose</strong> replaces that script with one declarative file. You describe the
          <em> desired</em> services, networks and volumes, and <code>docker compose up</code> creates, updates or
          leaves alone whatever is needed to match.
        </p>
        <ul>
          <li>Every project gets its own networks, and services find each other by <strong>service name</strong>.</li>
          <li>Re-running <code>up</code> only recreates services whose configuration changed.</li>
          <li>The same file works on a laptop and in CI, and can be deployed to Swarm with <code>docker stack deploy</code>.</li>
        </ul>
      </Lesson>

      <Lesson wide eyebrow="5.2 · Playground" title="Edit the YAML, watch the architecture change" visual={<ComposeEditor />}>
        <p>
          This is a live <code>compose.yaml</code> editor. The diagram on the right is built from your YAML on every
          keystroke: columns follow dependency depth, arrows are <code>depends_on</code> edges, and coloured dots show
          network membership. The warnings panel catches common mistakes as you type.
        </p>
        <ul>
          <li>Remove <code>backend</code> from <code>api</code>’s networks and see what the warnings panel says.</li>
          <li>Delete the <code>healthcheck</code> from <code>db</code> and look at the edge from <code>api</code>.</li>
          <li>Load <em>Spot the bugs</em> and fix all four issues.</li>
          <li>Press <strong>Up</strong> to replay the startup sequence in dependency order.</li>
        </ul>
      </Lesson>

      <Lesson eyebrow="5.3 · Readiness" title="depends_on, healthchecks and configuration" visual={<CodeBlock code={HEALTH} language="yaml" title="compose.yaml" />}>
        <p>
          A started container is not the same as a ready application. Postgres takes a few seconds to accept
          connections after its process starts. A plain <code>depends_on: [db]</code> waits only for the container
          to <em>start</em>.
        </p>
        <p>
          Add a <code>healthcheck</code> to the dependency and use <code>condition: service_healthy</code>, and
          Compose holds back the dependent service until the probe passes.
        </p>
        <Callout type="tip">
          Still make your app retry its connections. Healthchecks cover startup, but in production databases
          restart, fail over and drop connections.
        </Callout>
        <h3>Environment and secrets</h3>
        <ul>
          <li><code>.env</code> next to the compose file feeds <code>{'${VARIABLE}'}</code> interpolation.</li>
          <li><code>env_file:</code> injects variables into the container.</li>
          <li>Use <code>secrets:</code> for passwords. They are mounted as files under <code>/run/secrets</code>.</li>
        </ul>
      </Lesson>

      <Lesson eyebrow="5.4 · Hands-on" title="The Compose workflow" visual={<Terminal title="bash — ~/app" commands={COMMANDS} heightClass="h-80" />}>
        <p>
          <code>up</code>, <code>ps</code>, <code>logs</code>, <code>exec</code> and <code>down</code> cover
          most daily work. Note that <code>down</code> keeps named volumes so your data survives. Pass{' '}
          <code>-v</code> only when you really want a clean slate.
        </p>
        <Callout type="info">
          <code>docker compose</code> (v2, a CLI plugin written in Go) replaced the old Python{' '}
          <code>docker-compose</code>. The top-level <code>version:</code> key is now obsolete and can be removed.
        </Callout>
      </Lesson>
    </ModuleShell>
  );
}
