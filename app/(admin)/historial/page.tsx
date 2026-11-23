import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Historial() {
  const { data } = await supabaseServer()
    .from("message_log").select("*, clients(name)").order("created_at", { ascending: false }).limit(200);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead><tr><th className="th">Fecha</th><th className="th">Cliente</th><th className="th">Canal</th><th className="th">Tipo</th><th className="th">Estado</th><th className="th">Detalle</th></tr></thead>
        <tbody>
          {(data ?? []).map((m) => (
            <tr key={m.id} className="border-t">
              <td className="td whitespace-nowrap">{m.created_at.slice(0, 16).replace("T", " ")}</td>
              <td className="td">{m.clients?.name ?? "—"}</td>
              <td className="td">{m.channel}</td><td className="td">{m.kind}</td>
              <td className={`td ${m.status === "failed" ? "text-red-600" : "text-green-700"}`}>{m.status}</td>
              <td className="td max-w-xs truncate text-slate-500" title={m.error ?? m.body}>{m.error ?? m.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
