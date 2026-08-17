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

// Keep the old layout for compatibility if needed, but update it to use the new back button text
export function DevModuleLayout({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex flex-col items-center justify-center text-center font-sans">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-zinc-400 mb-8">{description}</p>
        
        {children}
        
        <div className="mt-8">
          <DevBackButton />
        </div>
      </div>
    </div>
  );
}
