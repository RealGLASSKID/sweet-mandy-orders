import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ORDER_SELECT } from "@/lib/queries";
import { naira, statusLabel, statusTone } from "@/lib/format";
import { NeedSignIn, StatusPill } from "@/components/site";

export const Route = createFileRoute("/rider")({
  head: () => ({
    meta: [
      { title: "Rider deliveries — Sweet Mandy Bakery's" },
      { name: "description", content: "Rider dashboard for Sweet Mandy deliveries." },
      { property: "og:title", content: "Rider deliveries — Sweet Mandy" },
      { property: "og:description", content: "Accept and complete deliveries." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Rider,
});

function Rider() {
  const { user, isRider, loading } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["orders", "rider", user?.id],
    enabled: isRider,
    queryFn: async () =>
      (await supabase.from("orders").select(ORDER_SELECT).eq("order_type", "delivery").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  if (loading) return null;
  if (!user) return <NeedSignIn />;
  if (!isRider) return <p className="py-16 text-center text-muted-foreground">This page is for riders only.</p>;
  const act = async (id: string, action: string) => {
    const { error } = await supabase.rpc("rider_action", { _order: id, _action: action });
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  const available = data.filter((o) => !o.rider_id);
  const mine = data.filter((o) => o.rider_id === user.id && o.status !== "delivered");
  const done = data.filter((o) => o.rider_id === user.id && o.status === "delivered");
  const Card = ({ o, children }: { o: (typeof data)[number]; children?: React.ReactNode }) => (
    <li className="rounded-2xl border bg-card p-4">
      <div className="flex justify-between">
        <span className="font-bold">#{o.code}</span>
        <StatusPill className={statusTone[o.status]}>{statusLabel[o.status]}</StatusPill>
      </div>
      <p className="mt-1 text-sm"><b>{o.area_name}</b> — {o.address}</p>
      <p className="text-sm">{o.customer_name} · <a className="text-primary" href={`tel:${o.phone}`}>{o.phone}</a></p>
      <p className="text-sm text-muted-foreground">{o.order_items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
      <p className="mt-1 text-sm">Collect delivery fee: <b>{naira(o.delivery_fee)}</b></p>
      <div className="mt-3 flex gap-2">{children}</div>
    </li>
  );
  const btn = "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground";
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="font-display text-3xl font-bold">Deliveries</h1>
      <section>
        <h2 className="font-semibold">My active deliveries ({mine.length})</h2>
        <ul className="mt-2 space-y-3">
          {mine.map((o) => (
            <Card key={o.id} o={o}>
              {o.status !== "out_for_delivery" ? (
                <button className={btn} onClick={() => act(o.id, "out")}>Picked up · On the way</button>
              ) : (
                <button className={btn} onClick={() => act(o.id, "delivered")}>Mark delivered</button>
              )}
            </Card>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold">Available ({available.length})</h2>
        <ul className="mt-2 space-y-3">
          {available.map((o) => (
            <Card key={o.id} o={o}>
              <button className={btn} onClick={() => act(o.id, "accept")}>Accept delivery</button>
            </Card>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold">Completed ({done.length})</h2>
        <ul className="mt-2 space-y-3">{done.slice(0, 10).map((o) => <Card key={o.id} o={o} />)}</ul>
      </section>
    </div>
  );
}
