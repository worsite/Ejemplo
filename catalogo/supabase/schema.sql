-- =====================================================================
--  Burger Fest · pedidos + panel administrativo
--  Pégalo COMPLETO en Supabase → SQL Editor → Run. Se puede ejecutar
--  más de una vez sin romper nada.
-- =====================================================================

-- 1) Tabla de pedidos ---------------------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  code           integer generated always as identity,           -- número corto visible (#1, #2…)
  customer_name  text not null check (char_length(btrim(customer_name)) between 1 and 80),
  customer_phone text check (char_length(customer_phone) <= 25),
  order_type     text not null check (order_type in ('mesa', 'domicilio')),
  table_number   integer check (table_number between 1 and 99),
  address        text check (char_length(address) <= 200),
  notes          text check (char_length(notes) <= 300),
  items          jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50
                 and octet_length(items::text) <= 20000),   -- tope de tamaño: evita pedidos gigantes
  total          integer not null check (total > 0),
  status         text not null default 'pendiente'
                 check (status in ('pendiente','confirmado','en_cocina','listo','en_despacho','entregado','cancelado')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint mesa_requiere_numero      check (order_type <> 'mesa' or table_number is not null),
  constraint domicilio_requiere_datos  check (order_type <> 'domicilio' or (address is not null and customer_phone is not null))
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- 2) Acceso del panel por enlace privado --------------------------------
--    (sin correo ni contraseña: se guarda solo el HASH de la clave)
create table if not exists public.admin_keys (
  key_hash   text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.check_admin_key(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_keys
     where key_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'utf8')), 'hex'));
$$;

-- 3) Seguridad (RLS): NADIE accede a las tablas directamente; todo pasa por funciones
alter table public.orders enable row level security;
alter table public.admin_keys enable row level security;
revoke all on table public.orders, public.admin_keys from anon, authenticated;

-- Limpieza de la versión anterior (correo y contraseña), si la habías ejecutado
drop policy if exists "admin lee pedidos" on public.orders;
drop policy if exists "admin actualiza estado" on public.orders;
drop function if exists public.is_admin();
drop table if exists public.admins;

-- 4) Funciones públicas (lo único que puede usar el cliente anónimo) ----
create or replace function public.create_order(
  p_name text, p_phone text, p_type text, p_table integer,
  p_address text, p_notes text, p_items jsonb, p_total integer
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_code integer;
  v_sum bigint;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Los productos del pedido no son válidos';
  end if;

  select coalesce(sum((i->>'qty')::integer * (i->>'price')::integer), 0)
    into v_sum
    from jsonb_array_elements(p_items) i
   where (i->>'qty')::integer between 1 and 50 and (i->>'price')::integer > 0;

  if v_sum <> p_total or jsonb_array_length(p_items) <> (
       select count(*) from jsonb_array_elements(p_items) i
        where (i->>'qty')::integer between 1 and 50 and (i->>'price')::integer > 0) then
    raise exception 'El total no coincide con los productos del pedido';
  end if;

  insert into public.orders (customer_name, customer_phone, order_type, table_number, address, notes, items, total)
  values (btrim(p_name), nullif(btrim(p_phone), ''), p_type, p_table,
          nullif(btrim(p_address), ''), nullif(btrim(p_notes), ''), p_items, p_total)
  returning id, code into v_id, v_code;

  return json_build_object('id', v_id, 'code', v_code);
end $$;

create or replace function public.get_order_status(p_id uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('code', code, 'status', status, 'order_type', order_type, 'updated_at', updated_at)
    from public.orders where id = p_id;
$$;

revoke all on function public.create_order(text, text, text, integer, text, text, jsonb, integer) from public;
revoke all on function public.get_order_status(uuid) from public;
grant execute on function public.create_order(text, text, text, integer, text, text, jsonb, integer) to anon, authenticated;
grant execute on function public.get_order_status(uuid) to anon, authenticated;

-- 5) Funciones del panel (exigen la clave; con una clave mala responden 403) --
create or replace function public.admin_list_orders(p_key text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.check_admin_key(p_key) then
    perform pg_sleep(1);  -- frena los intentos de adivinar la clave
    raise exception 'No autorizado' using errcode = '28000';
  end if;
  return coalesce((select json_agg(o) from (
    select * from public.orders order by created_at desc limit 200) o), '[]'::json);
end $$;

create or replace function public.admin_set_status(p_key text, p_id uuid, p_status text) returns json
language plpgsql security definer set search_path = public as $$
declare v_row public.orders;
begin
  if not public.check_admin_key(p_key) then
    perform pg_sleep(1);
    raise exception 'No autorizado' using errcode = '28000';
  end if;
  update public.orders set status = p_status where id = p_id returning * into v_row;
  if not found then raise exception 'Pedido no encontrado'; end if;
  return row_to_json(v_row);
end $$;

revoke all on function public.admin_list_orders(text) from public;
revoke all on function public.admin_set_status(text, uuid, text) from public;
revoke all on function public.check_admin_key(text) from public, anon, authenticated;
grant execute on function public.admin_list_orders(text) to anon, authenticated;
grant execute on function public.admin_set_status(text, uuid, text) to anon, authenticated;

-- 6) Acceso directo del panel -------------------------------------------
--    Registra la huella de la clave ADMIN_KEY que está en config.js. Quien abre
--    admin.html entra sin escribir nada. Para cambiar la clave: genera una nueva,
--    ponla en config.js, agrega aquí su huella (sha256 en hexadecimal) y borra la vieja
--    de admin_keys.
delete from public.admin_keys;   -- (versión anterior: claves de enlace privado)
insert into public.admin_keys (key_hash)
values ('4f8c6e9953477dd4c97c8dfba51c4b0d6ba5f98f31e7154342dc385710a8b57f')
on conflict do nothing;
