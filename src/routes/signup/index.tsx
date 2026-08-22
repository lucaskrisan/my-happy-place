import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

export const Route = createFileRoute("/signup/")({ component: SignupPage });

const stripePromise = loadStripe(import.meta.env["VITE_STRIPE_PUBLISHABLE_KEY"] as string);

// No order bumps exist yet — this list stays empty until real ones are defined, but the checkout layout
// below already has the section wired to render whatever's here, so adding one later is just adding an
// entry to this array (each needs its own Stripe Price id, added the same way STRIPE_PRICE_ID was).
const ORDER_BUMPS: { id: string; name: string; description: string; price: string }[] = [];

const COUNTRY_CODES = [
  { code: "+55", label: "🇧🇷 +55" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+351", label: "🇵🇹 +351" },
  { code: "+34", label: "🇪🇸 +34" },
  { code: "+52", label: "🇲🇽 +52" },
];

function CheckoutForm({ email, name, phone }: { email: string; name: string; phone: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError("");
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/signup/success` },
    });
    setSubmitting(false);
    if (confirmError) setError(confirmError.message || "Não foi possível concluir o pagamento.");
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement options={{ defaultValues: { billingDetails: { email, name, phone } } }} />

      {ORDER_BUMPS.length > 0 && (
        <div className="rounded-xl border border-studio-primary/30 bg-studio-primary-soft p-4">
          <p className="text-center text-sm font-semibold text-studio-text">🎁 Você tem {ORDER_BUMPS.length} oferta(s) única(s)!</p>
          <div className="mt-3 space-y-2">
            {ORDER_BUMPS.map((bump) => (
              <label key={bump.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-dashed border-studio-primary/40 bg-white/[.04] p-3 text-sm">
                <input
                  type="checkbox"
                  checked={selectedBumps.has(bump.id)}
                  onChange={(event) => setSelectedBumps((prev) => { const next = new Set(prev); if (event.target.checked) next.add(bump.id); else next.delete(bump.id); return next; })}
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium text-studio-text">{bump.name}</span>
                  <span className="block text-xs text-studio-text-muted">{bump.description}</span>
                  <span className="block text-studio-primary-strong font-semibold">{bump.price}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-studio-error">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-lg bg-studio-success px-4 py-3 text-sm font-semibold text-[#0b1410] transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Processando…" : "COMPRAR AHORA"}
      </button>
      <p className="text-center text-xs text-studio-text-muted">🔒 Protegido por Stripe</p>
    </form>
  );
}

function SignupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+55");
  const [phone, setPhone] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const response = await fetch("/api/billing/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: name.trim(), phone: `${countryCode}${phone.trim()}` }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error || "Não foi possível iniciar o pagamento.");
      return;
    }
    setClientSecret(result.clientSecret);
  };

  const stripeOptions = useMemo(() => (clientSecret ? { clientSecret, appearance: { theme: "night" as const, variables: { colorPrimary: "#5b8def" } } } : undefined), [clientSecret]);

  return (
    <main className="min-h-screen bg-studio-bg px-4 py-10 text-studio-text">
      <div className="mx-auto max-w-md rounded-2xl border border-studio-border bg-studio-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-studio-text-muted">Estás comprando:</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-studio-primary-soft text-lg font-bold text-studio-primary-strong">FS</div>
          <div>
            <p className="font-semibold text-studio-text">Funnel Studio — Acesso</p>
            <p className="text-lg font-bold text-studio-success">US$97,00<span className="text-sm font-normal text-studio-text-muted"> /mês</span></p>
          </div>
        </div>

        <div className="my-6 h-px bg-studio-border" />

        {!clientSecret ? (
          <form onSubmit={startCheckout} className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-studio-text-secondary">Datos personales</p>
            <label className="block text-sm text-studio-text-secondary">
              Tu correo
              <input type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tucorreo@ejemplo.com" className="mt-1.5 w-full rounded-lg border border-studio-border bg-white/[.04] p-3 text-sm text-studio-text placeholder:text-studio-text-muted focus:border-studio-primary/50 focus:outline-none" />
            </label>
            <label className="block text-sm text-studio-text-secondary">
              Tu nombre
              <input type="text" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre y apellido" className="mt-1.5 w-full rounded-lg border border-studio-border bg-white/[.04] p-3 text-sm text-studio-text placeholder:text-studio-text-muted focus:border-studio-primary/50 focus:outline-none" />
            </label>
            <label className="block text-sm text-studio-text-secondary">
              Tu celular
              <div className="mt-1.5 flex gap-2">
                <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="rounded-lg border border-studio-border bg-white/[.04] px-2 text-sm text-studio-text focus:border-studio-primary/50 focus:outline-none">
                  {COUNTRY_CODES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                </select>
                <input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="11 91234-5678" className="w-full rounded-lg border border-studio-border bg-white/[.04] p-3 text-sm text-studio-text placeholder:text-studio-text-muted focus:border-studio-primary/50 focus:outline-none" />
              </div>
            </label>
            {error && <p className="text-sm text-studio-error">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-studio-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-studio-primary-strong disabled:opacity-50">
              {loading ? "Carregando…" : "Continuar para pagamento"}
            </button>
          </form>
        ) : stripeOptions ? (
          <Elements stripe={stripePromise} options={stripeOptions}>
            <CheckoutForm email={email} name={name} phone={`${countryCode}${phone}`} />
          </Elements>
        ) : null}
      </div>
    </main>
  );
}
