import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { areasQuery, categoriesQuery, ORDER_SELECT, productsQuery, settingsQuery } from "@/lib/queries";
import { fmtDate, naira, ORDER_STATUSES, paymentLabel, statusLabel, statusTone } from "@/lib/format";
import { NeedSignIn, StatusPill } from "@/components/site";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Sweet Mandy Bakery's" },
      { name: "description", content: "Manage orders, menu, delivery areas and staff." },
      { property: "og:title", content: "Admin — Sweet Mandy" },
      { property: "og:description", content: "Store management dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const TABS = ["Orders", "Menu", "Areas", "Store", "Staff"] as const;
const field = "w-full rounded-xl border bg-card px-3 py-2";
const btn = "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground";

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Orders");
  if (loading) return null;
  if (!user) return <NeedSignIn />;
  if (!isAdmin) return <p className="py-16 text-center text-muted-foreground">Admins only.</p>;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "Orders" && <OrdersTab />}
        {tab === "Menu" && <MenuTab />}
        {tab === "Areas" && <AreasTab />}
        {tab === "Store" && <StoreTab />}
        {tab === "Staff" && <StaffTab />}
      </div>
    </div>
  );
}

function OrdersTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("active");
  const { data = [] } = useQuery({
    queryKey: ["orders", "admin"],
    queryFn: async () => (await supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const today = new Date().toDateString();
  const todays = data.filter((o) => new Date(o.created_at).toDateString() === today && o.status !== "cancelled");
  const list = data.filter((o) => (filter === "active" ? !["delivered", "cancelled"].includes(o.status) : filter === "all" || o.status === filter));
  const update = async (id: string, patch: { status?: string; payment_status?: string }) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Orders today" value={String(todays.length)} />
        <Stat label="Sales today" value={naira(todays.reduce((s, o) => s + Number(o.subtotal), 0))} />
        <Stat label="Active" value={String(data.filter((o) => !["delivered", "cancelled"].includes(o.status)).length)} />
      </div>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${field} mt-4 max-w-xs`}>
        <option value="active">Active orders</option>
        <option value="all">All orders</option>
        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
      </select>
      <ul className="mt-4 space-y-3">
        {list.map((o) => (
          <li key={o.id} className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">#{o.code} · {o.order_type === "pickup" ? "Pickup" : `Delivery · ${o.area_name}`}</span>
              <StatusPill className={statusTone[o.status]}>{statusLabel[o.status]}</StatusPill>
            </div>
            <p className="text-sm">{o.customer_name} · <a href={`tel:${o.phone}`} className="text-primary">{o.phone}</a> · {fmtDate(o.created_at)}</p>
            {o.address && <p className="text-sm text-muted-foreground">{o.address}</p>}
            <p className="text-sm">{o.order_items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
            {o.note && <p className="text-sm italic">Note: {o.note}</p>}
            <p className="mt-1 text-sm"><b>{naira(o.subtotal)}</b> · {paymentLabel[o.payment_status]}{o.rider_id ? " · Rider assigned" : ""}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <select value={o.status} onChange={(e) => update(o.id, { status: e.target.value })} className="rounded-full border bg-card px-3 py-1 text-sm">
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
              </select>
              {o.order_type === "pickup" && o.payment_status !== "paid" && (
                <button onClick={() => update(o.id, { payment_status: "paid" })} className="rounded-full border px-3 py-1 text-sm">Mark paid</button>
              )}
            </div>
          </li>
        ))}
        {!list.length && <p className="text-center text-muted-foreground">No orders.</p>}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function MenuTab() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: cats = [] } = useQuery(categoriesQuery);
  const empty = { id: "", name: "", description: "", price: "", category_id: "", image_url: "" as string | null };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["products"] });
  const upload = async (file: File) => {
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9.]/gi, "")}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error(error.message); return; }
    setF((x) => ({ ...x, image_url: supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl }));
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const row = { name: f.name, description: f.description, price: Number(f.price), category_id: f.category_id || null, image_url: f.image_url || null };
    const { error } = f.id ? await supabase.from("products").update(row).eq("id", f.id) : await supabase.from("products").insert(row);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setF(empty);
    refresh();
  };
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
      <form onSubmit={save} className="space-y-2 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">{f.id ? "Edit item" : "Add item"}</h2>
        <input required placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={field} />
        <textarea placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={field} />
        <input required type="number" min={0} placeholder="Price (₦)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={field} />
        <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} className={field}>
          <option value="">Category</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="text-sm" />
        {f.image_url && <img src={f.image_url} alt="" className="h-20 rounded-lg object-cover" />}
        <div className="flex gap-2">
          <button disabled={busy} className={btn}>{f.id ? "Update" : "Add"}</button>
          {f.id && <button type="button" onClick={() => setF(empty)} className="rounded-full border px-4 py-2 text-sm">Cancel</button>}
        </div>
      </form>
      <ul className="space-y-2">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <div className="flex-1">
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.categories?.name} · {naira(p.price)}</p>
            </div>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={p.available}
                onChange={async (e) => {
                  await supabase.from("products").update({ available: e.target.checked }).eq("id", p.id);
                  refresh();
                }}
              />
              In stock
            </label>
            <button onClick={() => setF({ id: p.id, name: p.name, description: p.description, price: String(p.price), category_id: p.category_id ?? "", image_url: p.image_url })} className="text-sm text-primary">Edit</button>
            <button
              onClick={async () => {
                if (!confirm(`Delete ${p.name}?`)) return;
                const { error } = await supabase.from("products").delete().eq("id", p.id);
                if (error) toast.error("Can't delete — it's in past orders. Mark it out of stock instead.");
                refresh();
              }}
              className="text-sm text-destructive"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AreasTab() {
  const qc = useQueryClient();
  const { data: areas = [] } = useQuery(areasQuery);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["areas"] });
  return (
    <div className="max-w-xl space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.from("delivery_areas").insert({ name, fee: Number(fee) });
          if (error) { toast.error(error.message); return; }
          setName("");
          setFee("");
          refresh();
        }}
        className="flex gap-2"
      >
        <input required placeholder="Area name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        <input required type="number" placeholder="Fee ₦" value={fee} onChange={(e) => setFee(e.target.value)} className={`${field} w-28`} />
        <button className={btn}>Add</button>
      </form>
      <ul className="space-y-2">
        {areas.map((a) => (
          <li key={a.id} className="flex items-center gap-2 rounded-2xl border bg-card p-3">
            <span className="flex-1 font-semibold">{a.name}</span>
            <input
              type="number"
              defaultValue={Number(a.fee)}
              onBlur={async (e) => {
                await supabase.from("delivery_areas").update({ fee: Number(e.target.value) }).eq("id", a.id);
                toast.success("Fee updated");
                refresh();
              }}
              className="w-24 rounded-lg border bg-card px-2 py-1"
            />
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={a.active} onChange={async (e) => { await supabase.from("delivery_areas").update({ active: e.target.checked }).eq("id", a.id); refresh(); }} />
              Active
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StoreTab() {
  const qc = useQueryClient();
  const { data: s } = useQuery(settingsQuery);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  if (!s) return null;
  const save = async (patch: Partial<typeof s>) => {
    const { error } = await supabase.from("store_settings").update(patch).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["settings"] });
  };
  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between rounded-2xl border bg-card p-4">
        <div>
          <p className="font-semibold">Shop is {s.is_open ? "open" : "closed"}</p>
          <p className="text-xs text-muted-foreground">When closed, customers can't place orders.</p>
        </div>
        <button onClick={() => save({ is_open: !s.is_open })} className={btn}>{s.is_open ? "Close shop" : "Open shop"}</button>
      </div>
      <form
        key={s.phone + s.opening_hours + s.address}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          save({ phone: String(fd.get("phone")), address: String(fd.get("address")), opening_hours: String(fd.get("hours")) });
        }}
        className="space-y-2 rounded-2xl border bg-card p-4"
      >
        <h2 className="font-semibold">Shop details</h2>
        <input name="phone" defaultValue={s.phone} className={field} />
        <input name="address" defaultValue={s.address} className={field} />
        <input name="hours" defaultValue={s.opening_hours} className={field} />
        <button className={btn}>Save</button>
      </form>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.rpc("admin_broadcast", { _title: title, _body: body });
          if (error) { toast.error(error.message); return; }
          toast.success("Announcement sent to all customers");
          setTitle("");
          setBody("");
        }}
        className="space-y-2 rounded-2xl border bg-card p-4"
      >
        <h2 className="font-semibold">Send announcement / promo</h2>
        <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        <textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} className={field} />
        <button className={btn}>Send</button>
      </form>
    </div>
  );
}

function StaffTab() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"rider" | "admin">("rider");
  const { data } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "rider"]);
      const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
      const { data: profiles } = ids.length ? await supabase.from("profiles").select("*").in("id", ids) : { data: [] };
      return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) }));
    },
  });
  const setR = async (em: string, r: "rider" | "admin", grant: boolean) => {
    const { error } = await supabase.rpc("admin_set_role", { _email: em, _role: r, _grant: grant });
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["staff"] });
  };
  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); setR(email, role, true); setEmail(""); }} className="flex flex-wrap gap-2">
        <input required type="email" placeholder="Their account email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${field} flex-1`} />
        <select value={role} onChange={(e) => setRole(e.target.value as "rider" | "admin")} className="rounded-xl border bg-card px-3">
          <option value="rider">Rider</option>
          <option value="admin">Admin</option>
        </select>
        <button className={btn}>Add</button>
      </form>
      <p className="text-xs text-muted-foreground">The person must sign up first.</p>
      <ul className="space-y-2">
        {data?.map((p) => (
          <li key={p.id} className="rounded-2xl border bg-card p-3">
            <p className="font-semibold">{p.full_name || p.email} <span className="text-xs text-muted-foreground">({p.roles.join(", ")})</span></p>
            <p className="text-xs text-muted-foreground">{p.email} · {p.phone}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <button
                className="text-primary"
                onClick={async () => {
                  await supabase.from("profiles").update({ is_active: !p.is_active }).eq("id", p.id);
                  qc.invalidateQueries({ queryKey: ["staff"] });
                }}
              >
                {p.is_active ? "Deactivate" : "Activate"}
              </button>
              {p.roles.map((r) => (
                <button key={r} className="text-destructive" onClick={() => p.email && setR(p.email, r as "rider" | "admin", false)}>
                  Remove {r}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
