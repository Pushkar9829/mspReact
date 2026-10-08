/**
 * Password input with show/hide and an optional strength meter (8+ characters required by the
 * API; the meter only guides).
 */
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "../ui/form.jsx";
import { cn } from "../ui/cn.js";

export function passwordScore(pw) {
  const s = String(pw || "");
  if (!s) return 0;
  let score = 0;
  if (s.length >= 8) score += 1;
  if (s.length >= 12) score += 1;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) score += 1;
  if (/\d/.test(s)) score += 1;
  if (/[^A-Za-z0-9]/.test(s)) score += 1;
  if (s.length < 8) return Math.min(score, 1);
  return Math.min(4, score);
}

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["bg-shop-danger", "bg-shop-danger", "bg-shop-saffron", "bg-shop-primary", "bg-shop-primary"];

export function StrengthMeter({ value, id }) {
  if (!value) return null;
  const score = passwordScore(value);
  return (
    <div id={id} className="grid gap-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={cn("h-1.5 flex-1 rounded-full", score >= n ? COLORS[score] : "bg-shop-well")} />
        ))}
      </div>
      <p className="text-shop-xs text-shop-muted">
        Strength: <span className="font-semibold text-shop-text">{value.length < 8 ? LABELS[0] : LABELS[score]}</span>
        {value.length < 8 ? ` · ${8 - value.length} more character${8 - value.length === 1 ? "" : "s"}` : score < 3 ? " · add numbers, symbols or length" : ""}
      </p>
    </div>
  );
}

/** <PasswordInput name="password" autoComplete="new-password" value onChange /> — use inside <Field>. */
export const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Input
      ref={ref}
      {...props}
      type={show ? "text" : "password"}
      suffix={
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} className="grid size-11 place-items-center rounded-control text-shop-muted hover:text-shop-ink">
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      }
    />
  );
});
