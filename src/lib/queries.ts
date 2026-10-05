import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").order("sort");
    if (error) throw error;
    return data;
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(id, name, slug)")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});
export type Product = Awaited<ReturnType<NonNullable<typeof productsQuery.queryFn>>>[number];

export const areasQuery = queryOptions({
  queryKey: ["areas"],
  queryFn: async () => {
    const { data, error } = await supabase.from("delivery_areas").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const ORDER_SELECT = "*, order_items(*)";
