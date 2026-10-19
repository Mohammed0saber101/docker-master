import ModuleShell from '../components/layout/ModuleShell';
import Lesson from '../components/layout/Lesson';
import Callout from '../components/ui/Callout';
import Terminal from '../components/ui/Terminal';
import NetworkDrivers from '../components/visualizers/NetworkDrivers';
import NetworkSandbox from '../components/visualizers/NetworkSandbox';
import PortMapping from '../components/visualizers/PortMapping';
import { QUIZZES } from '../data/quizzes';

const COMMANDS = [
  {
    cmd: 'docker network ls',
    output: [
      'NETWORK ID     NAME      DRIVER    SCOPE',
      '5c2a1f0e8b3d   bridge    bridge    local',
      '8e1f7a2c4d6b   host      host      local',
      'b3d9c0e1f2a4   none      null      local',
    ],
  },
  { cmd: 'docker network create app-net', output: [{ text: '7f3e9a1c2b4d…', tone: 'info' }] },
  {
    cmd: 'docker run -d --name db --network app-net -e POSTGRES_PASSWORD=x postgres:16',
    output: [{ text: 'a81c0e2f9d…', tone: 'info' }],
  },
  {
    cmd: 'docker run --rm --network app-net alpine nslookup db',
    output: ['Server:    127.0.0.11', 'Address:   127.0.0.11:53', '', 'Non-authoritative answer:', 'Name:   db', { text: 'Address: 172.18.0.2', tone: 'ok' }],
  },
  { cmd: 'docker network connect app-net legacy-api', output: [{ text: '# A running container can join extra networks without a restart.', tone: 'dim' }] },
  {
    cmd: 'docker network inspect app-net --format "{{range .Containers}}{{.Name}} {{.IPv4Address}}\\n{{end}}"',
    output: ['db 172.18.0.2/16', 'legacy-api 172.18.0.3/16'],
  },
  {
    cmd: 'docker port web',
    output: ['80/tcp -> 0.0.0.0:8080', '80/tcp -> [::]:8080'],
  },
];

export default function Module4Networking() {
  return (
    <ModuleShell
      id="networking"
      objectives={[
        'Choose between bridge, host, none and overlay drivers',
        'Use user-defined networks for DNS-based service discovery',
        'Trace a published port from the host NIC to the container process',
      ]}
      quiz={QUIZZES.networking}
    >
      <Lesson eyebrow="4.1 · Drivers" title="Four ways to wire a container" visual={<NetworkDrivers />}>
        <p>
          Every container gets a network namespace. The <strong>driver</strong> decides what is inside it and how
          it connects to the world. Built-in drivers cover nearly every case:
        </p>
        <ul>
          <li><strong>bridge</strong>: a private virtual switch on one host. This is the default.</li>
          <li><strong>host</strong>: no isolation. The container uses the host’s network stack.</li>
          <li><strong>none</strong>: loopback only, nothing else.</li>
          <li><strong>overlay</strong>: one virtual network spanning several Docker hosts using VXLAN.</li>
        </ul>
        <p>
          A <code>veth</code> pair works like a virtual patch cable. One end is the container’s <code>eth0</code>
          and the other end plugs into the bridge on the host.
        </p>
      </Lesson>

      <Lesson
        wide
        eyebrow="4.2 · Sandbox"
        title="Default bridge vs user-defined bridge"
        visual={<NetworkSandbox />}
      >
        <p>
          This is one of Docker’s most common gotchas. On a <strong>user-defined</strong> bridge, Docker runs an
          embedded DNS server at <code>127.0.0.11</code>, so containers find each other by name. The{' '}
          <strong>default</strong> <code>bridge</code> network has no such resolver.
        </p>
        <ul>
          <li>Ping <code>db</code> from <code>web</code> by name. It fails because <code>db</code> is on a different network.</li>
          <li>Drag <code>db</code> into <em>app-net</em> and ping again. You will see the DNS lookup, then the round trip.</li>
          <li>Try pinging by IP across the two bridges. They are isolated from each other by design.</li>
          <li>Drop a container into the top strip to detach it (<code>--network none</code>).</li>
        </ul>
      </Lesson>

      <Lesson eyebrow="4.3 · Publishing" title="How -p really works" visual={<PortMapping />}>
        <p>
          A container’s IP (e.g. <code>172.17.0.2</code>) is only reachable from the host. To accept outside
          traffic you <strong>publish</strong> a port, and Docker programs the kernel to forward it:
        </p>
        <ul>
          <li><strong>iptables DNAT</strong> rewrites packets arriving on <code>HOST:8080</code> to <code>CONTAINER_IP:80</code>.</li>
          <li><strong>docker-proxy</strong>, a small userland process, handles loopback traffic that never passes through PREROUTING.</li>
          <li>The packet then crosses <code>docker0</code> and the veth pair into the container’s <code>eth0</code>.</li>
        </ul>
        <Callout type="warn">
          Published ports are inserted <em>before</em> most host firewall rules. On a public server,{' '}
          <code>-p 5432:5432</code> exposes your database to the internet even with UFW enabled. Bind sensitive
          ports to <code>127.0.0.1</code> or keep them on internal networks.
        </Callout>
        <Callout type="info">
          <code>EXPOSE</code> in a Dockerfile publishes nothing. It is documentation, and it is used by{' '}
          <code>-P</code> (capital P) to publish all exposed ports to random host ports.
        </Callout>
      </Lesson>

      <Lesson eyebrow="4.4 · Hands-on" title="Network commands" visual={<Terminal title="bash — networking" commands={COMMANDS} heightClass="h-80" />}>
        <p>
          Create a network, attach containers to it, and confirm that <code>nslookup</code> answers from{' '}
          <code>127.0.0.11</code>. A container can belong to several networks. Connecting it to more than one is
          how you deliberately bridge tiers, such as an API that is on both <code>frontend</code> and{' '}
          <code>backend</code>.
        </p>
      </Lesson>
    </ModuleShell>
  );
}
