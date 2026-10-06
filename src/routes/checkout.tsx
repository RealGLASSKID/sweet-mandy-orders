import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { areasQuery, settingsQuery } from "@/lib/queries";
import { naira } from "@/lib/format";
import { initPaystack } from "@/lib/paystack.functions";
import { NeedSignIn } from "@/components/site";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Sweet Mandy Bakery's" },
      { name: "description", content: "Choose pickup or delivery and place your Sweet Mandy order." },
      { property: "og:title", content: "Checkout — Sweet Mandy Bakery's" },
      { property: "og:description", content: "Pickup or delivery in Ijegun and Lagos Mainland." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { user, loading } = useAuth();
  const { items, subtotal, clear } = useCart();
  const { data: areas = [] } = useQuery(areasQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { data: saved = [] } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").order("created_at")).data ?? [],
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });
  const [type, setType] = useState<"pickup" | "delivery">("pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [areaId, setAreaId] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [save, setSave] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const pay = useServerFn(initPaystack);

  useEffect(() => {
    if (profile) {
      setName((n) => n || profile.full_name);
      setPhone((p) => p || profile.phone);
    }
  }, [profile]);

  if (loading) return null;
  if (!user) return <NeedSignIn text="Sign in to place your order." />;
  if (!items.length) {
    return <p className="py-16 text-center text-muted-foreground">Your cart is empty.</p>;
  }
  const activeAreas = areas.filter((a) => a.active);
  const area = activeAreas.find((a) => a.id === areaId);
  const fee = type === "delivery" ? Number(area?.fee ?? 0) : 0;

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data: orderId, error } = await supabase.rpc("place_order", {
      _items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      _type: type,
      _area_id: type === "delivery" ? areaId : (null as unknown as string),
      _address: address,
      _phone: phone,
      _name: name,
      _note: note,
    });
    if (error || !orderId) {
      setBusy(false);
      return toast.error(error?.message ?? "Could not place order");
    }
    if (type === "delivery" && save) {
      await supabase.from("addresses").insert({ user_id: user.id, address, area_id: areaId, phone, label: area?.name ?? "Home" });
    }
    clear();
    if (type === "delivery") {
      const r = await pay({ data: { orderId, callbackUrl: `${window.location.origin}/payment` } });
      if ("url" in r && r.url) {
        window.location.href = r.url;
        return;
      }
      toast.error(("error" in r && r.error) || "Payment could not start");
    } else toast.success("Order placed! Pay when you pick it up.");
    setBusy(false);
    nav({ to: "/orders/$id", params: { id: orderId } });
  };

  const field = "w-full rounded-xl border bg-card px-4 py-3";
  return (
    <form onSubmit={place} className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <h1 className="font-display text-3xl font-bold">Checkout</h1>
      {settings && !settings.is_open && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">The shop is closed right now, so orders can't be placed.</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {(["pickup", "delivery"] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setType(t)}
            className={`rounded-2xl border p-4 text-left ${type === t ? "border-primary bg-primary/10" : "bg-card"}`}
          >
            <p className="font-semibold">{t === "pickup" ? "Pickup" : "Delivery"}</p>
            <p className="text-xs text-muted-foreground">{t === "pickup" ? "Pay at the shop" : "Pay online now"}</p>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        <input required placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
        {type === "delivery" && (
          <>
            {saved.length > 0 && (
              <select
                className={field}
                defaultValue=""
                onChange={(e) => {
                  const a = saved.find((s) => s.id === e.target.value);
                  if (a) {
                    setAddress(a.address);
                    setAreaId(a.area_id ?? "");
                    if (a.phone) setPhone(a.phone);
                  }
                }}
              >
                <option value="">Use a saved address…</option>
                {saved.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.address}
                  </option>
                ))}
              </select>
            )}
            <select required value={areaId} onChange={(e) => setAreaId(e.target.value)} className={field}>
              <option value="">Select delivery area</option>
              {activeAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {naira(a.fee)}
                </option>
              ))}
            </select>
            <textarea required placeholder="Full delivery address & landmark" value={address} onChange={(e) => setAddress(e.target.value)} className={field} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> Save this address
            </label>
          </>
        )}
        <textarea placeholder="Note for the kitchen (optional)" value={note} onChange={(e) => setNote(e.target.value)} className={field} />
      </div>
      <div className="space-y-1 rounded-2xl bg-secondary p-4 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{naira(subtotal)}</span></div>
        {type === "delivery" && (
          <div className="flex justify-between"><span>Delivery fee</span><span>{naira(fee)} <em className="text-muted-foreground">(paid to rider)</em></span></div>
        )}
        <div className="flex justify-between pt-2 text-lg font-bold"><span>Total</span><span>{naira(subtotal + fee)}</span></div>
        {type === "delivery" && <p className="text-xs text-muted-foreground">You pay {naira(subtotal)} online now. Pay the delivery fee to the rider.</p>}
      </div>
      <button disabled={busy || (settings && !settings.is_open)} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? "Placing order…" : type === "delivery" ? `Pay ${naira(subtotal)} & place order` : "Place order"}
      </button>
    </form>
  );
}
