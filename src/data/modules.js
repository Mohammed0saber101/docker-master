import { Cpu, Layers, HardDrive, Network, Workflow, Ship, ShieldCheck } from 'lucide-react';

/** Curriculum metadata. Order here is the order of the course. */
export const MODULES = [
  {
    id: 'foundations',
    num: 1,
    title: 'Foundations & Architecture',
    short: 'Foundations',
    blurb: 'VMs vs containers, namespaces & cgroups, and the dockerd → containerd → runc stack.',
    icon: Cpu,
    minutes: 25,
  },
  {
    id: 'images',
    num: 2,
    title: 'Images, Containers & Builds',
    short: 'Images & Builds',
    blurb: 'Dockerfile anatomy, multi-stage builds, layer caching and the overlay2 union filesystem.',
    icon: Layers,
    minutes: 30,
  },
  {
    id: 'storage',
    num: 3,
    title: 'Storage & Volumes',
    short: 'Storage',
    blurb: 'Bind mounts, named volumes and tmpfs — and how to keep database state alive.',
    icon: HardDrive,
    minutes: 20,
  },
  {
    id: 'networking',
    num: 4,
    title: 'Networking Demystified',
    short: 'Networking',
    blurb: 'Bridge, host, none and overlay drivers, embedded DNS and port publishing.',
    icon: Network,
    minutes: 30,
  },
  {
    id: 'compose',
    num: 5,
    title: 'Orchestration with Compose',
    short: 'Compose',
    blurb: 'Multi-service stacks, depends_on, healthchecks and a live topology editor.',
    icon: Workflow,
    minutes: 25,
  },
  {
    id: 'swarm',
    num: 6,
    title: 'Clustering with Swarm',
    short: 'Swarm',
    blurb: 'Raft consensus, desired vs actual state, rolling updates and the routing mesh.',
    icon: Ship,
    minutes: 30,
  },
  {
    id: 'security',
    num: 7,
    title: 'Security, Optimization & CLI',
    short: 'Security & CLI',
    blurb: 'Non-root, distroless, scanning, .dockerignore and a searchable CLI reference.',
    icon: ShieldCheck,
    minutes: 25,
  },
];

export const moduleById = (id) => MODULES.find((m) => m.id === id);
