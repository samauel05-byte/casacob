-- Monedas soportadas: pesos dominicanos (por defecto) y dólares.
alter table public.invoices alter column currency set default 'DOP';
alter table public.invoices
  add constraint invoices_currency_check check (currency in ('DOP','USD'));
