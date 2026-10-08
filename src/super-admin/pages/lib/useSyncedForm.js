import { useCallback, useState } from "react";

const jsonEqual = (a, b) =>
  JSON.stringify(a, (_k, v) => (v instanceof Set ? [...v].sort() : v)) === JSON.stringify(b, (_k, v) => (v instanceof Set ? [...v].sort() : v));

/**
 * Form state seeded from server data. When `initial` changes (load, refetch, save), the form follows
 * it only if the user hasn't edited anything — async loads never wipe edits.
 *   const [form, setForm, base] = useSyncedForm(initial);   // dirty = !equal(form, base)
 */
export function useSyncedForm(initial, equal = jsonEqual) {
  const [state, setState] = useState({ base: initial, form: initial });
  let current = state;
  if (state.base !== initial) {
    const pristine = equal(state.form, state.base);
    current = { base: initial, form: pristine ? initial : state.form };
    setState(current);
  }
  const setForm = useCallback((next) => setState((s) => ({ ...s, form: typeof next === "function" ? next(s.form) : next })), []);
  return [current.form, setForm, current.base, (a, b) => equal(a, b)];
}

export { jsonEqual };
