import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Server, Container, Scale } from 'lucide-react';
import Panel from '../ui/Panel';
import Segmented from '../ui/Segmented';
import Button from '../ui/Button';
import { cn } from '../../lib/cn';

const APPS = ['App A', 'App B', 'App C'];

const TONES = {
  slate: 'border-slate-600/40 bg-slate-500/10 text-slate-300',
  cyan: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200',
  amber: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  violet: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
  blue: 'border-docker/50 bg-docker/15 text-sky-200',
};

const FOCUS = {
  none: null,
  kernel: {
    vm: '4 kernels running: the host kernel plus one full guest kernel per VM.',
    ct: '1 kernel. Every container is a process on the same host kernel.',
  },
  overhead: {
    vm: 'Each guest OS costs GBs of disk, hundreds of MB of RAM and its own boot.',
    ct: 'No guest OS. A container ships only the app and its user-space libraries.',
  },
  isolation: {
    vm: 'Hardware-level boundary enforced by the hypervisor. Strongest isolation.',
    ct: 'Kernel-level boundary (namespaces + cgroups). Lighter, but a kernel bug affects all.',
  },
};

function Slab({ children, tone = 'slate', hot, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.04, zIndex: 2 }}
      className={cn(
        'relative rounded-lg border px-2 py-2 text-center text-[11px] font-medium leading-tight transition-shadow',
        TONES[tone],
        hot && 'shadow-[0_0_0_2px_rgba(103,232,249,0.9),0_0_28px_rgba(34,211,238,0.35)]',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

/** Side-by-side stack comparison with a focus lens and a boot-time race. */
export default function VmVsContainer() {
  const [focus, setFocus] = useState('none');
  const [race, setRace] = useState(0);
  const lens = FOCUS[focus];

  return (
    <Panel
      title="Virtual Machines vs Containers"
      icon={Scale}
      actions={
        <Segmented
          layoutId="vm-focus"
          value={focus}
          onChange={setFocus}
          options={[
            { value: 'none', label: 'Stack' },
            { value: 'kernel', label: 'Kernels' },
            { value: 'overhead', label: 'Overhead' },
            { value: 'isolation', label: 'Isolation' },
          ]}
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* VM stack */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-300">
            <Server className="h-4 w-4" /> Virtual machines
          </div>
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              {APPS.map((a, i) => (
                <Slab key={a} tone="cyan" delay={0.05 * i}>{a}</Slab>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {APPS.map((a) => (
                <Slab key={a} tone="violet">Bins / Libs</Slab>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {APPS.map((a) => (
                <Slab key={a} tone="amber" hot={focus === 'kernel' || focus === 'overhead'} className="py-3">
                  Guest OS
                  <span className="block text-[10px] opacity-60">kernel · ~GBs</span>
                </Slab>
              ))}
            </div>
            <Slab hot={focus === 'isolation'}>Hypervisor (KVM · Hyper-V · ESXi)</Slab>
            <Slab hot={focus === 'kernel'}>Host OS + kernel</Slab>
            <Slab>Infrastructure: CPU · RAM · Disk · NIC</Slab>
          </div>
          {lens && <p className="mt-3 rounded-lg bg-amber-400/5 p-2.5 text-xs leading-5 text-amber-100/90">{lens.vm}</p>}
        </div>

        {/* Container stack */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-cyan-300">
            <Container className="h-4 w-4" /> Containers
          </div>
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              {APPS.map((a, i) => (
                <Slab key={a} tone="cyan" delay={0.05 * i}>{a}</Slab>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {APPS.map((a) => (
                <Slab key={a} tone="violet" hot={focus === 'overhead'}>Bins / Libs</Slab>
              ))}
            </div>
            <Slab tone="blue" className="py-3">
              Container runtime
              <span className="block text-[10px] opacity-70">Docker Engine · containerd · runc</span>
            </Slab>
            <Slab hot={focus === 'kernel' || focus === 'isolation'} className="py-2.5">
              Host OS · one shared Linux kernel
              <span className="mt-1.5 flex justify-center gap-1.5">
                <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">namespaces</span>
                <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200">cgroups</span>
              </span>
            </Slab>
            <Slab>Infrastructure: CPU · RAM · Disk · NIC</Slab>
          </div>
          {lens && <p className="mt-3 rounded-lg bg-cyan-400/5 p-2.5 text-xs leading-5 text-cyan-100/90">{lens.ct}</p>}
        </div>
      </div>

      {/* Boot race */}
      <div className="mt-5 rounded-xl border border-white/5 bg-ink-950/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Cold start race (illustrative)</span>
          <Button icon={Play} onClick={() => setRace((r) => r + 1)}>
            {race ? 'Race again' : 'Start race'}
          </Button>
        </div>
        {[
          { label: 'VM', note: 'boot BIOS → guest kernel → init → app · ~30–90 s', dur: 4.5, color: 'from-amber-500 to-amber-300' },
          { label: 'Container', note: 'fork/exec one process · ~0.1–1 s', dur: 0.35, color: 'from-docker to-cyan-300' },
        ].map((b) => (
          <div key={b.label} className="mb-2 last:mb-0">
            <div className="mb-1 flex justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-200">{b.label}</span>
              <span>{b.note}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                key={`${b.label}-${race}`}
                className={cn('h-full rounded-full bg-gradient-to-r', b.color)}
                initial={{ width: 0 }}
                animate={{ width: race ? '100%' : 0 }}
                transition={{ duration: b.dur, ease: 'easeInOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
