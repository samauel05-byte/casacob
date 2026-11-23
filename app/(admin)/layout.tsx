import Link from "next/link";
import { logout } from "@/lib/actions";

const nav = [
  ["/", "Resumen"],
  ["/clientes", "Clientes"],
  ["/cobros", "Cobros"],
  ["/promociones", "Promociones"],
  ["/historial", "Historial"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <span className="font-semibold">{process.env.BUSINESS_NAME ?? "Administración"}</span>
        <nav className="flex flex-1 gap-4 text-sm">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="text-slate-600 hover:text-slate-900">{label}</Link>
          ))}
        </nav>
        <form action={logout}><button className="btn-sm">Salir</button></form>
      </header>
      {children}
    </div>
  );
}
