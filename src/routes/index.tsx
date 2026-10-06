import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { categoriesQuery, productsQuery, settingsQuery } from "@/lib/queries";
import { categoryImages } from "@/lib/format";
import { ProductCard } from "@/components/site";
import hero from "@/assets/cat-breads-pastries.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sweet Mandy Bakery's — Meals, Small Chops & Bakes in Ijegun" },
      { name: "description", content: "Order jollof, fried rice, small chops, fresh bread and pastries for pickup or delivery in Ijegun, Lagos." },
      { property: "og:title", content: "Sweet Mandy Bakery's — Order online" },
      { property: "og:description", content: "Hot meals and fresh bakes from Ijegun, Lagos. Pickup or delivery." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery),
      context.queryClient.ensureQueryData(productsQuery),
      context.queryClient.ensureQueryData(settingsQuery),
    ]),
  component: Index,
});

function Index() {
  const { data: cats } = useSuspenseQuery(categoriesQuery);
  const { data: products } = useSuspenseQuery(productsQuery);
  const { data: s } = useSuspenseQuery(settingsQuery);
  const featured = products.filter((p) => p.available).slice(0, 8);
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
        <div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.is_open ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>
            {s.is_open ? "Open now · taking orders" : "Closed right now"}
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-cocoa md:text-6xl">
            Fresh from our oven to your table.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Jollof, fried rice, small chops, soft bread and sweet treats — made daily in Ijegun. Pick up or get it delivered.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/menu" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow">
              Order now
            </Link>
            <a href="tel:08035418887" className="rounded-full border px-6 py-3 font-semibold">
              Call us
            </a>
          </div>
        </div>
        <img src={hero} alt="Fresh breads and pastries" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lg" />
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <h2 className="font-display text-2xl font-bold">What are you craving?</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {cats.map((c) => (
            <Link key={c.id} to="/menu" search={{ cat: c.slug }} className="group text-center">
              <img src={categoryImages[c.slug]} alt={c.name} loading="lazy" className="aspect-square w-full rounded-2xl object-cover transition group-hover:scale-[1.03]" />
              <p className="mt-2 text-sm font-semibold">{c.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Popular today</h2>
          <Link to="/menu" className="text-sm font-semibold text-primary">See full menu →</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
