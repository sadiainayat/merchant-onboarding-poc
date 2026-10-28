import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Building2, Smartphone, UserRoundCheck } from "lucide-react";
import { Page, PageHeader } from "@/components/abl/AppShell";
import { createCase } from "@/lib/onboarding/cases.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Start a merchant application — Allied Bank" },
      { name: "description", content: "Begin an Allied Bank merchant onboarding case via self-service, field agent or branch." },
      { property: "og:title", content: "Start a merchant application — Allied Bank" },
      { property: "og:description", content: "Begin an Allied Bank merchant onboarding case via self-service, field agent or branch." },
    ],
  }),
  component: Index,
});

const CHANNELS = [
  { id: "self-service", title: "Self-service", desc: "Merchant applies from their own phone or computer.", Icon: Smartphone },
  { id: "field-agent", title: "Field agent (assisted)", desc: "Relationship manager captures the case at the shop, with photo and location.", Icon: UserRoundCheck },
  { id: "branch", title: "Branch", desc: "Case started in person at a branch counter.", Icon: Building2 },
] as const;

function Index() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  async function start(channel: string) {
    setBusy(channel);
    try {
      const c = await createCase({ data: { channel } });
      navigate({ to: "/capture", search: { case: c.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start case.");
      setBusy(null);
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Digital merchant onboarding"
        title="Start a new application"
        description="One case, three ways in. Choose how this merchant application is being captured."
      />
      <div className="grid gap-4">
        {CHANNELS.map(({ id, title, desc, Icon }) => (
          <button
            key={id}
            disabled={!!busy}
            onClick={() => start(id)}
            className="group flex items-center gap-5 rounded-lg border bg-card p-5 text-left shadow-card transition-all hover:border-primary/40 hover:shadow-raised disabled:opacity-60"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
              <Icon className="size-6" />
            </span>
            <span className="flex-1">
              <span className="block font-display text-base font-semibold text-primary">{title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{desc}</span>
            </span>
            <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-orange" />
          </button>
        ))}
      </div>
      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        Name consistency, FBR Active Taxpayer and duplicate checks run on real logic; other checks are simulated for this pilot.{" "}
        <Link to="/queue" search={{ case: undefined }} className="font-semibold text-primary hover:underline">Go to the ops queue →</Link>
      </p>
    </Page>
  );
}
