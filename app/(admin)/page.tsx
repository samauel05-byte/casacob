import { supabaseServer } from "@/lib/supabase/server";
import { money } from "@/lib/messaging";

export const dynamic = "force-dynamic";

export default async function Resumen() {
  const db = supabaseServer();
  const [{ data: open }, { data: paid }, { count }, { data: recent }] = await Promise.all([
    db.from("invoices").select("amount,status,currency").in("status", ["pending", "overdue"]),
    db.from("invoices").select("amount").eq("status", "paid")
      .gte("paid_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    db.from("clients").select("*", { count: "exact", head: true }),
    db.from("message_log").select("*, clients(name)").order("created_at", { ascending: false }).limit(8),
  ]);
  const sum = (r: { amount: number }[] | null) => (r ?? []).reduce((a, x) => a + Number(x.amount), 0);
  const overdue = (open ?? []).filter((i) => i.status === "overdue");

  const stats = [
    ["Por cobrar", money(sum(open))],
    ["Vencido", money(sum(overdue))],
    ["Cobrado este mes", money(sum(paid))],
    ["Clientes", String(count ?? 0)],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="card"><p className="text-xs text-slate-500">{k}</p><p className="text-xl font-semibold">{v}</p></div>
        ))}
      </div>
      <div className="card">
        <h2 className="mb-2 font-medium">Últimos mensajes</h2>
        <table className="w-full"><tbody>
          {(recent ?? []).map((m) => (
            <tr key={m.id} className="border-t">
              <td className="td">{m.clients?.name ?? "—"}</td>
              <td className="td">{m.channel}</td>
              <td className="td">{m.kind}</td>
              <td className={`td ${m.status === "failed" ? "text-red-600" : "text-green-700"}`}>{m.status}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}
