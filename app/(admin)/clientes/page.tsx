import { supabaseServer } from "@/lib/supabase/server";
import { createClient, deleteClient } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Clientes() {
  const { data: clients } = await supabaseServer().from("clients").select("*").order("created_at", { ascending: false });
  return (
    <div className="space-y-6">
      <form action={createClient} className="card grid gap-3 md:grid-cols-3">
        <input className="input" name="name" placeholder="Nombre *" required />
        <input className="input" name="email" type="email" placeholder="Correo" />
        <input className="input" name="phone" placeholder="WhatsApp (+18095551234)" />
        <input className="input" name="company" placeholder="Empresa" />
        <input className="input" name="tags" placeholder="Etiquetas separadas por coma (web, vip)" />
        <input className="input" name="notes" placeholder="Notas" />
        <button className="btn md:col-span-3">Agregar cliente</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Nombre</th><th className="th">Correo</th><th className="th">WhatsApp</th><th className="th">Etiquetas</th><th /></tr></thead>
          <tbody>
            {(clients ?? []).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="td">{c.name}{c.company && <span className="text-slate-500"> · {c.company}</span>}</td>
                <td className="td">{c.email}</td>
                <td className="td">{c.phone}</td>
                <td className="td">{(c.tags as string[]).join(", ")}</td>
                <td className="td"><form action={deleteClient}><input type="hidden" name="id" value={c.id} /><button className="btn-sm">Eliminar</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
