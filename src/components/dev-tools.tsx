import { Link, useLocation } from "@tanstack/react-router";

export function DevBackButton() {
  return (
    <Link
      to="/dev"
      className="inline-flex items-center justify-center rounded-lg bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 border border-zinc-700"
    >
      ← Voltar ao Dev Menu
    </Link>
  );
}

interface DevPlaceholderPageProps {
  number: string;
  title: string;
  description: string;
}

export function DevPlaceholderPage({ number, title, description }: DevPlaceholderPageProps) {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex flex-col items-center justify-center text-center font-sans">
      <div className="max-w-md w-full">
        <div className="inline-block px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-500 mb-6">
          {location.pathname}
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">
          <span className="text-zinc-600 mr-2">{number}</span>
          {title}
        </h1>
        
        <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
          {description}
        </p>
        
        <div className="flex flex-col gap-4">
          <div className="p-12 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30 text-zinc-600 mb-4">
            Módulo isolado para desenvolvimento e testes.
          </div>
          
          <DevBackButton />
        </div>
      </div>
    </div>
  );
}

export function DevSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">{title}</h2>
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6">
        {children}
      </div>
    </div>
  );
}

export function DevCard({
  icon,
  title,
  onClick,
  disabled
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  "data-testid"?: string;
}) {

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}


      className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all disabled:opacity-50 active:scale-95 text-center group"
    >
      <div className="mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
        {title}
      </span>
    </button>
  );
}

export function DevModuleLayout({ 
  title, 
  subtitle, 
  children 
}: { 
  title: string; 
  subtitle: string; 
  children?: React.ReactNode 
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">{title}</h1>
            <p className="text-zinc-400 text-lg">{subtitle}</p>
          </div>
          <DevBackButton />
        </header>
        
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

