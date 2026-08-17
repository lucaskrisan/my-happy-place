import { Link } from "@tanstack/react-router";

export function DevBackButton() {
  return (
    <Link
      to="/dev"
      className="inline-flex items-center justify-center rounded-lg bg-zinc-800 px-6 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 border border-zinc-700"
    >
      Voltar ao /dev
    </Link>
  );
}

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
