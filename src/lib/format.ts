import meals from "@/assets/cat-meals.jpg";
import chops from "@/assets/cat-small-chops.jpg";
import breads from "@/assets/cat-breads-pastries.jpg";
import ice from "@/assets/cat-ice-cream.jpg";
import drinks from "@/assets/cat-soft-drinks.jpg";
import take from "@/assets/cat-take-away.jpg";

export const naira = (n: number | string | null | undefined) =>
  "₦" + Number(n ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export const categoryImages: Record<string, string> = {
  meals,
  "small-chops": chops,
  "breads-pastries": breads,
  "ice-cream": ice,
  "soft-drinks": drinks,
  "take-away": take,
};

export function productImage(p: { image_url: string | null; categories?: { slug: string } | null }) {
  return p.image_url || categoryImages[p.categories?.slug ?? ""] || meals;
}

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const statusLabel: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const paymentLabel: Record<string, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  pay_at_shop: "Pay at shop",
};

export const statusTone: Record<string, string> = {
  pending: "bg-secondary text-secondary-foreground",
  confirmed: "bg-accent text-accent-foreground",
  preparing: "bg-accent text-accent-foreground",
  ready: "bg-primary text-primary-foreground",
  out_for_delivery: "bg-primary text-primary-foreground",
  delivered: "bg-success text-success-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

export const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
