import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLearning, isValidPage } from './store/useLearningStore';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Home from './components/layout/Home';
import Module1Foundations from './modules/Module1Foundations';
import Module2Images from './modules/Module2Images';
import Module3Storage from './modules/Module3Storage';
import Module4Networking from './modules/Module4Networking';
import Module5Compose from './modules/Module5Compose';
import Module6Swarm from './modules/Module6Swarm';
import Module7Security from './modules/Module7Security';

const PAGES = {
  home: Home,
  foundations: Module1Foundations,
  images: Module2Images,
  storage: Module3Storage,
  networking: Module4Networking,
  compose: Module5Compose,
  swarm: Module6Swarm,
  security: Module7Security,
};

export default function App() {
  const active = useLearning((s) => s.active);
  const setActive = useLearning((s) => s.setActive);

  // URL hash (#/networking) <-> active page, so modules are linkable and back/forward works.
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace(/^#\/?/, '');
      if (id && isValidPage(id)) setActive(id);
    };
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [setActive]);

  useEffect(() => {
    if (window.location.hash !== `#/${active}`) window.location.hash = `/${active}`;
    window.scrollTo({ top: 0 });
  }, [active]);

  const Page = PAGES[active] || Home;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-72">
        <TopBar />
        <main className="mx-auto max-w-[1400px] px-4 pb-24 sm:px-6 lg:px-10">
          {/* Enter-only transition. An exit-gated AnimatePresence (mode="wait") can get stuck
              when the outgoing page contains shared layoutId elements, freezing navigation. */}
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Page />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
