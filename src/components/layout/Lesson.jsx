import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease: 'easeOut' },
};

/**
 * One split-screen lesson: explanation on the left, interactive playground on
 * the right (sticky on wide screens). `wide` stacks the playground full-width
 * under the copy, for editors and canvases that need room.
 */
export default function Lesson({ id, eyebrow, title, children, visual, wide = false }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-white/5 py-12 first:border-t-0">
      <div
        className={cn(
          'grid items-start gap-8',
          !wide && 'xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-10',
        )}
      >
        <motion.div {...reveal} className={cn('prose-doc min-w-0', wide && 'max-w-3xl')}>
          {eyebrow && (
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              {eyebrow}
            </div>
          )}
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-[28px]">{title}</h2>
          {children}
        </motion.div>
        {visual && (
          <motion.div {...reveal} className={cn('min-w-0', !wide && 'xl:sticky xl:top-20')}>
            {visual}
          </motion.div>
        )}
      </div>
    </section>
  );
}
