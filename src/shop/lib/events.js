/** Tiny app-wide event bus for shop UI that lives far apart (mini-cart drawer, mobile menu). */
const listeners = new Map();

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => listeners.get(name)?.delete(fn);
}

export function emit(name, payload) {
  listeners.get(name)?.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* a listener must not break the emitter */
    }
  });
}

export const openMiniCart = () => emit("minicart:open");
