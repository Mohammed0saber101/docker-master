import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Send, Globe, Laptop, Shield, GitBranch, Box, Server, Plug } from 'lucide-react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Switch from '../ui/Switch';
import Segmented from '../ui/Segmented';
import { cn } from '../../lib/cn';

/**
 * Port publishing visualized: client → host interface → DNAT / docker-proxy →
 * docker0 → veth → container eth0 → app. The nginx inside always listens on :80,
 * so mapping to the wrong container port demonstrates "connection refused".
 */
const APP_PORT = 80;
const CONTAINER_IP = '172.17.0.2';

export default function PortMapping() {
  const [hostPort, setHostPort] = useState(8080);
  const [containerPort, setContainerPort] = useState(80);
  const [localOnly, setLocalOnly] = useState(false);
  const [client, setClient] = useState('remote');
  const [step, setStep] = useState(-1);
  const [outcome, setOutcome] = useState(null);

  const external = client === 'remote';
  const hops = [
    { icon: external ? Globe : Laptop, title: external ? 'Remote client' : 'Local shell', sub: external ? `curl 192.168.1.10:${hostPort}` : `curl localhost:${hostPort}` },
    { icon: Server, title: external ? 'Host eth0' : 'Host lo', sub: `${external ? '192.168.1.10' : '127.0.0.1'}:${hostPort}` },
    { icon: external ? Shield : Plug, title: external ? 'iptables DNAT' : 'docker-proxy', sub: external ? 'nat/PREROUTING → DOCKER' : 'userland proxy (loopback)' },
    { icon: GitBranch, title: 'docker0 → veth', sub: 'bridge forwards frame' },
    { icon: Box, title: 'Container eth0', sub: `${CONTAINER_IP}:${containerPort}` },
    { icon: Server, title: 'nginx', sub: `listening :${APP_PORT}` },
  ];

  // Where does the request stop?
  const blockedAt = external && localOnly ? 1 : containerPort !== APP_PORT ? 5 : null;

  useEffect(() => {
    if (step < 0) return undefined;
    if (blockedAt !== null && step === blockedAt) {
      setOutcome(
        blockedAt === 1
          ? `curl: (7) Failed to connect to 192.168.1.10 port ${hostPort}: Connection refused. The mapping is bound to 127.0.0.1 only.`
          : `${external
              ? `curl: (7) Failed to connect to 192.168.1.10 port ${hostPort}: Connection refused.`
              : 'curl: (56) Recv failure: Connection reset by peer.'} Nothing listens on :${containerPort} inside the container; nginx is on :${APP_PORT}.`,
      );
      return undefined;
    }
    if (step >= hops.length - 1) {
      setOutcome('HTTP/1.1 200 OK · <title>Welcome to nginx!</title>');
      return undefined;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [step, blockedAt, hops.length, hostPort, containerPort, external]);

  const send = () => {
    setOutcome(null);
    setStep(0);
  };

  const reset = () => {
    setStep(-1);
    setOutcome(null);
  };

  const bind = localOnly ? '127.0.0.1:' : '';
  const failed = outcome && !outcome.startsWith('HTTP');

  return (
    <Panel title="Port publishing: -p HOST:CONTAINER" icon={Send}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-400">
          Host port
          <input
            type="number"
            min={1}
            max={65535}
            value={hostPort}
            onChange={(e) => { setHostPort(Number(e.target.value) || 1); reset(); }}
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 font-mono text-sm text-white outline-none focus:border-cyan-400/60"
          />
        </label>
        <label className="text-xs text-slate-400">
          Container port
          <input
            type="number"
            min={1}
            max={65535}
            value={containerPort}
            onChange={(e) => { setContainerPort(Number(e.target.value) || 1); reset(); }}
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 font-mono text-sm text-white outline-none focus:border-cyan-400/60"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Switch label="Bind to 127.0.0.1 only" checked={localOnly} onChange={(v) => { setLocalOnly(v); reset(); }} />
        <Segmented
          layoutId="port-client"
          value={client}
          onChange={(v) => { setClient(v); reset(); }}
          options={[
            { value: 'remote', label: 'From network', icon: Globe },
            { value: 'local', label: 'From host', icon: Laptop },
          ]}
        />
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg bg-ink-950/60 p-3 font-mono text-[11px] leading-5">
        <div className="text-cyan-200">$ docker run -d -p {bind}{hostPort}:{containerPort} nginx</div>
        <div className="mt-1 whitespace-nowrap text-slate-500">
          -A DOCKER {localOnly ? '-d 127.0.0.1/32 ' : ''}! -i docker0 -p tcp --dport {hostPort} -j DNAT --to-destination {CONTAINER_IP}:{containerPort}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {hops.map((h, i) => {
          const Icon = h.icon;
          const reached = step >= i;
          const stopped = failed && i === blockedAt;
          const isNow = step === i && !outcome;
          return (
            <motion.div
              key={h.title}
              animate={isNow ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.5 }}
              className={cn(
                'relative rounded-xl border p-2.5 text-center transition-colors',
                stopped ? 'border-rose-400/60 bg-rose-500/10'
                  : reached ? 'border-cyan-400/50 bg-cyan-400/10'
                  : 'border-white/10 bg-white/[0.02]',
              )}
            >
              <Icon className={cn('mx-auto h-5 w-5', stopped ? 'text-rose-300' : reached ? 'text-cyan-300' : 'text-slate-500')} />
              <div className="mt-1 text-[11px] font-semibold text-slate-200">{h.title}</div>
              <div className="mt-0.5 break-all font-mono text-[9.5px] text-slate-500">{h.sub}</div>
              {i < hops.length - 1 && (
                <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-3.5 w-3.5 -translate-y-1/2 text-slate-600 lg:block" />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button icon={Send} onClick={send} disabled={step >= 0 && !outcome}>Send request</Button>
        {outcome && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn('font-mono text-[11px]', failed ? 'text-rose-300' : 'text-emerald-400')}
          >
            {outcome}
          </motion.span>
        )}
      </div>
    </Panel>
  );
}
