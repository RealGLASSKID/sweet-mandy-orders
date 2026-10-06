import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { verifyPaystack } from "@/lib/paystack.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/payment")({
  validateSearch: z.object({ order: z.string().optional(), reference: z.string().optional(), trxref: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Payment — Sweet Mandy Bakery's" },
      { name: "description", content: "Confirming your Sweet Mandy payment." },
      { property: "og:title", content: "Payment — Sweet Mandy Bakery's" },
      { property: "og:description", content: "Confirming your payment." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Payment,
});

function Payment() {
  const { order, reference, trxref } = Route.useSearch();
  const { user, loading } = useAuth();
  const verify = useServerFn(verifyPaystack);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => {
    const ref = reference || trxref;
    if (loading || !user || !order || !ref) return;
    verify({ data: { orderId: order, reference: ref } }).then(setMsg).catch(() => setMsg({ ok: false, message: "Could not verify payment" }));
  }, [loading, user, order, reference, trxref, verify]);
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">
        {!msg ? "Confirming your payment…" : msg.ok ? "Payment successful 🎉" : "Payment not completed"}
      </h1>
      {msg && <p className="mt-2 text-muted-foreground">{msg.message}</p>}
      {order && (
        <Link to="/orders/$id" params={{ id: order }} className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">
          View order
        </Link>
      )}
    </div>
  );
}
