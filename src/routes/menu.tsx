import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { ProductCard } from "@/components/site";

export const Route = createFileRoute("/menu")({
  validateSearch: z.object({ cat: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Menu — Sweet Mandy Bakery's" },
      { name: "description", content: "Browse meals, small chops, breads, pastries, ice cream and drinks with prices in Naira." },
      { property: "og:title", content: "Menu — Sweet Mandy Bakery's" },
      { property: "og:description", content: "Meals, small chops, bakes and drinks. Order for pickup or delivery." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(categoriesQuery), context.queryClient.ensureQueryData(productsQuery)]),
  component: Menu,
});

function Menu() {
  const { cat } = Route.useSearch();
  const { data: cats } = useSuspenseQuery(categoriesQuery);
  const { data: products } = useSuspenseQuery(productsQuery);
  const [q, setQ] = useState("");
  const list = products.filter(
    (p) => (!cat || p.categories?.slug === cat) && p.name.toLowerCase().includes(q.toLowerCase()),
  );
  const chip = (active: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-secondary"}`;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-3xl font-bold">Our menu</h1>
      <div className="relative mt-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search jollof, meat pie, cake…"
          className="w-full rounded-full border bg-card py-2.5 pl-9 pr-4"
        />
      </div>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2">
        <Link to="/menu" search={{}} className={chip(!cat)}>All</Link>
        {cats.map((c) => (
          <Link key={c.id} to="/menu" search={{ cat: c.slug }} className={chip(cat === c.slug)}>
            {c.name}
          </Link>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
      {list.length === 0 && <p className="py-12 text-center text-muted-foreground">No items found.</p>}
    </div>
  );
}
