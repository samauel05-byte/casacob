"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import { deliver, render, type Channel, type Client } from "./messaging";
import { remindInvoice, type InvoiceRow } from "./reminders";

const s = (f: FormData, k: string) => (String(f.get(k) ?? "").trim() || null);

export async function login(f: FormData) {
  const { error } = await supabaseServer().auth.signInWithPassword({
    email: String(f.get("email")),
    password: String(f.get("password")),
  });
  if (error) redirect("/login?error=1");
  redirect("/");
}

export async function logout() {
  await supabaseServer().auth.signOut();
  redirect("/login");
}

// Clientes ------------------------------------------------------------------
export async function createClient(f: FormData) {
  const tags = (s(f, "tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  await supabaseServer().from("clients").insert({
    name: s(f, "name"), email: s(f, "email"), phone: s(f, "phone"),
    company: s(f, "company"), notes: s(f, "notes"), tags,
  });
  revalidatePath("/clientes");
}

export async function deleteClient(f: FormData) {
  await supabaseServer().from("clients").delete().eq("id", String(f.get("id")));
  revalidatePath("/clientes");
}

// Cobros --------------------------------------------------------------------
export async function createInvoice(f: FormData) {
  await supabaseServer().from("invoices").insert({
    client_id: s(f, "client_id"), concept: s(f, "concept"),
    amount: Number(f.get("amount")), currency: s(f, "currency") === "USD" ? "USD" : "DOP",
    due_date: s(f, "due_date"), payment_link: s(f, "payment_link"),
  });
  revalidatePath("/cobros");
  revalidatePath("/");
}

export async function markPaid(f: FormData) {
  await supabaseServer().from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", String(f.get("id")));
  revalidatePath("/cobros");
  revalidatePath("/");
}

export async function sendReminder(f: FormData) {
  const db = supabaseServer();
  const { data } = await db.from("invoices").select("*, clients(*)").eq("id", String(f.get("id"))).single();
  if (data) await remindInvoice(db, data as InvoiceRow);
  revalidatePath("/cobros");
  revalidatePath("/historial");
}

// Promociones ---------------------------------------------------------------
export async function sendCampaign(f: FormData) {
  const db = supabaseServer();
  const channel = String(f.get("channel")) as "email" | "whatsapp" | "both";
  const tag = s(f, "audience_tag");
  const subject = s(f, "subject") ?? "";
  const body = String(f.get("body"));

  const { data: camp } = await db.from("campaigns")
    .insert({ name: s(f, "name"), channel, subject, body, audience_tag: tag })
    .select().single();

  let q = db.from("clients").select("*");
  if (tag) q = q.contains("tags", [tag]);
  const { data: clients } = await q;

  const channels: Channel[] = channel === "both" ? ["email", "whatsapp"] : [channel];
  let sent = 0, failed = 0;
  for (const c of (clients ?? []) as Client[]) {
    const vars = { nombre: c.name, empresa: c.company, negocio: process.env.BUSINESS_NAME };
    const r = await deliver({
      db, client: c, channels, kind: "promo", campaignId: camp.id,
      subject: render(subject, vars), body: render(body, vars),
    });
    sent += r.sent; failed += r.failed;
  }
  await db.from("campaigns").update({
    status: "sent", sent_count: sent, failed_count: failed, sent_at: new Date().toISOString(),
  }).eq("id", camp.id);
  revalidatePath("/promociones");
  revalidatePath("/historial");
}
