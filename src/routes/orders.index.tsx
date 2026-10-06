import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ORDER_SELECT } from "@/lib/queries";
import { fmtDate, naira, paymentLabel, statusLabel, statusTone } from "@/lib/format";
import { NeedSignIn, StatusPill } from "@/components/site";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — Sweet Mandy Bakery's" },
      { name: "description", content: "Track your Sweet Mandy orders and order history." },
      { property: "og:title", content: "My orders — Sweet Mandy Bakery's" },
      { property: "og:description", content: "Track your orders." },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { user, loading } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["orders", "mine", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("orders").select(ORDER_SELECT).eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  if (loading) return null;
  if (!user) return <NeedSignIn />;
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-3xl font-bold">My orders</h1>
      {!isLoading && !data.length && <p className="py-10 text-center text-muted-foreground">No orders yet.</p>}
      <ul className="mt-4 space-y-3">
        {data.map((o) => (
          <li key={o.id}>
            <Link to="/orders/$id" params={{ id: o.id }} className="block rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold">#{o.code}</span>
                <StatusPill className={statusTone[o.status]}>{statusLabel[o.status]}</StatusPill>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {o.order_items.length} item(s) · {o.order_type === "pickup" ? "Pickup" : "Delivery"} · {paymentLabel[o.payment_status]}
              </p>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-muted-foreground">{fmtDate(o.created_at)}</span>
                <span className="font-semibold">{naira(o.subtotal)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
