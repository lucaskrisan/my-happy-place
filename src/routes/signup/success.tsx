import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/signup/success")({ component: SignupSuccessPage });

function SignupSuccessPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-studio-bg px-6 text-center text-studio-text">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-wider text-studio-primary">Pagamento confirmado</p>
        <h1 className="mt-3 text-2xl font-semibold">Verifique seu e-mail</h1>
        <p className="mt-3 text-sm text-studio-text-secondary">
          Enviamos um link para você criar sua senha e acessar o Funnel Studio. Se não chegar em alguns minutos, olhe a caixa de spam.
        </p>
        <Link to="/login" className="mt-6 inline-block rounded-lg bg-studio-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-studio-primary-strong transition-colors">
          Ir para o login
        </Link>
      </div>
    </main>
  );
}
