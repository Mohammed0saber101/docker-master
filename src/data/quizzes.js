/** Knowledge checks, one array per module id. `answer` is the index of the correct option. */
export const QUIZZES = {
  foundations: [
    {
      q: 'Why does a container start in milliseconds while a VM takes much longer?',
      options: [
        'Containers use a faster hypervisor',
        'A container is a process on the already-running host kernel, so there is no guest OS to boot',
        'Container images are compressed more efficiently',
        'Docker pre-boots containers in the background',
      ],
      answer: 1,
      explain: 'A container is just a host process with namespaces and cgroups applied. There is no BIOS, no guest kernel and no init system to boot.',
    },
    {
      q: 'Which kernel feature limits how much memory a container may use?',
      options: ['Namespaces', 'cgroups', 'seccomp', 'overlayfs'],
      answer: 1,
      explain: 'Namespaces control what a process can see; cgroups control what it can use (memory, CPU, PIDs, I/O). Exceeding the memory limit triggers the OOM killer (exit code 137).',
    },
    {
      q: 'Which component actually creates the namespaces and execs the container process?',
      options: ['The Docker CLI', 'dockerd', 'containerd', 'runc'],
      answer: 3,
      explain: 'runc is the low-level OCI runtime. containerd (via the shim) invokes it; runc sets up the sandbox, starts the process, and exits.',
    },
    {
      q: 'If dockerd restarts, what keeps running containers alive?',
      options: [
        'Nothing; all containers stop',
        'The containerd-shim process, which stays as the container’s parent',
        'The Docker CLI',
        'systemd restarts them instantly',
      ],
      answer: 1,
      explain: 'The shim decouples the container from the daemons. With live-restore enabled, dockerd can even be upgraded while containers keep running.',
    },
  ],
  images: [
    {
      q: 'You edit only application source code. Which Dockerfile ordering gives the best cache reuse?',
      options: [
        'COPY . . → RUN npm ci',
        'COPY package*.json ./ → RUN npm ci → COPY . .',
        'RUN npm ci → COPY package*.json ./',
        'Order does not matter with BuildKit',
      ],
      answer: 1,
      explain: 'Copy the dependency manifest first and install, then copy source. Source edits only invalidate the final COPY, so the expensive install layer stays cached.',
    },
    {
      q: 'Given ENTRYPOINT ["python", "app.py"] and CMD ["--port", "8000"], what does `docker run img --port 9000` execute?',
      options: ['python app.py --port 8000', 'python app.py --port 9000', '--port 9000', 'python app.py --port 8000 --port 9000'],
      answer: 1,
      explain: 'Arguments after the image name replace CMD, and CMD is appended to ENTRYPOINT. Result: python app.py --port 9000.',
    },
    {
      q: 'A running container modifies a file that came from a lower image layer. What happens?',
      options: [
        'The image layer is modified in place',
        'The write fails because layers are read-only',
        'The file is copied up into the writable container layer and modified there',
        'Docker creates a new image layer automatically',
      ],
      answer: 2,
      explain: 'overlay2 performs copy-on-write: the file is copied to the upperdir (container layer) on first write. The image layers stay untouched and shared.',
    },
    {
      q: 'What is the main benefit of a multi-stage build?',
      options: [
        'Builds run in parallel on multiple hosts',
        'The final image contains only runtime artifacts, not compilers and build tooling',
        'It enables layer caching',
        'It encrypts the image',
      ],
      answer: 1,
      explain: 'Build in a fat stage, then COPY --from=build only what you need into a minimal runtime stage: smaller images, smaller attack surface.',
    },
  ],
  storage: [
    {
      q: 'Where does a named volume called `pgdata` live on a Linux host by default?',
      options: ['/home/<user>/pgdata', '/var/lib/docker/volumes/pgdata/_data', '/tmp/docker/pgdata', 'Inside the image'],
      answer: 1,
      explain: 'Docker manages named volumes under /var/lib/docker/volumes/<name>/_data. You refer to them by name, not by path.',
    },
    {
      q: 'You run Postgres with no mount and then `docker rm` the container. What happens to the data?',
      options: ['It is kept in a volume automatically', 'It is lost with the container’s writable layer', 'It is pushed to the registry', 'It moves to /var/lib/docker/volumes'],
      answer: 1,
      explain: 'Without a mount, writes go to the container layer, which is deleted with the container. (The official postgres image does declare a VOLUME, so Docker creates an anonymous volume, but it is orphaned and easy to lose.)',
    },
    {
      q: 'Which mount type keeps data only in memory and never writes it to disk?',
      options: ['Bind mount', 'Named volume', 'tmpfs', 'overlay2'],
      answer: 2,
      explain: 'tmpfs mounts live in host RAM. Ideal for secrets or scratch data; everything is gone when the container stops.',
    },
  ],
  networking: [
    {
      q: 'Two containers on the default bridge network try `ping db`. Why does it fail?',
      options: [
        'ICMP is blocked by Docker',
        'The default bridge has no embedded DNS for container names',
        'Containers cannot talk on the same host',
        'Ping is not installed',
      ],
      answer: 1,
      explain: 'Automatic name resolution (embedded DNS at 127.0.0.11) is only available on user-defined networks. On the default bridge you must use IPs or legacy --link.',
    },
    {
      q: 'What does `-p 8080:80` configure?',
      options: [
        'Container port 8080 → host port 80',
        'Host port 8080 forwards to container port 80 (iptables DNAT / docker-proxy)',
        'Opens port 80 and 8080 on the container',
        'Exposes port 8080 to other containers only',
      ],
      answer: 1,
      explain: 'Format is HOST:CONTAINER. Docker adds a DNAT rule so traffic hitting the host on 8080 is rewritten to the container IP on port 80.',
    },
    {
      q: 'Which driver lets containers on different hosts share one L2-like network?',
      options: ['bridge', 'host', 'none', 'overlay'],
      answer: 3,
      explain: 'Overlay networks encapsulate container traffic in VXLAN (UDP 4789) over the hosts’ underlay network, typically within a Swarm.',
    },
    {
      q: 'With `--network host`, what happens to `-p 8080:80`?',
      options: ['It still applies', 'It is ignored; the process binds directly on the host’s interfaces', 'Docker fails to start', 'It maps to port 8080 only'],
      answer: 1,
      explain: 'Host networking removes the network namespace, so there is no NAT and nothing to map. The app’s port is the host’s port.',
    },
  ],
  compose: [
    {
      q: 'What does `depends_on: { db: { condition: service_healthy } }` guarantee?',
      options: [
        'db starts after the dependent service',
        'The dependent service is created only after db’s healthcheck reports healthy',
        'db is restarted if unhealthy',
        'Nothing; depends_on is ignored by Compose v2',
      ],
      answer: 1,
      explain: 'With service_healthy, Compose waits for the dependency’s healthcheck to pass. A plain list only waits for the container to start, not for the app inside to be ready.',
    },
    {
      q: 'In a Compose project, how does the `api` service reach Postgres?',
      options: ['localhost:5432', 'db:5432 (service name via embedded DNS)', 'The host IP', '172.17.0.1:5432'],
      answer: 1,
      explain: 'Compose creates a user-defined network per project; each service is resolvable by its service name.',
    },
    {
      q: 'Two services share no network. What happens when one calls the other?',
      options: ['Compose routes it automatically', 'Name resolution fails: they are isolated', 'It works via the default bridge', 'It falls back to host networking'],
      answer: 1,
      explain: 'Network membership defines reachability. Put a service on multiple networks (like an API on frontend + backend) to bridge tiers deliberately.',
    },
  ],
  swarm: [
    {
      q: 'A Swarm has 5 managers. How many manager failures can it tolerate while keeping quorum?',
      options: ['1', '2', '3', '4'],
      answer: 1,
      explain: 'Quorum is ⌊N/2⌋+1 = 3. You can lose (N−1)/2 = 2 managers. That’s why odd manager counts (3, 5, 7) are recommended.',
    },
    {
      q: 'What happens when a Swarm cluster loses quorum?',
      options: [
        'All containers stop immediately',
        'Running tasks continue, but no management changes (deploys, scaling, rescheduling) can be made',
        'Workers elect a new manager',
        'The cluster switches to standalone mode',
      ],
      answer: 1,
      explain: 'Without quorum the Raft log cannot commit. Existing tasks keep running, but the control plane is frozen until quorum is restored.',
    },
    {
      q: 'A worker node dies. What does the orchestrator do?',
      options: [
        'Nothing until an admin intervenes',
        'Detects that actual state < desired state and schedules replacement tasks on healthy nodes',
        'Restarts the dead node',
        'Scales the service down',
      ],
      answer: 1,
      explain: 'Swarm is declarative: it continuously reconciles actual state toward the desired replica count.',
    },
    {
      q: 'With the ingress routing mesh, which node can receive traffic for a published port?',
      options: ['Only managers', 'Only nodes running a task of that service', 'Any node in the swarm', 'Only the leader'],
      answer: 2,
      explain: 'Every node listens on the published port; IPVS load-balances the request to a healthy task, wherever it runs.',
    },
  ],
  security: [
    {
      q: 'Why should containers run as a non-root USER?',
      options: [
        'It makes images smaller',
        'A process escape or file-write bug is far less damaging without UID 0',
        'Root is not allowed in Docker',
        'It speeds up builds',
      ],
      answer: 1,
      explain: 'Root in a container is root on the host kernel (absent user namespaces). Dropping to an unprivileged UID limits blast radius.',
    },
    {
      q: 'Why is `ENV API_KEY=...` in a Dockerfile dangerous?',
      options: [
        'ENV is slow',
        'The value is stored in image metadata/history and visible to anyone who can pull the image',
        'Docker rejects keys in ENV',
        'It only works at runtime',
      ],
      answer: 1,
      explain: 'Use BuildKit secret mounts (RUN --mount=type=secret) at build time and orchestrator secrets / env injection at runtime.',
    },
    {
      q: 'What is the primary purpose of `.dockerignore`?',
      options: [
        'Ignore files at runtime',
        'Exclude files from the build context sent to the builder (faster builds, no leaked secrets)',
        'Stop Docker from caching layers',
        'Hide containers from docker ps',
      ],
      answer: 1,
      explain: 'Excluding .git, node_modules, .env etc. shrinks the context, keeps the COPY . . cache stable and prevents secrets ending up in layers.',
    },
  ],
};
