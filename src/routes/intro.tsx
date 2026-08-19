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
            transition={{ duration: 0.8 }}
            className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-6 pb-[calc(2rem+safe-area-inset-bottom)] md:pb-16 pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn(
                "w-full max-w-[480px] pointer-events-auto",
                "space-y-8"
              )}
            >
              {/* Hierarquia de Copy */}
              <div className="space-y-6">
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-[10px] tracking-[0.4em] text-white/50 uppercase font-medium block text-center"
                >
                  Antes de entrar
                </motion.span>
                
                <h1 className="text-2xl md:text-3xl font-semibold leading-tight tracking-tight text-white text-center">
                  "Talvez você chame de personalidade o que um dia foi sobrevivência."
                </h1>

                <div className="space-y-2 text-center">
                  <p className="text-[15px] md:text-lg text-white/70 font-light leading-relaxed">
                    Você vai assistir Marina. <br/>
                    Em alguns momentos, vai responder por você.
                  </p>
                </div>

                <div className="flex justify-center">
                  <p className="text-[14px] md:text-[17px] text-white/80 font-medium border-l border-white/30 pl-5 py-2 max-w-[320px]">
                    Não tente acertar. <br />
                    <span className="text-white/60 font-light italic">Responda com sinceridade.</span>
                  </p>
                </div>
              </div>

              {/* CTA Section */}
              <div className="space-y-6 pt-2 flex flex-col items-center">
                <motion.button
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  onClick={handleEnterExperience}
                  disabled={state === "navigating"}
                  className={cn(
                    "w-full max-w-[320px] py-4 px-8 bg-white/95 text-black text-[13px] tracking-[0.2em] font-bold uppercase",
                    "flex items-center justify-center gap-3 group rounded-full transition-all duration-300 active:scale-[0.97] hover:bg-white shadow-xl shadow-black/20",
                    state === "navigating" && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span>Entrar na Experiência</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-[9px] text-white/40 tracking-[0.25em] uppercase font-medium"
                >
                  Use fones. Não pule.
                </motion.p>
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