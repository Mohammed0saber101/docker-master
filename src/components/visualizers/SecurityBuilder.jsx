import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Bug, HardDrive, CheckSquare, Square } from 'lucide-react';
import Panel from '../ui/Panel';
import CodeBlock from '../ui/CodeBlock';
import { cn } from '../../lib/cn';

/**
 * Hardening workbench: toggle practices and watch the generated Dockerfile,
 * run command, image size, CVE count and score update. The numbers are
 * representative of a typical Node.js service, not measurements.
 */
const PRACTICES = [
  { id: 'slim', label: 'Minimal base (alpine / distroless)', why: 'Fewer packages mean fewer CVEs and less for an attacker to use.', score: 15, size: -700, cves: -110 },
  { id: 'multistage', label: 'Multi-stage build', why: 'Compilers, dev dependencies and sources stay out of the final image.', score: 10, size: -220, cves: -25 },
  { id: 'nonroot', label: 'Run as non-root USER', why: 'A compromised process is not UID 0 on the host kernel.', score: 20 },
  { id: 'pin', label: 'Pin base image version / digest', why: 'Reproducible builds. A retagged upstream image cannot surprise you.', score: 10 },
  { id: 'secrets', label: 'No secrets in ENV/ARG (BuildKit secrets)', why: 'ENV and ARG values persist in image metadata and history.', score: 20 },
  { id: 'ignore', label: '.dockerignore (.git, .env, node_modules)', why: 'Smaller context, stable cache, no leaked credentials.', score: 10, size: -15 },
  { id: 'health', label: 'HEALTHCHECK defined', why: 'Orchestrators can detect and replace hung containers.', score: 5 },
  { id: 'runtime', label: 'Read-only rootfs, drop all capabilities', why: 'Limits what an attacker can change or do even after code execution.', score: 10 },
];

const BASE_SIZE = 1150;
const BASE_CVES = 160;

function buildDockerfile(on) {
  const distroless = on.slim && on.multistage;
  const builder = on.slim ? (on.pin ? 'node:20.17-alpine3.20' : 'node:20-alpine') : on.pin ? 'node:20.17-bookworm' : 'node:latest';
  const runtime = distroless
    ? `gcr.io/distroless/nodejs20-debian12${on.pin ? ':nonroot@sha256:5f2c…' : ''}`
    : builder;
  const install = on.secrets ? 'RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci' : 'RUN npm ci';
  const L = ['# syntax=docker/dockerfile:1'];

  if (on.multistage) {
    L.push(`FROM ${builder} AS build`, 'WORKDIR /app', 'COPY package*.json ./', install, 'COPY . .', 'RUN npm run build && npm prune --omit=dev', '', `FROM ${runtime}`, 'WORKDIR /app');
    if (!on.secrets) L.push('ENV NPM_TOKEN=npm_9f3aE1c…        # ⚠ readable via docker history');
    L.push('ENV NODE_ENV=production', 'COPY --from=build /app/node_modules ./node_modules', 'COPY --from=build /app/dist ./dist');
  } else {
    L.push(`FROM ${builder}`, 'WORKDIR /app');
    if (!on.secrets) L.push('ENV NPM_TOKEN=npm_9f3aE1c…        # ⚠ readable via docker history');
    L.push('COPY . .', on.secrets ? install : 'RUN npm install', 'RUN npm run build');
  }
  if (on.nonroot) L.push(distroless ? 'USER nonroot' : 'USER node');
  L.push('EXPOSE 3000');
  if (on.health) {
    L.push(distroless
      ? 'HEALTHCHECK --interval=30s CMD ["/nodejs/bin/node", "dist/healthcheck.js"]'
      : 'HEALTHCHECK --interval=30s CMD ["node", "dist/healthcheck.js"]');
  }
  L.push(distroless ? 'CMD ["dist/server.js"]' : 'CMD ["node", "dist/server.js"]');
  return L.join('\n');
}

function buildRun(on) {
  const flags = ['docker run -d', '-p 127.0.0.1:3000:3000', '--memory=512m --cpus=1'];
  if (on.runtime) flags.push('--read-only --tmpfs /tmp', '--cap-drop=ALL', '--security-opt=no-new-privileges');
  flags.push('myapp:1.0');
  return flags.join(' \\\n  ');
}

export default function SecurityBuilder() {
  const [on, setOn] = useState({ slim: false, multistage: false, nonroot: false, pin: false, secrets: false, ignore: false, health: false, runtime: false });

  const metrics = useMemo(() => {
    let score = 0;
    let size = BASE_SIZE;
    let cves = BASE_CVES;
    PRACTICES.forEach((p) => {
      if (!on[p.id]) return;
      score += p.score;
      size += p.size || 0;
      cves += p.cves || 0;
    });
    return { score, size: Math.max(90, size), cves: Math.max(0, cves) };
  }, [on]);

  const dockerfile = useMemo(() => buildDockerfile(on), [on]);
  const run = useMemo(() => buildRun(on), [on]);
  const grade = metrics.score >= 90 ? 'A' : metrics.score >= 70 ? 'B' : metrics.score >= 45 ? 'C' : metrics.score >= 20 ? 'D' : 'F';
  const gradeColor = { A: 'text-emerald-300', B: 'text-lime-300', C: 'text-amber-300', D: 'text-orange-300', F: 'text-rose-400' }[grade];
  const circumference = 2 * Math.PI * 34;

  return (
    <Panel title="Image hardening workbench" icon={ShieldCheck}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center rounded-xl border border-white/5 bg-white/[0.02] p-2">
              <div className="relative h-16 w-16">
                <svg viewBox="0 0 80 80" className="h-16 w-16 -rotate-90">
                  <circle cx="40" cy="40" r="34" className="fill-none stroke-white/5" strokeWidth="7" />
                  <motion.circle
                    cx="40" cy="40" r="34"
                    className="fill-none stroke-cyan-400"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - metrics.score / 100) }}
                  />
                </svg>
                <div className={cn('absolute inset-0 grid place-items-center text-lg font-bold', gradeColor)}>{grade}</div>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">score {metrics.score}</div>
            </div>
            <Metric icon={HardDrive} label="Image size" value={`${metrics.size} MB`} pct={metrics.size / BASE_SIZE} />
            <Metric icon={Bug} label="Known CVEs" value={metrics.cves} pct={metrics.cves / BASE_CVES} danger />
          </div>
          <div className="space-y-1">
            {PRACTICES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOn((o) => ({ ...o, [p.id]: !o[p.id] }))}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition',
                  on[p.id] ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-white/5 hover:border-white/15 hover:bg-white/[0.02]',
                )}
              >
                {on[p.id] ? <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />}
                <span>
                  <span className={cn('block text-xs font-medium', on[p.id] ? 'text-emerald-100' : 'text-slate-300')}>{p.label}</span>
                  <span className="block text-[11px] leading-4 text-slate-500">{p.why}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          <CodeBlock code={dockerfile} language="dockerfile" title="Dockerfile (generated)" />
          <CodeBlock code={run} language="bash" title="run command" showLineNumbers={false} />
          {on.ignore && (
            <CodeBlock code={'.git\n.env*\nnode_modules\ndist\ncoverage\n*.log\nDockerfile*\ncompose*.yaml'} language="bash" title=".dockerignore" showLineNumbers={false} />
          )}
        </div>
      </div>
    </Panel>
  );
}

function Metric({ icon: Icon, label, value, pct, danger }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <motion.div key={value} initial={{ opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }} className="my-1 font-mono text-lg font-semibold text-white">
        {value}
      </motion.div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={cn('h-full rounded-full', danger ? 'bg-rose-400' : 'bg-amber-400')}
          animate={{ width: `${Math.max(4, Math.min(1, pct) * 100)}%` }}
        />
      </div>
    </div>
  );
}
