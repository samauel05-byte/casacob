import { supabaseServer } from "@/lib/supabase/server";
import { createInvoice, markPaid, sendReminder } from "@/lib/actions";
import { money } from "@/lib/messaging";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const badge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-600",
};

export default async function Cobros() {
  const db = supabaseServer();
  const [{ data: clients }, { data: invoices }] = await Promise.all([
    db.from("clients").select("id,name").order("name"),
    db.from("invoices").select("*, clients(name)").order("due_date"),
  ]);
  return (
    <div className="space-y-6">
      <form action={createInvoice} className="card grid gap-3 md:grid-cols-3">
        <select className="input" name="client_id" required>
          <option value="">Cliente…</option>
          {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="input" name="concept" placeholder="Concepto (ej. Página web - cuota 2)" required />
        <input className="input" name="amount" type="number" step="0.01" placeholder="Monto" required />
        <input className="input" name="currency" defaultValue="USD" />
        <input className="input" name="due_date" type="date" required />
        <input className="input" name="payment_link" placeholder="Enlace de pago (opcional)" />
        <button className="btn md:col-span-3">Crear cobro</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Cliente</th><th className="th">Concepto</th><th className="th">Monto</th><th className="th">Vence</th><th className="th">Estado</th><th className="th">Avisos</th><th /></tr></thead>
          <tbody>
            {(invoices ?? []).map((i) => (
              <tr key={i.id} className="border-t">
                <td className="td">{i.clients?.name}</td>
                <td className="td">{i.concept}</td>
                <td className="td">{money(Number(i.amount), i.currency)}</td>
                <td className="td">{i.due_date}</td>
                <td className="td"><span className={`rounded px-2 py-0.5 text-xs ${badge[i.status]}`}>{i.status}</span></td>
                <td className="td">{i.reminder_count}</td>
                <td className="td flex gap-2">
                  {i.status !== "paid" && i.status !== "cancelled" && (<>
                    <form action={sendReminder}><input type="hidden" name="id" value={i.id} /><button className="btn-sm">Recordar</button></form>
                    <form action={markPaid}><input type="hidden" name="id" value={i.id} /><button className="btn-sm">Marcar pagado</button></form>
                  </>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
