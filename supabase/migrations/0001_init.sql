-- Esquema inicial del sistema de administración.
-- Puedes alimentar estas tablas desde el panel de Supabase (Table Editor / importar CSV)
-- o desde la propia aplicación.

create extension if not exists "pgcrypto";

-- Clientes ---------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,                       -- WhatsApp en formato internacional: +18095551234
  company text,
  tags text[] not null default '{}',-- segmentación: {'web','cliente-vip',...}
  notes text,
  opt_in_email boolean not null default true,
  opt_in_whatsapp boolean not null default true,
  created_at timestamptz not null default now()
);
create index clients_tags_idx on public.clients using gin (tags);

-- Cobros / facturas --------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  concept text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  due_date date not null,
  status text not null default 'pending'
    check (status in ('pending','paid','overdue','cancelled')),
  payment_link text,                -- enlace de pago (Stripe, PayPal, banco, etc.)
  paid_at timestamptz,
  last_reminder_at timestamptz,
  reminder_count int not null default 0,
  created_at timestamptz not null default now()
);
create index invoices_status_due_idx on public.invoices (status, due_date);

-- Campañas / promociones -----------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null default 'both' check (channel in ('email','whatsapp','both')),
  subject text,
  body text not null,
  audience_tag text,                -- null = todos los clientes
  status text not null default 'draft' check (status in ('draft','sent')),
  sent_count int not null default 0,
  failed_count int not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Historial de mensajes enviados ------------------------------------------------
create table public.message_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  channel text not null check (channel in ('email','whatsapp')),
  kind text not null check (kind in ('reminder','invoice','promo')),
  to_address text not null,
  body text not null,
  status text not null check (status in ('sent','failed')),
  error text,
  created_at timestamptz not null default now()
);
create index message_log_created_idx on public.message_log (created_at desc);

-- Seguridad: solo usuarios autenticados (tú) acceden. Desactiva "Allow new users
-- to sign up" en Supabase Auth para que nadie más pueda registrarse.
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.campaigns enable row level security;
alter table public.message_log enable row level security;

create policy "admin all" on public.clients for all to authenticated using (true) with check (true);
create policy "admin all" on public.invoices for all to authenticated using (true) with check (true);
create policy "admin all" on public.campaigns for all to authenticated using (true) with check (true);
create policy "admin all" on public.message_log for all to authenticated using (true) with check (true);
