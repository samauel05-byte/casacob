import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { remindInvoice, shouldRemind, type InvoiceRow } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  // Marca como vencidos los cobros pendientes cuya fecha ya pasó.
  await db.from("invoices").update({ status: "overdue" }).eq("status", "pending").lt("due_date", today);

  const { data, error } = await db
    .from("invoices")
    .select("*, clients(*)")
    .in("status", ["pending", "overdue"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let reminded = 0;
  for (const inv of (data ?? []) as (InvoiceRow & { due_date: string; last_reminder_at: string | null })[]) {
    if (!shouldRemind(inv.due_date, inv.last_reminder_at)) continue;
    const r = await remindInvoice(db, inv);
    if (r.sent > 0) reminded++;
  }
  return NextResponse.json({ checked: data?.length ?? 0, reminded });
}
