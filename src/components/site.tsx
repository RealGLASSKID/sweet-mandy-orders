import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, ShoppingBag, User, Bike, LayoutDashboard, LogOut, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { settingsQuery, type Product } from "@/lib/queries";
import { naira, productImage } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user, isAdmin, isRider, signOut } = useAuth();
  const { count } = useCart();
  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      return count ?? 0;
    },
  });
  const icon = "relative grid h-10 w-10 place-items-center rounded-full hover:bg-secondary";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link to="/" className="mr-auto font-display text-xl font-bold text-cocoa">
          Sweet Mandy<span className="text-accent-foreground">.</span>
        </Link>
        <Link to="/menu" className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:bg-secondary sm:block">
          Menu
        </Link>
        {user && (
          <Link to="/orders" className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:bg-secondary sm:block">
            My orders
          </Link>
        )}
        {isRider && (
          <Link to="/rider" className={icon} aria-label="Rider">
            <Bike className="h-5 w-5" />
          </Link>
        )}
        {isAdmin && (
          <Link to="/admin" className={icon} aria-label="Admin">
            <LayoutDashboard className="h-5 w-5" />
          </Link>
        )}
        {user && (
          <Link to="/notifications" className={icon} aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {!!unread && (
              <span className="absolute right-1 top-1 h-4 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
                {unread}
              </span>
            )}
          </Link>
        )}
        <Link to="/cart" className={icon} aria-label="Cart">
          <ShoppingBag className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute right-1 top-1 h-4 min-w-4 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
              {count}
            </span>
          )}
        </Link>
        {user ? (
          <button className={icon} aria-label="Sign out" onClick={() => signOut()}>
            <LogOut className="h-5 w-5" />
          </button>
        ) : (
          <Link to="/auth" className={icon} aria-label="Sign in">
            <User className="h-5 w-5" />
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { data: s } = useQuery(settingsQuery);
  return (
    <footer className="mt-16 bg-cocoa text-cocoa-foreground">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-xl font-bold">{s?.business_name ?? "Sweet Mandy Bakery's"}</p>
          <p className="mt-2 text-sm opacity-80">Fresh bakes, hot meals, happy bellies.</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Visit us</p>
          <p className="opacity-80">{s?.address ?? "Ijegun Last Bus Stop, Ijegun, Lagos"}</p>
          <a href={`tel:${(s?.phone ?? "08035418887").replace(/\s/g, "")}`} className="opacity-80 underline">
            {s?.phone ?? "0803 541 8887"}
          </a>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Opening hours</p>
          <p className="opacity-80">{s?.opening_hours ?? "Mon – Sun: 8:00 am – 9:30 pm"}</p>
        </div>
      </div>
    </footer>
  );
}

export function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <img src={productImage(p)} alt={p.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
      <div className="p-3">
        <p className="font-semibold leading-tight">{p.name}</p>
        {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-bold text-primary">{naira(p.price)}</span>
          {p.available ? (
            <button
              onClick={() => {
                add({ product_id: p.id, name: p.name, price: Number(p.price), image: productImage(p) });
                toast.success(`${p.name} added to cart`);
              }}
              className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"
              aria-label={`Add ${p.name}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : (
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">Sold out</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function NeedSignIn({ text = "Please sign in to continue." }: { text?: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-muted-foreground">{text}</p>
      <Link to="/auth" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">
        Sign in
      </Link>
    </div>
  );
}

export function StatusPill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}
