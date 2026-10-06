import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Sweet Mandy Bakery's" },
      { name: "description", content: "Review the items in your Sweet Mandy cart before checkout." },
      { property: "og:title", content: "Your cart — Sweet Mandy Bakery's" },
      { property: "og:description", content: "Review your order before checkout." },
    ],
  }),
  component: Cart,
});

function Cart() {
  const { items, setQty, remove, subtotal } = useCart();
  if (!items.length)
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Your cart is empty</h1>
        <Link to="/menu" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">
          Browse the menu
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-3xl font-bold">Your cart</h1>
      <ul className="mt-4 space-y-3">
        {items.map((i) => (
          <li key={i.product_id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <img src={i.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <div className="flex-1">
              <p className="font-semibold">{i.name}</p>
              <p className="text-sm text-primary">{naira(i.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Less" onClick={() => setQty(i.product_id, i.qty - 1)} className="grid h-8 w-8 place-items-center rounded-full bg-secondary">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-5 text-center font-semibold">{i.qty}</span>
              <button aria-label="More" onClick={() => setQty(i.product_id, i.qty + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-secondary">
                <Plus className="h-4 w-4" />
              </button>
              <button aria-label="Remove" onClick={() => remove(i.product_id)} className="ml-1 text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-secondary p-4">
        <span className="font-semibold">Subtotal</span>
        <span className="text-xl font-bold">{naira(subtotal)}</span>
      </div>
      <Link to="/checkout" className="mt-4 block rounded-full bg-primary py-3 text-center font-semibold text-primary-foreground">
        Proceed to checkout
      </Link>
    </div>
  );
}
