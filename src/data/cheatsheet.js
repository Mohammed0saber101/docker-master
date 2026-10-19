/**
 * Docker CLI reference. `flags` maps each flag token that appears in `cmd`
 * to a one-line explanation (shown by the live flag explainer).
 */
export const CHEATSHEET = [
  // Containers
  { cat: 'Containers', cmd: 'docker run -d --name web -p 8080:80 --restart unless-stopped nginx', desc: 'Create and start a container in the background.',
    flags: { '-d': 'Detached: run in the background and print the container ID.', '--name': 'Give the container a stable name instead of a random one.', '-p': 'Publish HOST:CONTAINER port.', '--restart': 'Restart policy: no | on-failure[:N] | always | unless-stopped.' } },
  { cat: 'Containers', cmd: 'docker run -it --rm alpine sh', desc: 'Throwaway interactive shell, deleted on exit.',
    flags: { '-it': '-i keeps STDIN open, -t allocates a TTY. Together: an interactive terminal.', '--rm': 'Automatically remove the container when it exits.' } },
  { cat: 'Containers', cmd: 'docker run -e NODE_ENV=production --env-file .env app', desc: 'Pass environment variables.',
    flags: { '-e': 'Set one environment variable (KEY=value).', '--env-file': 'Read KEY=value lines from a file.' } },
  { cat: 'Containers', cmd: 'docker run --memory=512m --cpus=1.5 --pids-limit=200 app', desc: 'Apply cgroup resource limits.',
    flags: { '--memory': 'Hard memory limit. Exceeding it triggers the OOM killer (exit 137).', '--cpus': 'CPU quota as a number of cores (fractional allowed).', '--pids-limit': 'Max processes. Stops fork bombs.' } },
  { cat: 'Containers', cmd: 'docker ps -a --filter status=exited', desc: 'List containers, including stopped ones.',
    flags: { '-a': 'Show all containers, not only running ones.', '--filter': 'Filter by status, name, label, ancestor, network…' } },
  { cat: 'Containers', cmd: 'docker exec -it web sh', desc: 'Open a shell inside a running container.',
    flags: { '-it': 'Interactive TTY so you can type commands.' } },
  { cat: 'Containers', cmd: 'docker logs -f --tail 100 --since 10m web', desc: 'Stream a container’s stdout/stderr.',
    flags: { '-f': 'Follow: keep streaming new log lines.', '--tail': 'Start with only the last N lines.', '--since': 'Only logs newer than a duration or timestamp.' } },
  { cat: 'Containers', cmd: 'docker stop -t 30 web', desc: 'Graceful stop: SIGTERM, then SIGKILL after the timeout.',
    flags: { '-t': 'Seconds to wait for graceful shutdown before SIGKILL (default 10).' } },
  { cat: 'Containers', cmd: 'docker rm -f -v web', desc: 'Remove a container (force-stopping it if needed).',
    flags: { '-f': 'Force: kill the container if it is running.', '-v': 'Also remove anonymous volumes attached to it.' } },
  { cat: 'Containers', cmd: 'docker inspect --format "{{.State.Status}}" web', desc: 'Low-level JSON details, optionally templated.',
    flags: { '--format': 'Go template applied to the JSON, e.g. {{.NetworkSettings.IPAddress}}.' } },
  { cat: 'Containers', cmd: 'docker stats --no-stream', desc: 'Live CPU / memory / network / IO usage per container.',
    flags: { '--no-stream': 'Print one snapshot instead of updating continuously.' } },
  { cat: 'Containers', cmd: 'docker cp web:/etc/nginx/nginx.conf ./nginx.conf', desc: 'Copy files between a container and the host.', flags: {} },

  // Images
  { cat: 'Images', cmd: 'docker pull --platform linux/arm64 nginx:1.27', desc: 'Download an image from a registry.',
    flags: { '--platform': 'Pick a specific OS/architecture from a multi-arch image.' } },
  { cat: 'Images', cmd: 'docker images --filter dangling=true', desc: 'List local images.',
    flags: { '--filter': 'dangling=true shows untagged <none> images left by rebuilds.' } },
  { cat: 'Images', cmd: 'docker tag app:latest registry.example.com/team/app:1.4.2', desc: 'Add another name (reference) to an image.', flags: {} },
  { cat: 'Images', cmd: 'docker push registry.example.com/team/app:1.4.2', desc: 'Upload an image to a registry.', flags: {} },
  { cat: 'Images', cmd: 'docker history --no-trunc app:1.0', desc: 'Show the instruction and size behind each layer.',
    flags: { '--no-trunc': 'Do not truncate the CREATED BY column.' } },
  { cat: 'Images', cmd: 'docker rmi -f app:old', desc: 'Remove an image.',
    flags: { '-f': 'Force removal even if tagged multiple times.' } },
  { cat: 'Images', cmd: 'docker save -o app.tar app:1.0', desc: 'Export an image to a tarball (air-gapped transfer).',
    flags: { '-o': 'Write to a file instead of STDOUT.' } },

  // Build
  { cat: 'Build', cmd: 'docker build -t app:1.0 -f Dockerfile.prod .', desc: 'Build an image from a Dockerfile and context.',
    flags: { '-t': 'Name and optionally tag the image (name:tag).', '-f': 'Path to the Dockerfile if not ./Dockerfile.', '.': 'The build context: files the builder can COPY.' } },
  { cat: 'Build', cmd: 'docker build --no-cache --pull -t app .', desc: 'Rebuild from scratch with fresh base images.',
    flags: { '--no-cache': 'Ignore the layer cache for every step.', '--pull': 'Always check the registry for a newer base image.' } },
  { cat: 'Build', cmd: 'docker build --build-arg VERSION=1.4.2 --target runtime -t app .', desc: 'Pass build args and pick a stage.',
    flags: { '--build-arg': 'Set an ARG value. Not for secrets: visible in history.', '--target': 'Stop at a named stage of a multi-stage build.' } },
  { cat: 'Build', cmd: 'docker build --secret id=npmrc,src=$HOME/.npmrc -t app .', desc: 'Mount a secret into RUN without baking it in.',
    flags: { '--secret': 'Expose a file to RUN --mount=type=secret,id=… for that step only.' } },
  { cat: 'Build', cmd: 'docker buildx build --platform linux/amd64,linux/arm64 -t org/app:1.0 --push .', desc: 'Multi-architecture build and push.',
    flags: { '--platform': 'Build for several architectures (QEMU or native builders).', '-t': 'Image reference.', '--push': 'Push the resulting manifest list to the registry.' } },

  // Volumes
  { cat: 'Volumes', cmd: 'docker volume create pgdata', desc: 'Create a named volume.', flags: {} },
  { cat: 'Volumes', cmd: 'docker run -v pgdata:/var/lib/postgresql/data postgres:16', desc: 'Mount a named volume.',
    flags: { '-v': 'NAME:CONTAINER_PATH[:ro] for volumes, /HOST/PATH:CONTAINER_PATH for binds.' } },
  { cat: 'Volumes', cmd: 'docker run --mount type=bind,src=$(pwd),dst=/app,readonly node:20', desc: 'Explicit bind mount (fails if src is missing).',
    flags: { '--mount': 'Verbose key=value mount syntax: type, src, dst, readonly…' } },
  { cat: 'Volumes', cmd: 'docker run --tmpfs /tmp:size=64m app', desc: 'In-memory mount.',
    flags: { '--tmpfs': 'Mount a RAM-backed filesystem at the path.' } },
  { cat: 'Volumes', cmd: 'docker volume prune -a', desc: 'Delete unused volumes. Careful!',
    flags: { '-a': 'Include named volumes, not only anonymous ones.' } },

  // Networks
  { cat: 'Networks', cmd: 'docker network create --driver bridge --subnet 10.10.0.0/24 app-net', desc: 'Create a user-defined network.',
    flags: { '--driver': 'bridge (default), overlay, macvlan, ipvlan, none…', '--subnet': 'Choose the IP range instead of an automatic one.' } },
  { cat: 'Networks', cmd: 'docker network connect --alias db app-net pg', desc: 'Attach a running container to a network.',
    flags: { '--alias': 'Extra DNS name for the container on that network.' } },
  { cat: 'Networks', cmd: 'docker run --network host nginx', desc: 'Share the host network stack.',
    flags: { '--network': 'bridge | host | none | <network-name> | container:<id>.' } },
  { cat: 'Networks', cmd: 'docker network inspect app-net', desc: 'Show subnet, gateway and attached containers.', flags: {} },

  // Compose
  { cat: 'Compose', cmd: 'docker compose up -d --build', desc: 'Create/update the whole stack.',
    flags: { '-d': 'Run in the background.', '--build': 'Rebuild images before starting.' } },
  { cat: 'Compose', cmd: 'docker compose logs -f api', desc: 'Follow logs for one service.', flags: { '-f': 'Follow output.' } },
  { cat: 'Compose', cmd: 'docker compose exec db psql -U app', desc: 'Run a command in a service container.', flags: {} },
  { cat: 'Compose', cmd: 'docker compose down -v --remove-orphans', desc: 'Stop and remove the stack.',
    flags: { '-v': 'Also delete named volumes declared in the file. Destroys data!', '--remove-orphans': 'Remove containers for services no longer in the file.' } },
  { cat: 'Compose', cmd: 'docker compose config', desc: 'Validate and print the fully resolved file.', flags: {} },
  { cat: 'Compose', cmd: 'docker compose watch', desc: 'Sync/rebuild services on file changes (develop.watch).', flags: {} },

  // Swarm
  { cat: 'Swarm', cmd: 'docker swarm init --advertise-addr 192.168.1.10', desc: 'Turn this node into a swarm manager.',
    flags: { '--advertise-addr': 'IP other nodes use to reach this manager.' } },
  { cat: 'Swarm', cmd: 'docker service create --name web --replicas 3 -p 8080:80 nginx', desc: 'Create a replicated service.',
    flags: { '--name': 'Service name.', '--replicas': 'Desired number of tasks.', '-p': 'Publish on the ingress routing mesh.' } },
  { cat: 'Swarm', cmd: 'docker service update --image nginx:1.27 --update-parallelism 2 --update-delay 10s web', desc: 'Rolling update.',
    flags: { '--image': 'New image for the service.', '--update-parallelism': 'Tasks updated simultaneously.', '--update-delay': 'Pause between batches.' } },
  { cat: 'Swarm', cmd: 'docker service scale web=6', desc: 'Change the desired replica count.', flags: {} },
  { cat: 'Swarm', cmd: 'docker node update --availability drain worker-2', desc: 'Move all tasks off a node for maintenance.',
    flags: { '--availability': 'active | pause | drain.' } },
  { cat: 'Swarm', cmd: 'docker stack deploy -c compose.yaml shop', desc: 'Deploy a Compose file as a stack.',
    flags: { '-c': 'Compose file to deploy.' } },

  // System & Security
  { cat: 'System', cmd: 'docker system df -v', desc: 'Disk usage by images, containers, volumes and build cache.',
    flags: { '-v': 'Verbose per-object breakdown.' } },
  { cat: 'System', cmd: 'docker system prune -a --volumes', desc: 'Reclaim space: remove everything unused.',
    flags: { '-a': 'Remove all unused images, not just dangling ones.', '--volumes': 'Also remove unused volumes.' } },
  { cat: 'System', cmd: 'docker context use remote-prod', desc: 'Point the CLI at another Docker engine.', flags: {} },
  { cat: 'System', cmd: 'docker scout cves --only-severity critical,high app:1.0', desc: 'List known vulnerabilities in an image.',
    flags: { '--only-severity': 'Filter by CVE severity.' } },
  { cat: 'System', cmd: 'docker run --read-only --cap-drop=ALL --security-opt=no-new-privileges app', desc: 'Hardened runtime defaults.',
    flags: { '--read-only': 'Mount the container rootfs read-only.', '--cap-drop': 'Drop Linux capabilities (ALL, then --cap-add only what is needed).', '--security-opt': 'no-new-privileges blocks setuid privilege escalation.' } },
];

export const CATEGORIES = ['All', ...new Set(CHEATSHEET.map((c) => c.cat))];
