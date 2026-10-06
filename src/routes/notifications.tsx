import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { NeedSignIn } from "@/components/site";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Sweet Mandy Bakery's" },
      { name: "description", content: "Order updates and announcements from Sweet Mandy." },
      { property: "og:title", content: "Notifications — Sweet Mandy Bakery's" },
      { property: "og:description", content: "Order updates and announcements." },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", "list", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  useEffect(() => {
    if (!user || !data.some((n) => !n.read)) return;
    supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false).then(() => {
      qc.invalidateQueries({ queryKey: ["notifications", "unread"] });
    });
  }, [user, data, qc]);
  if (loading) return null;
  if (!user) return <NeedSignIn />;
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-3xl font-bold">Notifications</h1>
      {!data.length && <p className="py-10 text-center text-muted-foreground">Nothing yet.</p>}
      <ul className="mt-4 space-y-2">
        {data.map((n) => (
          <li key={n.id} className={`rounded-2xl border p-4 ${n.read ? "bg-card" : "bg-accent/40"}`}>
            <p className="font-semibold">{n.title}</p>
            {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{fmtDate(n.created_at)}</span>
              {n.order_id && n.kind === "order" && (
                <Link to="/orders/$id" params={{ id: n.order_id }} className="text-primary">View order</Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
