import { supabaseServer } from "@/lib/supabase/server";
import { sendCampaign } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function Promociones() {
  const { data: campaigns } = await supabaseServer().from("campaigns").select("*").order("created_at", { ascending: false });
  return (
    <div className="space-y-6">
      <form action={sendCampaign} className="card grid gap-3 md:grid-cols-2">
        <input className="input" name="name" placeholder="Nombre interno de la campaña" required />
        <select className="input" name="channel" defaultValue="both">
          <option value="both">Correo + WhatsApp</option>
          <option value="email">Solo correo</option>
          <option value="whatsapp">Solo WhatsApp</option>
        </select>
        <input className="input" name="audience_tag" placeholder="Etiqueta de audiencia (vacío = todos)" />
        <input className="input" name="subject" placeholder="Asunto del correo" />
        <textarea className="input md:col-span-2" name="body" rows={6} required
          defaultValue={"Hola {{nombre}}, tenemos una promoción para ti en {{negocio}}: …"} />
        <p className="text-xs text-slate-500 md:col-span-2">Variables: {"{{nombre}} {{empresa}} {{negocio}}"}. Solo se envía a clientes que aceptaron recibir mensajes.</p>
        <button className="btn md:col-span-2">Enviar ahora</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr><th className="th">Campaña</th><th className="th">Canal</th><th className="th">Audiencia</th><th className="th">Enviados</th><th className="th">Fallidos</th><th className="th">Fecha</th></tr></thead>
          <tbody>
            {(campaigns ?? []).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="td">{c.name}</td><td className="td">{c.channel}</td>
                <td className="td">{c.audience_tag ?? "todos"}</td>
                <td className="td">{c.sent_count}</td><td className="td">{c.failed_count}</td>
                <td className="td">{c.sent_at?.slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
