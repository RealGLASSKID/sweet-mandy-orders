import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { product_id: string; name: string; price: number; image: string; qty: number };
type CartState = {
  items: CartItem[];
  add: (i: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};
const Ctx = createContext<CartState | null>(null);
const KEY = "sweet-mandy-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const add: CartState["add"] = (i, qty = 1) =>
    setItems((prev) => {
      const ex = prev.find((p) => p.product_id === i.product_id);
      if (ex) return prev.map((p) => (p.product_id === i.product_id ? { ...p, qty: p.qty + qty } : p));
      return [...prev, { ...i, qty }];
    });
  const setQty = (id: string, qty: number) =>
    setItems((prev) => (qty <= 0 ? prev.filter((p) => p.product_id !== id) : prev.map((p) => (p.product_id === id ? { ...p, qty } : p))));
  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.product_id !== id));
  const clear = () => setItems([]);

  return (
    <Ctx.Provider
      value={{
        items,
        add,
        setQty,
        remove,
        clear,
        count: items.reduce((s, i) => s + i.qty, 0),
        subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("CartProvider missing");
  return c;
};
