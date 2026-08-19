import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import introVideoAsset from "@/assets/intro/video/intro-marina-renascida-final.mp4.asset.json";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/intro")({
  component: IntroPage,
});

type IntroState = "waiting_touch" | "video_playing" | "fade_out" | "copy_reveal" | "navigating";

function IntroPage() {
  const [state, setState] = useState<IntroState>("waiting_touch");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const handleStart = () => {
    const video = videoRef.current;

    if (!video) {
      console.error("Intro video ref is missing");
      return;
    }

    video.muted = false;
    video.volume = 1;

    const playPromise = video.play();

    if (playPromise) {
      playPromise.catch((err) => {
        console.error("Intro video play failed", {
          name: err?.name,
          message: err?.message,
          readyState: video.readyState,
          networkState: video.networkState,
          currentSrc: video.currentSrc,
        });

        // MUITO IMPORTANTE:
        // manter o overlay disponível para tentar novamente
        setState("waiting_touch");
      });
    }
  };

  const handleVideoEnded = () => {
    // Keep last frame frozen, just change state to show overlay
    setState("copy_reveal");
  };

  const handleEnterExperience = () => {
    if (state === "navigating") return;
    setState("navigating");
    
    // Fade for navigation
    setTimeout(() => {
      navigate({ to: "/dev/door-scene", search: { autostart: "1" } });
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black text-white font-sans overflow-hidden selection:bg-white/20">
      {/* VIDEO PERSISTENTE — FORA DO ANIMATEPRESENCE */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-black"
      >
        <video
          ref={videoRef}
          src={introVideoAsset.url}
          className="h-full w-full object-cover md:aspect-[9/16] md:w-auto"
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          muted={false}
          onPlaying={() => {
            setState("video_playing");
          }}
        />

        {/* Cinematic Gradient Overlay */}
        <div 
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 pointer-events-none z-0",
            state === "copy_reveal" || state === "navigating" ? "opacity-100" : "opacity-0"
          )}
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.02) 20%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.65) 75%, rgba(0,0,0,0.95) 100%)"
          }}
        />
      </div>

      {/* SOMENTE O OVERLAY USA ANIMATEPRESENCE */}
      <AnimatePresence>
        {state === "waiting_touch" && (
          <motion.div
            key="waiting-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 cursor-pointer backdrop-blur-[2px]"
            onClick={handleStart}
          >
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-white text-xs tracking-[0.3em] font-light uppercase"
            >
              Toque para começar
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COPY PODE TER SEU PRÓPRIO ANIMATEPRESENCE */}
      <AnimatePresence>
        {(state === "copy_reveal" || state === "navigating") && (
          <motion.div
            key="copy-panel-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: state === "navigating" ? 0 : 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-end px-4 pb-[safe-area-inset-bottom] md:pb-12 pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className={cn(
                "w-[92%] max-w-[560px] pointer-events-auto",
                "bg-[rgba(12,12,15,0.76)] backdrop-blur-[16px]",
                "border border-white/5 rounded-[24px]",
                "shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
                "p-6 md:p-8 mb-4 md:mb-0 space-y-6"
              )}
            >
              {/* Hierarquia de Copy */}
              <div className="space-y-4">
                <span className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase font-medium block">
                  Antes de entrar
                </span>
                
                <h1 className="text-2xl md:text-3xl font-semibold leading-tight tracking-tight text-white">
                  "Talvez você chame de personalidade o que um dia foi sobrevivência."
                </h1>

                <div className="space-y-1">
                  <p className="text-sm md:text-base text-zinc-300 font-light">
                    Você vai assistir Marina.
                  </p>
                  <p className="text-sm md:text-base text-zinc-300 font-light">
                    Em alguns momentos, vai responder por você.
                  </p>
                </div>

                <div className="pt-2">
                  <p className="text-sm md:text-base text-white font-medium border-l-2 border-white/20 pl-3">
                    Não tente acertar. <br />
                    <span className="opacity-90">Responda com sinceridade.</span>
                  </p>
                </div>
              </div>

              {/* CTA Section */}
              <div className="space-y-4 pt-2">
                <button
                  onClick={handleEnterExperience}
                  disabled={state === "navigating"}
                  className={cn(
                    "w-full py-5 px-8 bg-white text-black text-sm tracking-[0.15em] font-bold uppercase",
                    "flex items-center justify-between group rounded-xl transition-all duration-300 active:scale-[0.98]",
                    state === "navigating" && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span>Entrar na Experiência</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[10px] text-zinc-500 tracking-wider uppercase font-medium">
                    Use fones. Não pule.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FADE DE NAVEGAÇÃO */}
      <AnimatePresence>
        {state === "navigating" && (
          <motion.div
            key="navigation-fade"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-[100] bg-black pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}