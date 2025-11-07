import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type PersonRatingDimensions = {
  looks: number; // 颜值
  body: number; // 身材
  content: number; // 内容
  overall: number; // 综合（只读）
  updatedAt?: string;
};

type RatingState = Record<string, PersonRatingDimensions>;

const STORAGE_KEY = 'immich_person_ratings';

function roundToTwo(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

function computeOverall(r: { looks: number; body: number; content: number }) {
  const avg = (r.looks + r.body + r.content) / 3;
  return roundToTwo(avg);
}

function createStore() {
  const initial: RatingState = browser
    ? (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          return raw ? (JSON.parse(raw) as RatingState) : {};
        } catch {
          return {};
        }
      })()
    : {};

  const { subscribe, update, set } = writable<RatingState>(initial);

  const persist = (state: RatingState) => {
    if (!browser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // noop
    }
  };

  return {
    subscribe,
    set,
    get(personId: string): PersonRatingDimensions | undefined {
      let current: RatingState | undefined;
      const unsub = subscribe((s) => (current = s));
      unsub();
      return current![personId];
    },
    ensure(personId: string): PersonRatingDimensions {
      let current: RatingState | undefined;
      const unsub = subscribe((s) => (current = s));
      unsub();
      const existing = current![personId];
      if (existing) return existing;
      const base: PersonRatingDimensions = { looks: 0, body: 0, content: 0, overall: 0, updatedAt: new Date().toISOString() };
      update((s) => {
        s[personId] = base;
        persist(s);
        return s;
      });
      return base;
    },
    setDimension(personId: string, dim: 'looks' | 'body' | 'content', value: number) {
      update((s) => {
        const prev = s[personId] ?? { looks: 0, body: 0, content: 0, overall: 0 };
        const next = { ...prev, [dim]: value } as PersonRatingDimensions;
        next.overall = computeOverall(next);
        next.updatedAt = new Date().toISOString();
        s[personId] = next;
        persist(s);
        return s;
      });
    },
  };
}

export const personRatingStore = createStore();