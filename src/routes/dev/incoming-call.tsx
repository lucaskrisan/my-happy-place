import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DevBackButton } from "@/components/dev-tools";
import { IncomingCallOverlay, CallState } from "@/components/dev/IncomingCallOverlay";

export const Route = createFileRoute("/dev/incoming-call")({
  component: IncomingCallPage,
});

function IncomingCallPage() {
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [debugState, setDebugState] = useState<CallState>("idle");
  const [lastAction, setLastAction] = useState<string>("none");
  const [duration, setDuration] = useState(0);

  // Sync debug state with component state would require a callback, 
  // but for the lab we can manage it via props and state
  
  const handleStart = () => {
    setIsCallOpen(true);
    setDebugState("incoming");
    setLastAction("start_call");
  };

  const handleReset = () => {
    setIsCallOpen(false);
    setDebugState("idle");
    setLastAction("reset");
    setDuration(0);
  };

  const handleAccept = () => {
    setDebugState("active");
    setLastAction("accept");
  };

  const handleDecline = () => {
    setDebugState("declined");
    setLastAction("decline");
    // The overlay will close itself after a delay
  };

  const handleEnd = () => {
    setDebugState("ended");
    setLastAction("end");
    // The overlay will close itself after a delay
  };

  // Duration simulation for debug panel
  useEffect(() => {
    let timer: number;
    if (debugState === "active") {
      timer = window.setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [debugState]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <DevBackButton />
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 mb-8">
          <h1 className="text-3xl font-bold mb-2">Laboratório de Ligação</h1>
          <p className="text-zinc-400 mb-8">
            Teste o comportamento da chamada recebida. O componente abaixo é o mesmo que será usado na narrativa.
          </p>

          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={handleStart}
              disabled={isCallOpen}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-900/20"
            >
              Iniciar ligação
            </button>
            
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors border border-zinc-700"
            >
              Resetar
            </button>
          </div>

          <div className="bg-black/40 rounded-xl p-6 border border-zinc-800/50 font-mono text-sm">
            <h3 className="text-zinc-500 uppercase tracking-widest text-xs font-bold mb-4">Call Debug</h3>
            
            <div className="grid grid-cols-2 gap-y-3">
              <span className="text-zinc-400">State:</span>
              <span className={cn(
                "font-bold",
                debugState === 'idle' ? "text-zinc-600" : 
                debugState === 'incoming' ? "text-yellow-500" :
                debugState === 'active' ? "text-green-500" : "text-blue-400"
              )}>{debugState}</span>
              
              <span className="text-zinc-400">Duration:</span>
              <span>{duration}s</span>
              
              <span className="text-zinc-400">Last Action:</span>
              <span className="text-zinc-300">{lastAction}</span>
              
              <span className="text-zinc-400">Ringtone:</span>
              <span className={debugState === 'incoming' ? "text-green-500" : "text-zinc-600"}>
                {debugState === 'incoming' ? "playing (loop)" : "stopped"}
              </span>

              <span className="text-zinc-400">Voice Audio:</span>
              <span className={debugState === 'active' ? "text-green-500" : "text-zinc-600"}>
                {debugState === 'active' ? "playing" : "stopped"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
            <h4 className="font-bold mb-2 text-sm uppercase text-zinc-500 tracking-wider">Test Config</h4>
            <ul className="text-sm space-y-2 text-zinc-400">
              <li>• Caller: Mamãe</li>
              <li>• Subtitle: Ligação recebida</li>
              <li>• Audio: Simulation mode</li>
            </ul>
          </div>
          <div className="p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
            <h4 className="font-bold mb-2 text-sm uppercase text-zinc-500 tracking-wider">Technical</h4>
            <ul className="text-sm space-y-2 text-zinc-400">
              <li>• 100dvh & safe-area support</li>
              <li>• Web Audio preparation enabled</li>
              <li>• Cleanup on unmount verified</li>
            </ul>
          </div>
        </div>
      </div>

      <IncomingCallOverlay
        open={isCallOpen}
        callerName="Mamãe"
        callerSubtitle="Ligação recebida"
        onAccept={handleAccept}
        onDecline={handleDecline}
        onEnd={handleEnd}
        autoEndAfterAudio={true}
      />
    </div>
  );
}

// Helper function for conditional classes
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
