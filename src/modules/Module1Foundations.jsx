import ModuleShell from '../components/layout/ModuleShell';
import Lesson from '../components/layout/Lesson';
import Callout from '../components/ui/Callout';
import Terminal from '../components/ui/Terminal';
import VmVsContainer from '../components/visualizers/VmVsContainer';
import NamespacesCgroups from '../components/visualizers/NamespacesCgroups';
import ArchitectureVisualizer from '../components/visualizers/ArchitectureVisualizer';
import { QUIZZES } from '../data/quizzes';

const COMMANDS = [
  {
    cmd: 'docker version --format "{{.Server.Version}}"',
    output: ['27.3.1'],
  },
  {
    cmd: 'docker run -d --name web -p 8080:80 nginx:1.27',
    speed: 160,
    output: [
      { text: "Unable to find image 'nginx:1.27' locally", tone: 'warn' },
      '1.27: Pulling from library/nginx',
      'a2318d6c47ec: Pull complete',
      '095d327c79ae: Pull complete',
      'bbfaa25db775: Pull complete',
      '7bb6fb0cfb2b: Pull complete',
      { text: 'Digest: sha256:28402db69fec7c17e179ea87882667f1e054391138f77ffaf0c3eb388efc3ffb', tone: 'dim' },
      { text: 'Status: Downloaded newer image for nginx:1.27', tone: 'ok' },
      { text: '4f1c2e9a7b3d8e6f0a9c1b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f', tone: 'info' },
    ],
  },
  {
    cmd: 'docker ps',
    output: [
      'CONTAINER ID   IMAGE        COMMAND                  STATUS         PORTS                  NAMES',
      '4f1c2e9a7b3d   nginx:1.27   "/docker-entrypoint.…"   Up 3 seconds   0.0.0.0:8080->80/tcp   web',
    ],
  },
  {
    cmd: 'ps -ef --forest | grep -A2 containerd-shim',
    output: [
      'root  48190     1  0 10:02 ?  00:00:00 /usr/bin/containerd-shim-runc-v2 -namespace moby -id 4f1c2e9a7b3d…',
      'root  48213 48190  0 10:02 ?  00:00:00  \\_ nginx: master process nginx -g daemon off;',
      '101   48262 48213  0 10:02 ?  00:00:00      \\_ nginx: worker process',
      { text: '# nginx is an ordinary host process. Its parent is the shim, not dockerd.', tone: 'dim' },
    ],
  },
  {
    cmd: 'docker exec web ps',
    output: [
      'PID   USER     COMMAND',
      '    1 root     nginx: master process nginx -g daemon off;',
      '   29 nginx    nginx: worker process',
      { text: '# Same process, seen from inside its PID namespace: it is PID 1.', tone: 'dim' },
    ],
  },
  {
    cmd: 'curl -s localhost:8080 | head -n 4',
    output: ['<!DOCTYPE html>', '<html>', '<head>', '<title>Welcome to nginx!</title>'],
  },
];

export default function Module1Foundations() {
  return (
    <ModuleShell
      id="foundations"
      objectives={[
        'Explain why containers are lighter than virtual machines',
        'Name the kernel primitives that create isolation and limits',
        'Trace `docker run` through dockerd, containerd and runc',
      ]}
      quiz={QUIZZES.foundations}
    >
      <Lesson eyebrow="1.1 · Mental model" title="Virtual machines vs containers" visual={<VmVsContainer />}>
        <p>
          A <strong>virtual machine</strong> virtualises hardware. A hypervisor carves a physical machine into
          several fake ones, and each runs a complete guest operating system with its own kernel, init system and
          drivers.
        </p>
        <p>
          A <strong>container</strong> virtualises the operating system. There is no guest kernel: every container
          is a regular process on the host, started with a restricted view of the system. It packages only the
          application and its user-space dependencies.
        </p>
        <ul>
          <li><strong>Density:</strong> dozens of VMs per host vs hundreds or thousands of containers.</li>
          <li><strong>Startup:</strong> a container starts as fast as its process does.</li>
          <li><strong>Trade-off:</strong> all containers share one kernel, so isolation is weaker than a hypervisor boundary.</li>
        </ul>
        <Callout type="info">
          On macOS and Windows, Docker Desktop runs a small Linux VM and your containers run inside it. Containers
          need a Linux kernel (or a Windows kernel for Windows containers).
        </Callout>
      </Lesson>

      <Lesson eyebrow="1.2 · Kernel primitives" title="Namespaces and cgroups" visual={<NamespacesCgroups />}>
        <p>
          A container is not a kernel object. It is a combination of features the Linux kernel has had for years.
        </p>
        <h3>Namespaces: what you can see</h3>
        <p>
          Each namespace gives the process a private copy of one global resource: process IDs, network stack,
          mounts, hostname, IPC and user IDs. Inside its PID namespace, nginx believes it is PID 1.
        </p>
        <h3>Control groups: what you can use</h3>
        <p>
          cgroups meter and cap resources: memory, CPU time, PIDs and block I/O. Docker exposes them as flags like{' '}
          <code>--memory</code>, <code>--cpus</code> and <code>--pids-limit</code>. Exceeding the memory limit
          means the kernel OOM-kills the process. Try it in the simulator.
        </p>
        <Callout type="tip">
          Always set memory limits in production. One leaking container without a limit can starve every other
          workload on the node.
        </Callout>
      </Lesson>

      <Lesson eyebrow="1.3 · Docker Engine" title="dockerd, containerd and runc" visual={<ArchitectureVisualizer />}>
        <p>
          “Docker” is a stack of cooperating components, each with one job. They talk to each other over
          well-defined interfaces.
        </p>
        <ul>
          <li><strong>Docker CLI</strong>: a client that speaks HTTP to the Engine API.</li>
          <li><strong>dockerd</strong>: the daemon behind that API. It handles images, builds, volumes and networks.</li>
          <li><strong>containerd</strong>: an industry-standard runtime daemon that manages container lifecycle and snapshots. Kubernetes uses it too.</li>
          <li><strong>containerd-shim + runc</strong>: runc is the OCI runtime that creates the namespaces and cgroups. The shim keeps the container alive independently of the daemons.</li>
        </ul>
        <p>
          Press <code>docker run nginx</code> and follow the packet. Then switch off a component and run it again to
          see where the request fails.
        </p>
        <Callout type="warn">
          Access to <code>/var/run/docker.sock</code> is equivalent to root on the host. Never mount it into
          untrusted containers.
        </Callout>
      </Lesson>

      <Lesson
        eyebrow="1.4 · Hands-on"
        title="Watch the lifecycle from a shell"
        visual={<Terminal title="bash — docker host" commands={COMMANDS} heightClass="h-80" />}
      >
        <p>
          Run the commands in order. You will pull an image, start a container, and then look at the result from
          both sides of the namespace boundary.
        </p>
        <ul>
          <li><code>docker run</code> pulls the missing layers, then creates and starts the container.</li>
          <li>From the host, <code>ps</code> shows nginx as a normal process parented by <code>containerd-shim-runc-v2</code>.</li>
          <li>From inside, <code>docker exec web ps</code> shows the same process as PID 1.</li>
        </ul>
        <p>
          Every <code>command</code> chip has a copy button. If you have Docker installed, paste them into your own
          terminal.
        </p>
      </Lesson>
    </ModuleShell>
  );
}
