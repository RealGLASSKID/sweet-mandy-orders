import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const initPaystack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), callbackUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const secret = process.env["PAYSTACK_SECRET_KEY"];
    if (!secret) return { error: "Online payment is not set up yet. Please choose pickup or try again later." };
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, user_id, subtotal, payment_status, order_type, code")
      .eq("id", data.orderId)
      .single();
    if (!order || order.user_id !== context.userId) return { error: "Order not found" };
    if (order.order_type !== "delivery" || order.payment_status === "paid") return { error: "This order does not need payment" };
    const email = (context.claims as { email?: string }).email;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(order.subtotal) * 100),
        currency: "NGN",
        reference: `SM-${order.code}-${Date.now()}`,
        callback_url: `${data.callbackUrl}?order=${order.id}`,
        metadata: { order_id: order.id },
      }),
    });
    const json = (await res.json()) as { status: boolean; message: string; data?: { authorization_url: string; reference: string } };
    if (!json.status || !json.data) {
      console.error("Paystack init failed", json.message);
      return { error: "Could not start payment. Please try again." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("orders").update({ paystack_ref: json.data.reference }).eq("id", order.id);
    return { url: json.data.authorization_url };
  });

export const verifyPaystack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid(), reference: z.string().min(3).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const secret = process.env["PAYSTACK_SECRET_KEY"];
    if (!secret) return { ok: false, message: "Payment is not configured" };
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, user_id, subtotal, payment_status")
      .eq("id", data.orderId)
      .single();
    if (!order || order.user_id !== context.userId) return { ok: false, message: "Order not found" };
    if (order.payment_status === "paid") return { ok: true, message: "Already paid" };
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const json = (await res.json()) as {
      status: boolean;
      data?: { status: string; amount: number; currency: string; metadata?: { order_id?: string } };
    };
    const tx = json.data;
    if (
      !json.status ||
      !tx ||
      tx.status !== "success" ||
      tx.currency !== "NGN" ||
      tx.amount < Math.round(Number(order.subtotal) * 100) ||
      tx.metadata?.order_id !== order.id
    ) {
      return { ok: false, message: "Payment was not successful" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", status: "confirmed", paystack_ref: data.reference })
      .eq("id", order.id);
    return { ok: true, message: "Payment confirmed" };
  });
