import { login } from "@/lib/actions";

export default function Login({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <form action={login} className="card space-y-3">
        <h1 className="text-lg font-semibold">Iniciar sesión</h1>
        {searchParams.error && <p className="text-sm text-red-600">Credenciales incorrectas.</p>}
        <input className="input" name="email" type="email" placeholder="Correo" required />
        <input className="input" name="password" type="password" placeholder="Contraseña" required />
        <button className="btn w-full">Entrar</button>
      </form>
    </main>
  );
}
