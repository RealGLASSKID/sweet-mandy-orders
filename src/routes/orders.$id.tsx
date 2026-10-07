import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ORDER_SELECT } from "@/lib/queries";
import { fmtDate, naira, paymentLabel, statusLabel, statusTone } from "@/lib/format";
import { initPaystack } from "@/lib/paystack.functions";
import { NeedSignIn, StatusPill } from "@/components/site";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Sweet Mandy Bakery's" },
      { name: "description", content: "Live status of your Sweet Mandy order." },
      { property: "og:title", content: "Order details — Sweet Mandy Bakery's" },
      { property: "og:description", content: "Track your order live." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetail,
});

const STEPS = { pickup: ["pending", "confirmed", "preparing", "ready", "delivered"], delivery: ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"] };

function OrderDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const pay = useServerFn(initPaystack);
  const { data: o } = useQuery({
    queryKey: ["orders", id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("orders").select(ORDER_SELECT).eq("id", id).single()).data,
  });
  if (loading) return null;
  if (!user) return <NeedSignIn />;
  if (!o) return <p className="py-16 text-center text-muted-foreground">Loading order…</p>;
  const steps = STEPS[o.order_type as "pickup" | "delivery"];
  const idx = steps.indexOf(o.status);

  const cancel = async () => {
    const { error } = await supabase.rpc("cancel_my_order", { _order: o.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Order cancelled");
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  const payNow = async () => {
    const r = await pay({ data: { orderId: o.id, callbackUrl: `${window.location.origin}/payment` } });
    if ("url" in r && r.url) window.location.href = r.url;
    else toast.error(("error" in r && r.error) || "Payment could not start");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Order #{o.code}</h1>
        <StatusPill className={statusTone[o.status]}>{statusLabel[o.status]}</StatusPill>
      </div>
      <p className="text-sm text-muted-foreground">
        {fmtDate(o.created_at)} · {o.order_type === "pickup" ? "Pickup" : `Delivery to ${o.area_name}`} · {paymentLabel[o.payment_status]}
      </p>
      {o.status !== "cancelled" && (
        <ol className="space-y-2 rounded-2xl border bg-card p-4">
          {steps.map((s, i) => (
            <li key={s} className={`flex items-center gap-3 text-sm ${i <= idx ? "font-semibold" : "text-muted-foreground"}`}>
              <span className={`h-3 w-3 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />
              {statusLabel[s]}
            </li>
          ))}
        </ol>
      )}
      <ul className="divide-y rounded-2xl border bg-card">
        {o.order_items.map((i) => (
          <li key={i.id} className="flex justify-between p-3 text-sm">
            <span>{i.qty} × {i.name}</span>
            <span>{naira(Number(i.price) * i.qty)}</span>
          </li>
        ))}
        <li className="flex justify-between p-3 font-bold"><span>Food total</span><span>{naira(o.subtotal)}</span></li>
        {o.order_type === "delivery" && (
          <li className="flex justify-between p-3 text-sm"><span>Delivery fee (pay rider)</span><span>{naira(o.delivery_fee)}</span></li>
        )}
      </ul>
      {o.address && <p className="text-sm"><b>Address:</b> {o.address}</p>}
      <div className="flex flex-wrap gap-2">
        {o.order_type === "delivery" && o.payment_status !== "paid" && o.status !== "cancelled" && (
          <button onClick={payNow} className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">Pay {naira(o.subtotal)} now</button>
        )}
        {o.status === "pending" && o.payment_status !== "paid" && (
          <button onClick={cancel} className="rounded-full border px-5 py-2 font-semibold">Cancel order</button>
        )}
      </div>
    </div>
  );
}
