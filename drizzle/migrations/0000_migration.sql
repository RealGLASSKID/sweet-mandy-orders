create type public.app_role as enum ('admin','rider','customer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profile update own" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email, coalesce(new.raw_user_meta_data->>'phone',''));
  insert into public.user_roles(user_id, role) values (new.id, 'customer');
  if lower(new.email) = 'glasskid01@gmail.com' then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort int not null default 0
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "cat read" on public.categories for select using (true);
create policy "cat admin" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0,
  image_url text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "prod read" on public.products for select using (true);
create policy "prod admin" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fee numeric(12,2) not null default 0,
  active boolean not null default true
);
grant select on public.delivery_areas to anon, authenticated;
grant insert, update, delete on public.delivery_areas to authenticated;
grant all on public.delivery_areas to service_role;
alter table public.delivery_areas enable row level security;
create policy "area read" on public.delivery_areas for select using (true);
create policy "area admin" on public.delivery_areas for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.store_settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Sweet Mandy Bakery''s',
  phone text not null default '0803 541 8887',
  address text not null default 'Ijegun Last Bus Stop, Ijegun, Lagos',
  opening_hours text not null default 'Mon – Sun: 8:00 am – 9:30 pm',
  is_open boolean not null default true
);
grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;
grant all on public.store_settings to service_role;
alter table public.store_settings enable row level security;
create policy "settings read" on public.store_settings for select using (true);
create policy "settings admin" on public.store_settings for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  area_id uuid references public.delivery_areas(id) on delete set null,
  address text not null,
  phone text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "own addresses" on public.addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null default upper(substr(md5(random()::text),1,6)),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_type text not null check (order_type in ('pickup','delivery')),
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','pay_at_shop')),
  subtotal numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  area_id uuid references public.delivery_areas(id) on delete set null,
  area_name text,
  address text,
  phone text not null default '',
  customer_name text not null default '',
  note text,
  rider_id uuid references auth.users(id) on delete set null,
  paystack_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders read" on public.orders for select to authenticated using (
  user_id = auth.uid()
  or public.has_role(auth.uid(),'admin')
  or (public.has_role(auth.uid(),'rider') and (rider_id = auth.uid() or (rider_id is null and order_type='delivery' and payment_status='paid' and status in ('confirmed','preparing','ready'))))
);
create policy "orders admin update" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  price numeric(12,2) not null,
  qty int not null check (qty > 0)
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "items read" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'info',
  order_id uuid references public.orders(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif own read" on public.notifications for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "notif own update" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "notif admin insert" on public.notifications for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "notif admin delete" on public.notifications for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.place_order(_items jsonb, _type text, _area_id uuid, _address text, _phone text, _name text, _note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _order uuid;
  _sub numeric := 0;
  _fee numeric := 0;
  _area_name text;
  _it jsonb;
  _p record;
  _q int;
begin
  if _uid is null then raise exception 'Please sign in'; end if;
  if not (select is_open from store_settings where id=1) then raise exception 'The shop is closed right now'; end if;
  if _type not in ('pickup','delivery') then raise exception 'Invalid order type'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Cart is empty'; end if;
  if coalesce(trim(_phone),'') = '' then raise exception 'Phone number is required'; end if;
  if _type = 'delivery' then
    select name, fee into _area_name, _fee from delivery_areas where id=_area_id and active;
    if _area_name is null then raise exception 'Sorry, we do not deliver to that area'; end if;
    if coalesce(trim(_address),'') = '' then raise exception 'Delivery address is required'; end if;
  end if;
  insert into orders(user_id, order_type, payment_status, area_id, area_name, address, phone, customer_name, note, delivery_fee)
  values (_uid, _type, case when _type='pickup' then 'pay_at_shop' else 'unpaid' end,
    case when _type='delivery' then _area_id end, _area_name, _address, _phone, coalesce(_name,''), _note, coalesce(_fee,0))
  returning id into _order;
  for _it in select * from jsonb_array_elements(_items) loop
    _q := (_it->>'qty')::int;
    select * into _p from products where id = (_it->>'product_id')::uuid;
    if not found or not _p.available then raise exception 'An item in your cart is sold out'; end if;
    if _q < 1 or _q > 50 then raise exception 'Invalid quantity'; end if;
    insert into order_items(order_id, product_id, name, price, qty) values (_order, _p.id, _p.name, _p.price, _q);
    _sub := _sub + _p.price * _q;
  end loop;
  update orders set subtotal=_sub where id=_order;
  return _order;
end $$;

create or replace function public.cancel_my_order(_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update orders set status='cancelled'
  where id=_order and user_id=auth.uid() and status='pending' and payment_status <> 'paid';
  if not found then raise exception 'This order can no longer be cancelled'; end if;
end $$;

create or replace function public.rider_action(_order uuid, _action text) returns void
language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid();
begin
  if not public.has_role(_uid,'rider') then raise exception 'Riders only'; end if;
  if not coalesce((select is_active from profiles where id=_uid), false) then raise exception 'Your rider account is inactive'; end if;
  if _action = 'accept' then
    update orders set rider_id=_uid where id=_order and rider_id is null and order_type='delivery' and payment_status='paid' and status in ('confirmed','preparing','ready');
  elsif _action = 'out' then
    update orders set status='out_for_delivery' where id=_order and rider_id=_uid and status in ('confirmed','preparing','ready');
  elsif _action = 'delivered' then
    update orders set status='delivered' where id=_order and rider_id=_uid and status='out_for_delivery';
  else raise exception 'Unknown action'; end if;
  if not found then raise exception 'Action not allowed for this order'; end if;
end $$;

create or replace function public.admin_set_role(_email text, _role app_role, _grant boolean) returns void
language plpgsql security definer set search_path = public as $$
declare _target uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  select id into _target from profiles where lower(email)=lower(trim(_email));
  if _target is null then raise exception 'No account with that email. Ask them to sign up first.'; end if;
  if _grant then insert into user_roles(user_id, role) values (_target,_role) on conflict do nothing;
  else delete from user_roles where user_id=_target and role=_role; end if;
end $$;

create or replace function public.admin_broadcast(_title text, _body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  insert into notifications(user_id, title, body, kind) select id, _title, _body, 'message' from profiles;
end $$;

create or replace function public.order_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare _labels jsonb := '{"pending":"Pending","confirmed":"Confirmed","preparing":"Preparing","ready":"Ready","out_for_delivery":"Out for Delivery","delivered":"Delivered","cancelled":"Cancelled"}';
begin
  if new.status is distinct from old.status then
    insert into notifications(user_id,title,body,kind,order_id)
    values (new.user_id, 'Order #'||new.code||' is '||(_labels->>new.status), 'Your order status was updated.', 'order', new.id);
  end if;
  if new.rider_id is not null and new.rider_id is distinct from old.rider_id then
    insert into notifications(user_id,title,body,kind,order_id)
    values (new.rider_id, 'Delivery #'||new.code||' assigned to you', coalesce(new.area_name,'')||' — '||coalesce(new.address,''), 'delivery', new.id);
  end if;
  if new.order_type='delivery' and new.payment_status='paid' and old.payment_status <> 'paid' and new.rider_id is null then
    insert into notifications(user_id,title,body,kind,order_id)
    select ur.user_id, 'New delivery available #'||new.code, coalesce(new.area_name,''), 'delivery', new.id
    from user_roles ur where ur.role='rider';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger orders_notify before update on public.orders for each row execute function public.order_notify();

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;

create policy "product images admin read" on storage.objects for select to authenticated using (bucket_id='product-images' and public.has_role(auth.uid(),'admin'));
create policy "product images admin write" on storage.objects for insert to authenticated with check (bucket_id='product-images' and public.has_role(auth.uid(),'admin'));
create policy "product images admin update" on storage.objects for update to authenticated using (bucket_id='product-images' and public.has_role(auth.uid(),'admin'));
create policy "product images admin delete" on storage.objects for delete to authenticated using (bucket_id='product-images' and public.has_role(auth.uid(),'admin'));

insert into public.store_settings(id) values (1);
insert into public.categories(name, slug, sort) values
 ('Meals','meals',1),('Small Chops','small-chops',2),('Breads & Pastries','breads-pastries',3),
 ('Ice Cream','ice-cream',4),('Soft Drinks','soft-drinks',5),('Take Away Packs','take-away',6);
insert into public.delivery_areas(name, fee) values
 ('Ijegun',500),('Ikotun',800),('Egbe',800),('Igando',1000),('Isheri-Olofin',1000),('Ejigbo',1200),('Isolo',1500),('Ikeja',2000),('Ojota',2500),('Yaba',2500),('Surulere',2500);
insert into public.products(category_id, name, description, price)
select c.id, p.name, p.descr, p.price from (values
 ('meals','Jollof Rice & Chicken','Smoky party jollof with a juicy fried chicken lap and plantain.',3500),
 ('meals','Fried Rice & Turkey','Colourful fried rice with mixed veggies and peppered turkey.',4000),
 ('meals','Egusi Soup & Semovita','Rich egusi with assorted meat, served with soft semovita.',3800),
 ('meals','Efo Riro & Semovita','Spinach stew with ponmo and beef, with semovita.',3800),
 ('small-chops','Small Chops Pack (Regular)','Puff-puff, samosa, spring rolls and peppered gizzard.',2500),
 ('small-chops','Puff-Puff (10 pcs)','Soft, golden, lightly sweet.',1000),
 ('breads-pastries','Sweet Mandy Sliced Bread','Fresh soft loaf baked every morning.',1500),
 ('breads-pastries','Meat Pie','Buttery crust filled with minced beef and potatoes.',800),
 ('breads-pastries','Doughnut','Fluffy sugar-dusted doughnut.',500),
 ('ice-cream','Vanilla Ice Cream Cup','Creamy vanilla scoop cup.',1200),
 ('ice-cream','Strawberry Ice Cream Cup','Sweet pink strawberry scoops.',1200),
 ('soft-drinks','Coca-Cola (50cl)','Chilled.',400),
 ('soft-drinks','Fanta (50cl)','Chilled.',400),
 ('soft-drinks','Chi Exotic Juice (1L)','Fruit juice.',1500),
 ('take-away','Take Away Pack','Extra food pack for your order.',200)
) as p(slug,name,descr,price) join public.categories c on c.slug=p.slug;