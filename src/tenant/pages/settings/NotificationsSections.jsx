import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { Alert, Button, Card, FormSection, Skeleton, Switch, Tooltip } from "../../../shared/ui/index.js";
import { SettingsSection, changed, useReportDirty, useSectionForm, useSettingsContext, useStepSave } from "./shared.jsx";

/* ------------------------------------------------------------------ store-level */

export function StoreNotificationsSection() {
  const { tenant } = useSettingsContext();
  const initial = useMemo(
    () => ({ email: tenant?.notificationPreferences?.email !== false, inApp: tenant?.notificationPreferences?.inApp !== false }),
    [tenant]
  );
  const { form, setForm, dirty, discard, base } = useSectionForm(initial);
  useReportDirty("store-notifications", dirty);
  const saver = useStepSave();
  const [outcome, setOutcome] = useState(null);

  async function submit() {
    const notificationPreferences = changed(base, form);
    if (!Object.keys(notificationPreferences).length) return;
    setOutcome(await saver.run([{ label: "Store notifications", run: () => api.updateMyTenant({ notificationPreferences }) }]));
  }

  return (
    <SettingsSection
      id="store-notifications"
      title="Store notifications"
      description="Channels your store uses for operational alerts (new orders, low stock)."
      dirty={dirty}
      saving={saver.pending}
      onSubmit={submit}
      onDiscard={() => {
        discard();
        setOutcome(null);
      }}
      outcome={outcome}
    >
      <div className="grid max-w-2xl gap-4">
        <Switch checked={form.email} onCheckedChange={(v) => setForm((f) => ({ ...f, email: v }))} label="Email alerts" description="Send store alerts by email." />
        <Switch checked={form.inApp} onCheckedChange={(v) => setForm((f) => ({ ...f, inApp: v }))} label="In-app alerts" description="Show store alerts in the admin notification bell." />
      </div>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ personal (per signed-in user) */

const CATEGORIES = [
  { id: "order", label: "Orders", description: "New orders, status changes, returns and refunds." },
  { id: "inventory", label: "Inventory", description: "Low and out-of-stock alerts." },
  { id: "chat", label: "Support chat", description: "New messages and assignments." },
  { id: "marketing", label: "Marketing", description: "Announcements, price drops and coupons." },
  { id: "account", label: "Account & security", description: "Sign-ins and account notices." },
];
const CHANNELS = [
  { id: "inApp", label: "In-app" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
];
const LOCKED = { account: ["email"] };

export function PersonalNotificationsSection() {
  const q = useQuery({ queryKey: keys.notifications.preferences, queryFn: () => api.getNotificationPreferences() });
  const initial = useMemo(() => {
    const out = {};
    CATEGORIES.forEach((c) => {
      out[c.id] = {};
      CHANNELS.forEach((ch) => (out[c.id][ch.id] = Boolean(q.data?.[c.id]?.[ch.id])));
    });
    return out;
  }, [q.data]);
  const { form, setForm, dirty, discard, base, reset } = useSectionForm(initial);
  useReportDirty("personal-notifications", dirty && Boolean(q.data));
  const saver = useStepSave();
  const [outcome, setOutcome] = useState(null);

  if (q.isPending || q.error) {
    return (
      <Card className="grid gap-3 p-5">
        {q.error ? (
          <Alert tone="danger" title="Couldn’t load your notification preferences" action={<Button size="sm" onClick={() => q.refetch()}>Retry</Button>}>
            {q.error.message}
          </Alert>
        ) : (
          <>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-40" />
          </>
        )}
      </Card>
    );
  }

  async function submit() {
    const patch = {};
    CATEGORIES.forEach((c) => {
      const diff = changed(base[c.id], form[c.id]);
      (LOCKED[c.id] || []).forEach((ch) => delete diff[ch]);
      if (Object.keys(diff).length) patch[c.id] = diff;
    });
    if (!Object.keys(patch).length) return;
    const result = await saver.run([
      {
        label: "Your notification preferences",
        run: () => api.updateNotificationPreferences(patch),
        onSuccess: (data) => data && reset(Object.fromEntries(CATEGORIES.map((c) => [c.id, Object.fromEntries(CHANNELS.map((ch) => [ch.id, Boolean(data[c.id]?.[ch.id])]))]))),
      },
    ]);
    setOutcome(result);
    q.refetch();
  }

  return (
    <SettingsSection
      id="personal-notifications"
      title="Your notifications"
      description="Personal preferences for your own account — they don’t affect teammates."
      dirty={dirty}
      saving={saver.pending}
      onSubmit={submit}
      onDiscard={() => {
        discard();
        setOutcome(null);
      }}
      outcome={outcome}
      canEdit
    >
      <FormSection title="Channels by topic" description="Account email notices can’t be turned off — they carry security and legal information.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-ui-sm">
            <caption className="sr-only">Notification channels by topic</caption>
            <thead>
              <tr className="border-b border-border text-left text-ui-xs text-fg-subtle">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Topic
                </th>
                {CHANNELS.map((ch) => (
                  <th key={ch.id} scope="col" className="px-3 py-2 text-center font-medium">
                    {ch.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CATEGORIES.map((c) => (
                <tr key={c.id}>
                  <th scope="row" className="py-3 pr-4 text-left font-normal">
                    <div className="font-medium text-fg">{c.label}</div>
                    <div className="text-ui-xs text-fg-subtle">{c.description}</div>
                  </th>
                  {CHANNELS.map((ch) => {
                    const locked = (LOCKED[c.id] || []).includes(ch.id);
                    const sw = (
                      <Switch
                        aria-label={`${c.label}: ${ch.label}${locked ? " (always on)" : ""}`}
                        checked={locked ? true : form[c.id][ch.id]}
                        disabled={locked}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, [c.id]: { ...f[c.id], [ch.id]: v } }))}
                      />
                    );
                    return (
                      <td key={ch.id} className="px-3 py-3 text-center">
                        {locked ? (
                          <Tooltip content="Always on: security and account notices">
                            <span tabIndex={0} className="inline-flex items-center gap-1 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring">
                              {sw}
                              <Lock aria-hidden className="size-3 text-fg-subtle" />
                            </span>
                          </Tooltip>
                        ) : (
                          sw
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>
    </SettingsSection>
  );
}
