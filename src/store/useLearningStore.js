/**
 * Global learning state (Zustand).
 *
 * - `active`        which page is on screen ('home' or a module id). Synced to the URL hash by App.
 * - `completed`     { [moduleId]: true } modules the learner marked complete.
 * - `quiz`          { [moduleId]: { score, total } } best/last quiz result.
 * - `sidebarOpen`   mobile navigation drawer.
 *
 * Progress (completed + quiz) persists to localStorage; navigation state does not.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MODULES } from '../data/modules';

export const isValidPage = (id) => id === 'home' || MODULES.some((m) => m.id === id);

/** Read the page from the URL hash (#/networking) so deep links render the right page on first paint. */
const pageFromHash = () => {
  if (typeof window === 'undefined') return 'home';
  const id = window.location.hash.replace(/^#\/?/, '');
  return isValidPage(id) ? id : 'home';
};

export const useLearning = create(
  persist(
    (set) => ({
      active: pageFromHash(),
      completed: {},
      quiz: {},
      sidebarOpen: false,

      setActive: (id) => set({ active: id, sidebarOpen: false }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),
      markComplete: (id) => set((s) => ({ completed: { ...s.completed, [id]: true } })),
      recordQuiz: (id, score, total) =>
        set((s) => ({ quiz: { ...s.quiz, [id]: { score, total } } })),
      resetProgress: () => set({ completed: {}, quiz: {} }),
    }),
    {
      name: 'docker-mastery-progress',
      partialize: (s) => ({ completed: s.completed, quiz: s.quiz }),
    },
  ),
);
