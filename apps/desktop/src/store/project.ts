/**
 * Source de vérité unique du projet en cours, et de la liste des projets.
 * Aucune vue ne garde d'état métier en local.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, SystemType } from '../domain/types';
import { blankProject, otherProjects, referenceProject } from '../data/fixtures';

interface ProjectStore {
  projects: Project[];
  currentId: string | null;
  savedAt: number;
  recalculatedAt: number;
  /** Historique d'annulation. On ne travaille pas sans filet. */
  past: Project[][];
  future: Project[][];
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;

  current: () => Project | null;
  open: (id: string) => void;
  create: (systemType: SystemType) => string;
  remove: (id: string) => void;
  /** Mutation ciblée : la seule porte d'entrée pour modifier le projet courant. */
  update: (mutate: (draft: Project) => void) => void;
  touchSaved: () => void;
}

const seed = (): Project[] => [referenceProject(), ...otherProjects()];

export const useProjects = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: seed(),
      currentId: null,
      savedAt: Date.now(),
      recalculatedAt: Date.now(),
      past: [],
      future: [],

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      undo: () =>
        set((s) => {
          const previous = s.past.at(-1);
          if (!previous) return s;
          return {
            projects: previous,
            past: s.past.slice(0, -1),
            future: [...s.future, s.projects].slice(-50),
            savedAt: Date.now(),
            recalculatedAt: Date.now(),
          };
        }),

      redo: () =>
        set((s) => {
          const next = s.future.at(-1);
          if (!next) return s;
          return {
            projects: next,
            past: [...s.past, s.projects].slice(-50),
            future: s.future.slice(0, -1),
            savedAt: Date.now(),
            recalculatedAt: Date.now(),
          };
        }),

      current: () => {
        const { projects, currentId } = get();
        return projects.find((p) => p.id === currentId) ?? null;
      },

      open: (id) => set({ currentId: id }),

      create: (systemType) => {
        const id = `p-${Date.now().toString(36)}`;
        const project = blankProject(id, systemType);
        set((s) => ({ projects: [project, ...s.projects], currentId: id }));
        return id;
      },

      remove: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          currentId: s.currentId === id ? null : s.currentId,
        })),

      update: (mutate) =>
        set((s) => {
          const idx = s.projects.findIndex((p) => p.id === s.currentId);
          if (idx < 0) return s;
          const draft = structuredClone(s.projects[idx]);
          mutate(draft);
          draft.updatedAt = new Date().toISOString();
          const projects = [...s.projects];
          projects[idx] = draft;
          return {
            projects,
            // 50 pas d'annulation : au-delà personne ne remonte
            past: [...s.past, s.projects].slice(-50),
            future: [],
            savedAt: Date.now(),
            recalculatedAt: Date.now(),
          };
        }),

      touchSaved: () => set({ savedAt: Date.now() }),
    }),
    {
      name: 'ksd-projects',
      // L'historique ne survit pas au rechargement : il n'aurait plus de sens
      partialize: (s) => ({
        projects: s.projects,
        currentId: s.currentId,
      }),
      // Les fixtures ne doivent pas écraser un travail en cours au rechargement
      merge: (persisted, currentState) => ({
        ...currentState,
        ...(persisted as Partial<ProjectStore>),
      }),
    },
  ),
);

/** Raccourci pour les vues : le projet courant, jamais nul dans l'atelier. */
export const useCurrentProject = (): Project | null =>
  useProjects((s) => s.projects.find((p) => p.id === s.currentId) ?? null);
