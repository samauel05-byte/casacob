import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_REMINDER, deliver, money, render, type Client } from "./messaging";

export interface InvoiceRow {
  id: string;
  concept: string;
  amount: number;
  currency: string;
  due_date: string;
  payment_link: string | null;
  reminder_count: number;
  clients: Client;
}

/** Envía el recordatorio de un cobro por todos los canales disponibles del cliente. */
export async function remindInvoice(db: SupabaseClient, inv: InvoiceRow) {
  const body = render(DEFAULT_REMINDER, {
    nombre: inv.clients.name,
    negocio: process.env.BUSINESS_NAME ?? "nuestra empresa",
    concepto: inv.concept,
    monto: money(Number(inv.amount), inv.currency),
    vencimiento: inv.due_date,
    link: inv.payment_link ? `Paga aquí: ${inv.payment_link}` : "",
  });
  const result = await deliver({
    db,
    client: inv.clients,
    channels: ["email", "whatsapp"],
    kind: "reminder",
    subject: `Recordatorio de pago: ${inv.concept}`,
    body,
    invoiceId: inv.id,
  });
  if (result.sent > 0) {
    await db
      .from("invoices")
      .update({ last_reminder_at: new Date().toISOString(), reminder_count: inv.reminder_count + 1 })
      .eq("id", inv.id);
  }
  return result;
}

const DAY = 86_400_000;

/**
 * Regla automática: avisa 3 días antes, 1 día antes, el día del vencimiento
 * y luego cada 3 días mientras siga vencido. Máximo un aviso por día.
 */
export function shouldRemind(dueDate: string, lastReminderAt: string | null, now = new Date()) {
  const today = new Date(now.toISOString().slice(0, 10)).getTime();
  const diff = Math.round((new Date(dueDate).getTime() - today) / DAY); // >0 faltan días
  if (lastReminderAt && lastReminderAt.slice(0, 10) === now.toISOString().slice(0, 10)) return false;
  if (diff === 3 || diff === 1 || diff === 0) return true;
  return diff < 0 && Math.abs(diff) % 3 === 0;
}
