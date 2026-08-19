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
  const [copyStep, setCopyStep] = useState(0);
  
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
    // Hold final frame for 250ms
    setTimeout(() => {
      setState("fade_out");
      // Fade to black (400ms transition)
      setTimeout(() => {
        setState("copy_reveal");
        startCopySequence();
      }, 400);
    }, 250);
  };

  const startCopySequence = () => {
    // Sequence timing
    const sequence = [
      { step: 1, delay: 0 },    // Headline
      { step: 2, delay: 3000 }, // Bloco de comportamentos
      { step: 3, delay: 6000 }, // Frase de impacto
      { step: 4, delay: 9000 }, // Preparação
      { step: 5, delay: 12000 } // CTA
    ];

    sequence.forEach(({ step, delay }) => {
      setTimeout(() => setCopyStep(step), delay);
    });
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
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black transition-opacity duration-[400ms]",
          state === "fade_out" || state === "copy_reveal" || state === "navigating"
            ? "opacity-0"
            : "opacity-100"
        )}
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
            key="copy-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: state === "navigating" ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-start overflow-y-auto px-6 py-20 bg-black scrollbar-hide"
          >
            <div className="w-full max-w-lg space-y-16">
              {/* Eyebrow + Headline */}
              {copyStep >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <span className="text-[10px] tracking-[0.4em] text-zinc-500 uppercase font-medium block">
                    Antes de entrar
                  </span>
                  <h1 className="text-3xl md:text-4xl font-light leading-tight tracking-tight text-zinc-100">
                    "Você pode passar anos chamando de personalidade aquilo que começou como sobrevivência."
                  </h1>
                </motion.div>
              )}

              {/* Second Block */}
              {copyStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="space-y-6 text-lg md:text-xl text-zinc-400 font-light leading-relaxed"
                >
                  <p>Você pede desculpa antes mesmo de saber o que fez.</p>
                  <p>Percebe quando alguém muda o tom antes de perceber o que você mesma está sentindo.</p>
                  <p>Se cala para evitar uma briga que talvez nem fosse acontecer.</p>
                  <p>E quando alguma coisa começa a dar certo...</p>
                  <p>às vezes é você mesma quem encontra um jeito de estragar primeiro.</p>
                </motion.div>
              )}

              {/* Impact Sentence */}
              {copyStep >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="space-y-8 py-8"
                >
                  <p className="text-zinc-500 text-lg font-light">Separadas, essas coisas parecem pequenas.</p>
                  <p className="text-2xl md:text-3xl text-white font-light leading-tight">
                    Dentro da mesma mulher, elas podem custar uma vida inteira.
                  </p>
                </motion.div>
              )}

              {/* Preparation */}
              {copyStep >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="space-y-8 border-t border-zinc-900 pt-16"
                >
                  <p className="text-zinc-400 font-light">
                    Nos próximos minutos você não vai responder sobre quem gostaria de ser.
                  </p>
                  <p className="text-xl text-zinc-200 font-light">
                    Vai responder sobre quem você se tornou quando aprendeu que era mais seguro se adaptar.
                  </p>
                  
                  <div className="space-y-2 pt-4">
                    <p className="text-zinc-500 text-sm font-light">Você vai assistir Marina.</p>
                    <p className="text-zinc-500 text-sm font-light">Vai escolher por ela.</p>
                    <p className="text-zinc-500 text-sm font-light">Vai responder por você.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-zinc-300 font-light italic">Não tente acertar.</p>
                    <p className="text-zinc-300 font-light italic text-lg">Responda com sinceridade.</p>
                  </div>
                </motion.div>
              )}

              {/* CTA */}
              {copyStep >= 5 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="space-y-6 pt-8 pb-20"
                >
                  <button
                    onClick={handleEnterExperience}
                    disabled={state === "navigating"}
                    className={cn(
                      "w-full py-6 px-8 bg-white text-black text-sm tracking-[0.2em] font-bold uppercase",
                      "flex items-center justify-between group transition-all duration-500 active:scale-95",
                      state === "navigating" && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span>Entrar na Experiência</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-[10px] text-zinc-500 tracking-wider text-center leading-relaxed">
                    Use fones. Não pule. Responda antes de racionalizar.
                  </p>
                </motion.div>
              )}
            </div>
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
}