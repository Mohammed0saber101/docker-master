import ModuleShell from '../components/layout/ModuleShell';
import Lesson from '../components/layout/Lesson';
import Callout from '../components/ui/Callout';
import Terminal from '../components/ui/Terminal';
import CodeBlock from '../components/ui/CodeBlock';
import RaftCluster from '../components/visualizers/RaftCluster';
import SwarmScheduler from '../components/visualizers/SwarmScheduler';
import { QUIZZES } from '../data/quizzes';

const COMMANDS = [
  {
    cmd: 'docker swarm init --advertise-addr 192.168.1.10',
    output: [
      'Swarm initialized: current node (k3j2h1…) is now a manager.',
      '',
      'To add a worker to this swarm, run the following command:',
      { text: '    docker swarm join --token SWMTKN-1-49nj1cmql0jkz5s954yi3oex3nedyz0fb0xx14ie39trti4wxv-8vxv8rssmk743ojnwacrr2e7c 192.168.1.10:2377', tone: 'info' },
    ],
  },
  {
    cmd: 'docker node ls',
    output: [
      'ID          HOSTNAME   STATUS  AVAILABILITY  MANAGER STATUS',
      'k3j2h1… *   mgr-1      Ready   Active        Leader',
      'p9a8s7…     mgr-2      Ready   Active        Reachable',
      'z1x2c3…     mgr-3      Ready   Active        Reachable',
      'q4w5e6…     worker-1   Ready   Active',
      'r7t8y9…     worker-2   Ready   Active',
    ],
  },
  {
    cmd: 'docker service create --name web --replicas 4 -p 8080:80 --update-parallelism 1 --update-delay 10s nginx:1.26',
    speed: 150,
    output: [
      'ozr1ze4mw0w5nvkp1vbf2jl1t',
      'overall progress: 4 out of 4 tasks',
      '1/4: running   [==================================================>]',
      '2/4: running   [==================================================>]',
      '3/4: running   [==================================================>]',
      '4/4: running   [==================================================>]',
      { text: 'verify: Service converged', tone: 'ok' },
    ],
  },
  {
    cmd: 'docker service ps web',
    output: [
      'NAME    IMAGE        NODE       DESIRED STATE  CURRENT STATE',
      'web.1   nginx:1.26   worker-1   Running        Running 1 minute ago',
      'web.2   nginx:1.26   worker-2   Running        Running 1 minute ago',
      'web.3   nginx:1.26   mgr-2      Running        Running 1 minute ago',
      'web.4   nginx:1.26   worker-1   Running        Running 1 minute ago',
    ],
  },
  {
    cmd: 'docker service update --image nginx:1.27 web',
    speed: 220,
    output: [
      'web',
      'overall progress: 4 out of 4 tasks',
      '1/4: running   [==================================================>]',
      '2/4: running   [==================================================>]',
      '3/4: running   [==================================================>]',
      '4/4: running   [==================================================>]',
      { text: 'verify: Service converged', tone: 'ok' },
    ],
  },
  { cmd: 'docker service rollback web', output: ['web', 'rollback: manually requested rollback', { text: 'verify: Service converged', tone: 'ok' }] },
  {
    cmd: 'docker stack deploy -c compose.yaml shop',
    output: ['Creating network shop_backend', 'Creating service shop_db', 'Creating service shop_api', 'Creating service shop_proxy'],
  },
];

const STACK = `services:
  api:
    image: registry.example.com/shop/api:1.4.2
    deploy:
      replicas: 6
      placement:
        constraints: [node.role == worker]
        max_replicas_per_node: 2
      resources:
        limits: { cpus: "1.0", memory: 512M }
      update_config:
        parallelism: 2
        delay: 10s
        order: start-first        # new task up before old one stops
        failure_action: rollback
      restart_policy:
        condition: on-failure
    networks: [backend]

networks:
  backend:
    driver: overlay`;

export default function Module6Swarm() {
  return (
    <ModuleShell
      id="swarm"
      objectives={[
        'Size a highly available manager quorum with Raft',
        'Reason about services, tasks, and desired vs actual state',
        'Run zero-downtime rolling updates behind the routing mesh',
      ]}
      quiz={QUIZZES.swarm}
    >
      <Lesson eyebrow="6.1 · Control plane" title="Managers, workers and Raft" visual={<RaftCluster />}>
        <p>
          A Swarm is a set of Docker hosts working as one. <strong>Managers</strong> hold the cluster state and
          make scheduling decisions. <strong>Workers</strong> only run tasks. By default, managers run workloads
          too.
        </p>
        <p>
          Managers keep a replicated log using the <strong>Raft consensus algorithm</strong>. One manager is the
          <em> leader</em>. A change such as “scale web to 6” is committed only after a <em>majority</em> (quorum)
          of managers has stored it.
        </p>
        <ul>
          <li>Quorum is ⌊N/2⌋ + 1, so N managers survive ⌊(N−1)/2⌋ failures.</li>
          <li>Use an odd number: 3 or 5 (7 at most). Adding a 4th manager adds no fault tolerance over 3.</li>
          <li>Spread managers across failure domains such as availability zones and racks.</li>
        </ul>
        <Callout type="warn">
          Without quorum the control plane freezes. Running containers keep serving traffic, but nothing can be
          deployed, scaled or rescheduled until a majority returns.
        </Callout>
      </Lesson>

      <Lesson wide eyebrow="6.2 · Data plane" title="Desired state, rolling updates and the routing mesh" visual={<SwarmScheduler />}>
        <p>
          You do not start containers in Swarm. You declare a <strong>service</strong>: an image, a replica count and
          an update policy. The orchestrator breaks it into <strong>tasks</strong> (one container each) and keeps
          reconciling <em>actual</em> state toward <em>desired</em> state, indefinitely.
        </p>
        <ul>
          <li><strong>Self-healing:</strong> kill a worker. Its tasks fail and get rescheduled on healthy nodes.</li>
          <li><strong>Rolling update:</strong> tasks are replaced <code>parallelism</code> at a time, so capacity never drops to zero.</li>
          <li><strong>Routing mesh:</strong> every node listens on published port 8080, and IPVS forwards each request to a running task anywhere in the cluster.</li>
        </ul>
      </Lesson>

      <Lesson eyebrow="6.3 · Production config" title="Stacks: Compose files for the cluster" visual={<CodeBlock code={STACK} language="yaml" title="stack.yaml" />}>
        <p>
          <code>docker stack deploy</code> takes a Compose file and turns each service into a Swarm service. The{' '}
          <code>deploy:</code> section, which plain Compose mostly ignores, controls placement, resources and update
          behaviour.
        </p>
        <ul>
          <li><code>order: start-first</code> gives zero-downtime deploys: the new task becomes healthy before the old one stops.</li>
          <li><code>failure_action: rollback</code> reverts automatically if new tasks keep failing.</li>
          <li><strong>Placement constraints</strong> pin workloads to node roles, labels or zones.</li>
        </ul>
        <Callout type="info">
          Swarm is built into Docker and simple to operate. Kubernetes uses the same ideas (desired state,
          reconciliation, rolling updates) at a larger scope, with a much bigger ecosystem.
        </Callout>
      </Lesson>

      <Lesson eyebrow="6.4 · Hands-on" title="Swarm from the CLI" visual={<Terminal title="bash — mgr-1" commands={COMMANDS} heightClass="h-80" />}>
        <p>
          Initialise a swarm, join nodes with the printed token, then create and update a service. Required ports
          between nodes: <code>2377/tcp</code> (cluster management), <code>7946/tcp+udp</code> (gossip) and{' '}
          <code>4789/udp</code> (overlay VXLAN).
        </p>
      </Lesson>
    </ModuleShell>
  );
}
