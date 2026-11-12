-- =====================================================================
--  Mamá Inés · menú del día, pedidos y panel administrativo
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

-- 2b) Menú del día: un menú (JSON) por día de la semana (0 = domingo … 6 = sábado)
create table if not exists public.daily_menus (
  day        smallint primary key check (day between 0 and 6),
  menu       jsonb not null default '{"sections":[]}'::jsonb
             check (jsonb_typeof(menu) = 'object' and octet_length(menu::text) <= 30000),
  updated_at timestamptz not null default now()
);

-- 3) Seguridad (RLS): NADIE accede a las tablas directamente; todo pasa por funciones
alter table public.orders enable row level security;
alter table public.admin_keys enable row level security;
alter table public.daily_menus enable row level security;
revoke all on table public.orders, public.admin_keys, public.daily_menus from anon, authenticated;

-- Limpieza de la versión anterior (correo y contraseña), si la habías ejecutado
drop policy if exists "admin lee pedidos" on public.orders;
drop policy if exists "admin actualiza estado" on public.orders;
drop function if exists public.is_admin();
drop table if exists public.admins;

-- 4) Funciones públicas (lo único que puede usar el cliente anónimo) ----
create or replace function public.get_daily_menus() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'today', extract(dow from (now() at time zone 'America/Bogota'))::int,   -- el servidor decide qué día es "hoy"
    'menus', coalesce((select json_object_agg(day::text, menu) from public.daily_menus), '{}'::json));
$$;

-- Valida la forma del menú (el panel ya lo valida; esto protege la base de datos)
create or replace function public.validate_menu(p_menu jsonb) returns void
language plpgsql set search_path = public as $$
declare
  s jsonb; i jsonb; v text;
  sec_ids text[] := '{}'; item_ids text[];
begin
  if p_menu is null or jsonb_typeof(p_menu) <> 'object' or jsonb_typeof(p_menu->'sections') is distinct from 'array' then
    raise exception 'El menú no es válido';
  end if;
  if octet_length(p_menu::text) > 30000 then raise exception 'El menú es demasiado grande'; end if;
  if jsonb_array_length(p_menu->'sections') > 12 then raise exception 'Máximo 12 secciones por menú'; end if;

  for s in select * from jsonb_array_elements(p_menu->'sections') loop
    if jsonb_typeof(s) <> 'object' or coalesce(s->>'id', '') !~ '^[a-z0-9]{1,12}$' then raise exception 'Una sección tiene un código inválido'; end if;
    if (s->>'id') = any(sec_ids) then raise exception 'Hay secciones con el código repetido'; end if;
    sec_ids := sec_ids || (s->>'id');
    if btrim(coalesce(s->>'title', '')) = '' or char_length(s->>'title') > 80 then raise exception 'Cada sección necesita un título (máximo 80 caracteres)'; end if;
    if char_length(coalesce(s->>'note', '')) > 120 then raise exception 'La nota de la sección "%" es muy larga', s->>'title'; end if;
    if jsonb_typeof(s->'items') is distinct from 'array' or jsonb_array_length(s->'items') > 30 then raise exception 'La sección "%" debe tener una lista de platos (máximo 30)', s->>'title'; end if;
    if jsonb_typeof(s->'price') is not null and jsonb_typeof(s->'price') <> 'null' then
      if jsonb_typeof(s->'price') <> 'number' or (s->>'price') !~ '^[1-9][0-9]{0,7}$' then raise exception 'El precio de la sección "%" no es válido', s->>'title'; end if;
    end if;
    if jsonb_typeof(s->'includes') = 'array' then
      if jsonb_array_length(s->'includes') > 10 then raise exception 'Demasiados "incluye" en "%"', s->>'title'; end if;
      for v in select jsonb_array_elements_text(s->'includes') loop
        if char_length(v) > 40 then raise exception 'Un "incluye" de "%" es muy largo', s->>'title'; end if;
      end loop;
    end if;

    item_ids := '{}';
    for i in select * from jsonb_array_elements(s->'items') loop
      if jsonb_typeof(i) <> 'object' or coalesce(i->>'id', '') !~ '^[a-z0-9]{1,12}$' then raise exception 'Un plato de "%" tiene un código inválido', s->>'title'; end if;
      if (i->>'id') = any(item_ids) then raise exception 'Hay platos con el código repetido en "%"', s->>'title'; end if;
      item_ids := item_ids || (i->>'id');
      if btrim(coalesce(i->>'name', '')) = '' or char_length(i->>'name') > 80 then raise exception 'Cada plato necesita un nombre (máximo 80 caracteres) en "%"', s->>'title'; end if;
      if char_length(coalesce(i->>'desc', '')) > 200 then raise exception 'La descripción de "%" es muy larga', i->>'name'; end if;
      if char_length(coalesce(i->>'art', '')) > 30 or char_length(coalesce(i->>'choiceLabel', '')) > 40 then raise exception 'Datos demasiado largos en "%"', i->>'name'; end if;
      if jsonb_typeof(i->'price') is not null and jsonb_typeof(i->'price') <> 'null' then
        if jsonb_typeof(i->'price') <> 'number' or (i->>'price') !~ '^[1-9][0-9]{0,7}$' then raise exception 'El precio de "%" no es válido', i->>'name'; end if;
      end if;
      if (i->>'price') is null and (s->>'price') is null then raise exception '"%" no tiene precio (ponle uno o ponle precio a la sección)', i->>'name'; end if;
      foreach v in array array['parts', 'choices'] loop
        if jsonb_typeof(i->v) = 'array' then
          if jsonb_array_length(i->v) > 12 then raise exception 'Demasiadas opciones en "%"', i->>'name'; end if;
          if exists (select 1 from jsonb_array_elements_text(i->v) x where char_length(x) > 40) then raise exception 'Una opción de "%" es muy larga', i->>'name'; end if;
        end if;
      end loop;
    end loop;
  end loop;
end $$;

-- Crea el pedido. El cliente solo manda {id, qty, detail}: nombres y PRECIOS salen del menú de hoy.
create or replace function public.create_order(
  p_name text, p_phone text, p_type text, p_table integer,
  p_address text, p_notes text, p_items jsonb, p_total integer
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_menu jsonb;
  v_n integer; v_ok integer; v_sum bigint; v_items jsonb;
  v_id uuid; v_code integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Los productos del pedido no son válidos';
  end if;

  select menu into v_menu from public.daily_menus
   where day = extract(dow from (now() at time zone 'America/Bogota'))::int;
  if v_menu is null or jsonb_array_length(v_menu->'sections') = 0 then
    raise exception 'Hoy no hay menú del día publicado';
  end if;

  with req as (
    select e->>'id' as id, (e->>'qty')::integer as qty, left(coalesce(e->>'detail', ''), 200) as detail
      from jsonb_array_elements(p_items) e),
  cat as (
    select (s->>'id') || '.' || (i->>'id') as id, i->>'name' as name,
           coalesce((i->>'price')::integer, (s->>'price')::integer) as price
      from jsonb_array_elements(v_menu->'sections') s, jsonb_array_elements(s->'items') i),
  j as (
    select req.qty, req.detail, req.id, cat.name, cat.price
      from req left join cat on cat.id = req.id)
  select count(*),
         count(*) filter (where name is not null and price > 0 and qty between 1 and 50),
         coalesce(sum(qty::bigint * price), 0),
         jsonb_agg(jsonb_build_object('id', id, 'name', name, 'qty', qty, 'price', price, 'detail', nullif(detail, '')))
    into v_n, v_ok, v_sum, v_items
    from j;

  if v_n <> v_ok then raise exception 'Algún plato ya no está en el menú de hoy. Actualiza la página y vuelve a armar tu pedido'; end if;
  if v_sum <> p_total then raise exception 'El menú o los precios cambiaron. Actualiza la página y revisa tu pedido'; end if;

  insert into public.orders (customer_name, customer_phone, order_type, table_number, address, notes, items, total)
  values (btrim(p_name), nullif(btrim(p_phone), ''), p_type, p_table,
          nullif(btrim(p_address), ''), nullif(btrim(p_notes), ''), v_items, v_sum::integer)
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
revoke all on function public.get_daily_menus() from public;
grant execute on function public.get_daily_menus() to anon, authenticated;
revoke all on function public.validate_menu(jsonb) from public, anon, authenticated;

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

create or replace function public.admin_save_menu(p_key text, p_day integer, p_menu jsonb) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.check_admin_key(p_key) then
    perform pg_sleep(1);
    raise exception 'No autorizado' using errcode = '28000';
  end if;
  if p_day is null or p_day not between 0 and 6 then raise exception 'El día no es válido'; end if;
  perform public.validate_menu(p_menu);
  insert into public.daily_menus (day, menu) values (p_day, p_menu)
  on conflict (day) do update set menu = excluded.menu, updated_at = now();
  return json_build_object('day', p_day, 'saved', true);
end $$;

revoke all on function public.admin_list_orders(text) from public;
revoke all on function public.admin_set_status(text, uuid, text) from public;
revoke all on function public.admin_save_menu(text, integer, jsonb) from public;
revoke all on function public.check_admin_key(text) from public, anon, authenticated;
grant execute on function public.admin_list_orders(text) to anon, authenticated;
grant execute on function public.admin_set_status(text, uuid, text) to anon, authenticated;
grant execute on function public.admin_save_menu(text, integer, jsonb) to anon, authenticated;

-- 6) Acceso directo del panel -------------------------------------------
--    Registra la huella de la clave ADMIN_KEY que está en config.js. Quien abre
--    admin.html entra sin escribir nada. Para cambiar la clave: genera una nueva,
--    ponla en config.js, agrega aquí su huella (sha256 en hexadecimal) y borra la vieja
--    de admin_keys.
delete from public.admin_keys;   -- (versión anterior: claves de enlace privado)
insert into public.admin_keys (key_hash)
values ('4f8c6e9953477dd4c97c8dfba51c4b0d6ba5f98f31e7154342dc385710a8b57f')
on conflict do nothing;

-- 7) Menús iniciales ------------------------------------------------------
--    Domingo y Viernes salen de tus folletos. Lunes, martes, miércoles, jueves y sábado son
--    EJEMPLOS armados con los mismos platos y precios: cámbialos desde el panel (Menú de la semana).
--    Si ya editaste un día, volver a ejecutar este archivo NO lo pisa.
insert into public.daily_menus (day, menu) values (0, $m${"sections":[{"id":"s1","title":"Sancocho de gallina","note":"(Para todos nuestros platos)","price":25000,"includes":["Sancocho de gallina"],"items":[{"id":"i1","name":"Gallina guisada","desc":"Arroz, ensalada, maduro y jugo","parts":["Arroz","Ensalada","Maduro","Jugo"],"art":"gallina"},{"id":"i2","name":"Bondiola a la plancha","desc":"Papa salada","parts":["Papa salada"],"art":"bondiola"},{"id":"i3","name":"Filete de pollo a la plancha","desc":"Papa salada","parts":["Papa salada"],"art":"filete"},{"id":"i4","name":"Chuleta de cerdo","desc":"Papas francesas","parts":["Papas francesas"],"art":"chuleta"}]},{"id":"s2","title":"Limonadas","price":null,"items":[{"id":"i1","name":"Limonada natural","price":8000,"art":"limonada"},{"id":"i2","name":"Limonada de coco, cereza o hierbabuena","price":11000,"choices":["Coco","Cereza","Hierbabuena"],"choiceLabel":"Sabor","art":"limonada_coco"}]}]}$m$::jsonb) on conflict (day) do nothing;
insert into public.daily_menus (day, menu) values (1, $m${"sections":[{"id":"s1","title":"Sopa de maíz y principios","price":19000,"includes":["Sopa de maíz"],"items":[{"id":"i1","name":"Frijoles","art":"frijoles"},{"id":"i2","name":"Macarrones guisados","art":"macarrones"},{"id":"i3","name":"Papa amarilla en bechamel","art":"papa_bechamel"}]},{"id":"s2","title":"Carnes","price":22000,"items":[{"id":"i1","name":"Pollo sudado","art":"pollo_sudado"},{"id":"i2","name":"Cerdo asado","art":"cerdo"},{"id":"i3","name":"Filete de pollo","art":"filete"},{"id":"i4","name":"Res asada","art":"res"}]},{"id":"s3","title":"Limonadas","price":null,"items":[{"id":"i1","name":"Limonada natural","price":8000,"art":"limonada"},{"id":"i2","name":"Limonada de coco, cereza o hierbabuena","price":11000,"choices":["Coco","Cereza","Hierbabuena"],"choiceLabel":"Sabor","art":"limonada_coco"}]}]}$m$::jsonb) on conflict (day) do nothing;
insert into public.daily_menus (day, menu) values (2, $m${"sections":[{"id":"s1","title":"Sancocho de gallina","note":"(Para todos nuestros platos)","price":25000,"includes":["Sancocho de gallina"],"items":[{"id":"i1","name":"Gallina guisada","desc":"Arroz, ensalada, maduro y jugo","parts":["Arroz","Ensalada","Maduro","Jugo"],"art":"gallina"},{"id":"i2","name":"Bondiola a la plancha","desc":"Papa salada","parts":["Papa salada"],"art":"bondiola"},{"id":"i3","name":"Filete de pollo a la plancha","desc":"Papa salada","parts":["Papa salada"],"art":"filete"},{"id":"i4","name":"Chuleta de cerdo","desc":"Papas francesas","parts":["Papas francesas"],"art":"chuleta"}]},{"id":"s2","title":"Limonadas","price":null,"items":[{"id":"i1","name":"Limonada natural","price":8000,"art":"limonada"},{"id":"i2","name":"Limonada de coco, cereza o hierbabuena","price":11000,"choices":["Coco","Cereza","Hierbabuena"],"choiceLabel":"Sabor","art":"limonada_coco"}]}]}$m$::jsonb) on conflict (day) do nothing;
insert into public.daily_menus (day, menu) values (3, $m${"sections":[{"id":"s1","title":"Especial: Bandeja paisa","price":27000,"items":[{"id":"i1","name":"Bandeja paisa","desc":"Arroz, frijoles, chorizo, chicharrón, carne molida, huevo frito, aguacate, maduro y jugo","parts":["Arroz","Frijoles","Chorizo","Chicharrón","Carne molida","Huevo frito","Aguacate","Maduro","Jugo"],"art":"bandeja"}]},{"id":"s2","title":"Carnes","price":22000,"items":[{"id":"i1","name":"Pollo sudado","art":"pollo_sudado"},{"id":"i2","name":"Cerdo asado","art":"cerdo"},{"id":"i3","name":"Filete de pollo","art":"filete"},{"id":"i4","name":"Res asada","art":"res"}]},{"id":"s3","title":"Limonadas","price":null,"items":[{"id":"i1","name":"Limonada natural","price":8000,"art":"limonada"},{"id":"i2","name":"Limonada de coco, cereza o hierbabuena","price":11000,"choices":["Coco","Cereza","Hierbabuena"],"choiceLabel":"Sabor","art":"limonada_coco"}]}]}$m$::jsonb) on conflict (day) do nothing;
insert into public.daily_menus (day, menu) values (4, $m${"sections":[{"id":"s1","title":"Sopa de maíz y principios","price":19000,"includes":["Sopa de maíz"],"items":[{"id":"i1","name":"Frijoles","art":"frijoles"},{"id":"i2","name":"Macarrones guisados","art":"macarrones"},{"id":"i3","name":"Papa amarilla en bechamel","art":"papa_bechamel"}]},{"id":"s2","title":"Carnes","price":22000,"items":[{"id":"i1","name":"Pollo sudado","art":"pollo_sudado"},{"id":"i2","name":"Cerdo asado","art":"cerdo"},{"id":"i3","name":"Filete de pollo","art":"filete"},{"id":"i4","name":"Res asada","art":"res"}]},{"id":"s3","title":"Limonadas","price":null,"items":[{"id":"i1","name":"Limonada natural","price":8000,"art":"limonada"},{"id":"i2","name":"Limonada de coco, cereza o hierbabuena","price":11000,"choices":["Coco","Cereza","Hierbabuena"],"choiceLabel":"Sabor","art":"limonada_coco"}]}]}$m$::jsonb) on conflict (day) do nothing;
insert into public.daily_menus (day, menu) values (5, $m${"sections":[{"id":"s1","title":"Especial: Bandeja paisa","price":27000,"items":[{"id":"i1","name":"Bandeja paisa","desc":"Arroz, frijoles, chorizo, chicharrón, carne molida, huevo frito, aguacate, maduro y jugo","parts":["Arroz","Frijoles","Chorizo","Chicharrón","Carne molida","Huevo frito","Aguacate","Maduro","Jugo"],"art":"bandeja"}]},{"id":"s2","title":"Sopa de maíz y principios","price":19000,"includes":["Sopa de maíz"],"items":[{"id":"i1","name":"Frijoles","art":"frijoles"},{"id":"i2","name":"Macarrones guisados","art":"macarrones"},{"id":"i3","name":"Papa amarilla en bechamel","art":"papa_bechamel"}]},{"id":"s3","title":"Carnes","price":22000,"items":[{"id":"i1","name":"Pollo sudado","art":"pollo_sudado"},{"id":"i2","name":"Cerdo asado","art":"cerdo"},{"id":"i3","name":"Filete de pollo","art":"filete"},{"id":"i4","name":"Res asada","art":"res"}]},{"id":"s4","title":"Limonadas","price":null,"items":[{"id":"i1","name":"Limonada natural","price":8000,"art":"limonada"},{"id":"i2","name":"Limonada de coco, cereza o hierbabuena","price":11000,"choices":["Coco","Cereza","Hierbabuena"],"choiceLabel":"Sabor","art":"limonada_coco"}]}]}$m$::jsonb) on conflict (day) do nothing;
insert into public.daily_menus (day, menu) values (6, $m${"sections":[{"id":"s1","title":"Especial: Bandeja paisa","price":27000,"items":[{"id":"i1","name":"Bandeja paisa","desc":"Arroz, frijoles, chorizo, chicharrón, carne molida, huevo frito, aguacate, maduro y jugo","parts":["Arroz","Frijoles","Chorizo","Chicharrón","Carne molida","Huevo frito","Aguacate","Maduro","Jugo"],"art":"bandeja"}]},{"id":"s2","title":"Sancocho de gallina","note":"(Para todos nuestros platos)","price":25000,"includes":["Sancocho de gallina"],"items":[{"id":"i1","name":"Gallina guisada","desc":"Arroz, ensalada, maduro y jugo","parts":["Arroz","Ensalada","Maduro","Jugo"],"art":"gallina"},{"id":"i2","name":"Bondiola a la plancha","desc":"Papa salada","parts":["Papa salada"],"art":"bondiola"},{"id":"i3","name":"Filete de pollo a la plancha","desc":"Papa salada","parts":["Papa salada"],"art":"filete"},{"id":"i4","name":"Chuleta de cerdo","desc":"Papas francesas","parts":["Papas francesas"],"art":"chuleta"}]},{"id":"s3","title":"Limonadas","price":null,"items":[{"id":"i1","name":"Limonada natural","price":8000,"art":"limonada"},{"id":"i2","name":"Limonada de coco, cereza o hierbabuena","price":11000,"choices":["Coco","Cereza","Hierbabuena"],"choiceLabel":"Sabor","art":"limonada_coco"}]}]}$m$::jsonb) on conflict (day) do nothing;
