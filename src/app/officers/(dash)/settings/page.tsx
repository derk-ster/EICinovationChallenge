import { Suspense } from "react";
import { requireAdmin } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { Badge, PageTitle } from "@/components/officers/ui";
import { AnnouncementForm, SettingsForm } from "@/components/officers/SettingsForms";
import { LocalDate } from "@/components/ui/LocalDate";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-stone">Loading settings…</p>}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  await requireAdmin();
  const store = getStore();
  const [settings, announcements, officers, audit] = await Promise.all([
    store.getSettings(),
    store.listAnnouncements({ publishedOnly: false }),
    store.listOfficers(),
    store.listAudit(25),
  ]);
  const name = new Map(officers.map((o) => [o.id, o.displayName]));
  return (
    <>
      <PageTitle title="Competition settings">
        <p className="t-small text-stone">
          Storage: <strong className="text-ink">{store.kind === "supabase" ? "Supabase (production)" : "Local development"}</strong>
        </p>
      </PageTitle>
      <div className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SettingsForm settings={settings} />
        </div>
        <div className="space-y-14 lg:col-span-5">
          <section>
            <h2 className="t-h3 mb-2">Announcements</h2>
            <p className="mb-6 t-small text-stone">Published announcements appear on the homepage timeline.</p>
            <div className="space-y-8">
              {announcements.map((a) => (
                <div key={a.id} className="border-t border-rule pt-4">
                  <div className="mb-3 flex items-center gap-2">
                    {a.published ? <Badge tone="good">Published</Badge> : <Badge>Draft</Badge>}
                    <span className="t-small text-stone">
                      <LocalDate iso={a.publishedAt ?? a.createdAt} withTime={false} />
                    </span>
                  </div>
                  <AnnouncementForm announcement={a} />
                </div>
              ))}
              <div className="border-t-2 border-ink pt-4">
                <h3 className="mb-3 font-semibold">New announcement</h3>
                <AnnouncementForm />
              </div>
            </div>
          </section>
          <section>
            <h2 className="t-h3 mb-4">Officers</h2>
            <ul className="divide-y divide-rule border-y border-rule">
              {officers.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>
                    <span className="font-semibold">{o.displayName}</span>
                    <span className="block t-small text-stone">{o.email}</span>
                  </span>
                  <span className="flex gap-2">
                    <Badge tone={o.role === "admin" ? "info" : "neutral"}>{o.role === "admin" ? "Administrator" : "Judge"}</Badge>
                    {!o.active && <Badge tone="bad">Inactive</Badge>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 t-small text-stone">
              Add or deactivate officers with <code className="bg-paper-2 px-1">npm run officer -- add</code> (see README).
            </p>
          </section>
          <section>
            <h2 className="t-h3 mb-4">Recent activity</h2>
            <ul className="space-y-2 t-small">
              {audit.map((a) => (
                <li key={a.id} className="flex justify-between gap-4 border-b border-rule pb-2">
                  <span>
                    <span className="font-semibold">{a.officerId ? (name.get(a.officerId) ?? "Officer") : "System"}</span> {a.action}
                  </span>
                  <span className="shrink-0 text-stone">
                    <LocalDate iso={a.createdAt} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
