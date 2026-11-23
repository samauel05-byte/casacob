import type { SupabaseClient } from "@supabase/supabase-js";

export type Channel = "email" | "whatsapp";
export type Kind = "reminder" | "invoice" | "promo";

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  opt_in_email: boolean;
  opt_in_whatsapp: boolean;
}

/** Reemplaza {{variables}} en una plantilla. */
export function render(tpl: string, vars: Record<string, string | number | null | undefined>) {
  return tpl.replace(/{{\s*(\w+)\s*}}/g, (_, k) => String(vars[k] ?? ""));
}

export const CURRENCIES = ["DOP", "USD"] as const;

export const money = (n: number, currency = "DOP") =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency }).format(n);

/** Suma montos agrupados por moneda: { DOP: 1000, USD: 50 }. */
export function sumByCurrency(rows: { amount: number | string; currency: string }[] | null) {
  const out: Record<string, number> = {};
  for (const r of rows ?? []) out[r.currency] = (out[r.currency] ?? 0) + Number(r.amount);
  return out;
}

/** "RD$1,000.00 · US$50.00" (o RD$0.00 si no hay nada). */
export function moneyTotals(t: Record<string, number>) {
  const parts = CURRENCIES.filter((c) => t[c]).map((c) => money(t[c], c));
  return parts.length ? parts.join(" · ") : money(0, "DOP");
}

async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY");
  const html = text
    .split("\n")
    .map((l) => l.replace(/https?:\/\/\S+/g, (u) => `<a href="${u}">${u}</a>`))
    .join("<br>");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function sendWhatsApp(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) throw new Error("Faltan credenciales de Twilio");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:${from}`,
      To: `whatsapp:${to.replace(/\s/g, "")}`,
      Body: body,
    }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}

interface DeliverOpts {
  db: SupabaseClient;
  client: Client;
  channels: Channel[];
  kind: Kind;
  subject: string;
  body: string;
  invoiceId?: string;
  campaignId?: string;
}

/** Envía por cada canal permitido y registra el resultado. Devuelve {sent, failed}. */
export async function deliver(o: DeliverOpts) {
  let sent = 0;
  let failed = 0;
  for (const channel of o.channels) {
    const to = channel === "email" ? o.client.email : o.client.phone;
    const allowed = channel === "email" ? o.client.opt_in_email : o.client.opt_in_whatsapp;
    if (!to || !allowed) continue;
    let error: string | null = null;
    try {
      if (channel === "email") await sendEmail(to, o.subject, o.body);
      else await sendWhatsApp(to, o.body);
      sent++;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      failed++;
    }
    await o.db.from("message_log").insert({
      client_id: o.client.id,
      invoice_id: o.invoiceId ?? null,
      campaign_id: o.campaignId ?? null,
      channel,
      kind: o.kind,
      to_address: to,
      body: o.body,
      status: error ? "failed" : "sent",
      error,
    });
  }
  return { sent, failed };
}

export const DEFAULT_REMINDER = `Hola {{nombre}}, te recordamos tu pago pendiente en {{negocio}}:

Concepto: {{concepto}}
Monto: {{monto}}
Vence: {{vencimiento}}
{{link}}

Si ya realizaste el pago, ignora este mensaje. ¡Gracias!`;
