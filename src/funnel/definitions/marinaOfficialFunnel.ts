import type { FunnelDefinition } from "../schema/v1";
import dinnerAsset from "@/assets/scene-02/video/scene-02-dinner.mp4.asset.json";
import scene03Asset from "@/assets/scene-03/video/scene-03.mp4.asset.json";
import scene03ConsequenceAsset from "@/assets/scene-03/video/scene-03-consequence-reaction.mp4.asset.json";
import scene05MirrorAsset from "@/assets/scene-05/video/scene-05-mirror-self-criticism.mp4.asset.json";

// Mirrors, at schema/runtime level, the real experience implemented in
// src/routes/dev/door-scene.tsx (the actual public flow behind /intro -> /dev/door-scene?autostart=1).
// Every scene, event, trigger, action and asset URL below is taken directly from that component and
// from src/dev/story-checkpoints.ts (STORY_MAP). Nothing here is invented: where door-scene.tsx leaves a
// path undefined (e.g. declining a call), this definition uses STOP to represent "no further path exists"
// rather than fabricating a continuation.
const LUCIA_AVATAR_URL =
  "https://res.cloudinary.com/duht4tq1f/image/upload/v1787083754/Woman_smiling_at_camera_2K_202608181701_y39jad.jpg";
const FUTURE_MARINA_AVATAR_URL =
  "https://res.cloudinary.com/duht4tq1f/image/upload/v1787185689/marina_empres%C3%A1ria_kbotns.png";

export const marinaOfficialFunnel: FunnelDefinition = {
  schemaVersion: 1,
  id: "marina-desafio-14-dias",
  title: "FUNIL PRINCIPAL",
  entrySceneId: "scene-01-a-porta",
  exportable: true,
  guided: { experienceType: "story", description: "Experiência interativa da Marina" },
  assets: [
    { id: "door-video", mediaType: "video", source: "permanent", url: "/assets/scene-01/video/scene-01-door.mp4" },
    { id: "memory-video", mediaType: "video", source: "permanent", url: "/assets/scene-01/video/scene-01-memory.mp4" },
    { id: "memory-door-video", mediaType: "video", source: "permanent", url: "/assets/scene-01/video/scene-01-memory-door.mp4" },
    { id: "mother-precall-video", mediaType: "video", source: "permanent", url: "/assets/scene-01/video/scene-01-mother-precall.mp4" },
    { id: "dinner-video", mediaType: "video", source: "permanent", url: dinnerAsset.url },
    { id: "lucia-audio-video", mediaType: "video", source: "permanent", url: "/assets/scene-02/video/scene-02-lucia-send-audio.mp4" },
    { id: "scene03-video", mediaType: "video", source: "permanent", url: scene03Asset.url },
    { id: "scene03-consequence-video", mediaType: "video", source: "permanent", url: scene03ConsequenceAsset.url },
    { id: "future-marina-video", mediaType: "video", source: "permanent", url: "/assets/scene-04/video/scene-04-marina-future-call-intro-01.mp4" },
    { id: "mirror-video", mediaType: "video", source: "permanent", url: scene05MirrorAsset.url },
    { id: "phone-vibration-audio", mediaType: "audio", source: "permanent", url: "/assets/scene-01/audio/phone-vibration.mp3" },
    { id: "call-connect-audio", mediaType: "audio", source: "permanent", url: "/assets/scene-01/audio/call-connect.mp3" },
    { id: "mother-call-audio", mediaType: "audio", source: "permanent", url: "/assets/scene-01/audio/mother-call-01.mp3" },
    { id: "call-end-audio", mediaType: "audio", source: "permanent", url: "/assets/scene-01/audio/call-end.mp3" },
    { id: "notification-audio", mediaType: "audio", source: "permanent", url: "/assets/scene-02/audio/notification.mp3" },
    { id: "mother-voice-once-audio", mediaType: "audio", source: "permanent", url: "/assets/scene-02/audio/mother-voice-once-01.mp3" },
    { id: "marina-future-call-audio", mediaType: "audio", source: "permanent", url: "/assets/scene-04/audio/marina-future-call-01.mp3" },
    { id: "lucia-avatar", mediaType: "image", source: "permanent", url: LUCIA_AVATAR_URL },
    { id: "future-marina-avatar", mediaType: "image", source: "permanent", url: FUTURE_MARINA_AVATAR_URL },
  ],
  scenes: [
    {
      id: "scene-01-a-porta",
      title: "A Porta",
      videoAssetId: "door-video",
      nextSceneId: "scene-01-memoria",
      guided: { script: { happens: "Marina percebe a chegada de Daniel. O corpo reage antes dela entender." } },
      events: [
        { id: "porta-transition", block: "scene_transition", trigger: { kind: "VIDEO_END" }, blocking: false, targetSceneId: "scene-01-memoria", actions: [{ type: "NEXT_SCENE" }] },
      ],
    },
    {
      id: "scene-01-memoria",
      title: "Memória",
      videoAssetId: "memory-video",
      nextSceneId: "scene-01-memoria-porta",
      events: [
        { id: "memoria-transition", block: "scene_transition", trigger: { kind: "VIDEO_END" }, blocking: false, targetSceneId: "scene-01-memoria-porta", actions: [{ type: "NEXT_SCENE" }] },
      ],
    },
    {
      id: "scene-01-memoria-porta",
      title: "Memória — Porta",
      videoAssetId: "memory-door-video",
      nextSceneId: "scene-01-pre-ligacao",
      events: [
        { id: "memoria-porta-transition", block: "scene_transition", trigger: { kind: "VIDEO_END" }, blocking: false, targetSceneId: "scene-01-pre-ligacao", actions: [{ type: "NEXT_SCENE" }] },
      ],
    },
    {
      id: "scene-01-pre-ligacao",
      title: "Memórias + Ligação",
      videoAssetId: "mother-precall-video",
      nextSceneId: "scene-02-jantar",
      guided: { script: { happens: "As lembranças aparecem, Lúcia chama Marina e a ligação da Mamãe invade o presente." } },
      events: [
        {
          id: "pre-ligacao-call",
          block: "incoming_call",
          trigger: { kind: "VIDEO_END" },
          blocking: true,
          actions: [],
          callerName: "Mamãe",
          callerSubtitle: "Celular",
          avatarAssetId: "lucia-avatar",
          vibrationAssetId: "phone-vibration-audio",
          connectSfxAssetId: "call-connect-audio",
          voiceAssetId: "mother-call-audio",
          endSfxAssetId: "call-end-audio",
          onAccept: [{ type: "RESUME_VIDEO" }],
          // door-scene.tsx has no forward path when the call is declined (the overlay simply closes) —
          // STOP represents that dead end honestly instead of inventing a continuation.
          onDecline: [{ type: "STOP" }],
          onEnd: [{ type: "NEXT_SCENE" }],
        },
      ],
    },
    {
      id: "scene-02-jantar",
      title: "Jantar com Daniel",
      videoAssetId: "dinner-video",
      nextSceneId: "scene-02-lucia-audio",
      guided: { script: { happens: "Daniel está apenas cansado. Marina começa a procurar um conflito que ainda não existe." } },
      events: [
        {
          id: "jantar-quiz",
          block: "quiz",
          trigger: { kind: "TIME", seconds: 19 },
          blocking: true,
          actions: [{ type: "RESUME_VIDEO" }],
          title: "Antes de continuar...",
          variant: "immersive",
          feedbackMode: "none",
          showProgress: false,
          closeBehavior: "prevent",
          questions: [
            {
              id: "q-prediction-01",
              title: "O que você acha que Marina vai fazer agora?",
              options: [
                { id: "opt-ask-again", label: "Perguntar de novo se ele está bravo", value: "ask_again" },
                { id: "opt-apologize", label: "Pedir desculpa sem saber por quê", value: "apologize" },
                { id: "opt-confront", label: "Confrontar Daniel", value: "confront" },
                { id: "opt-withdraw", label: "Ficar quieta e se afastar", value: "withdraw" },
              ],
            },
          ],
        },
        {
          id: "jantar-notificacao",
          block: "notification",
          trigger: { kind: "BEFORE_END", seconds: 2 },
          blocking: false,
          actions: [],
          appName: "Mensagens",
          senderName: "Mamãe",
          message: "Preciso te mandar uma coisa.",
          avatarAssetId: "lucia-avatar",
          soundAssetId: "notification-audio",
          autoDismiss: false,
          onTap: [{ type: "GO_TO_SCENE", sceneId: "scene-02-lucia-audio" }],
          onDismiss: [{ type: "RESUME_VIDEO" }],
        },
      ],
    },
    {
      id: "scene-02-lucia-audio",
      title: "Lúcia envia o áudio",
      videoAssetId: "lucia-audio-video",
      nextSceneId: "scene-03-outro-dia",
      guided: { script: { happens: "Lúcia aparece gravando a mensagem antes da conversa no WhatsApp." } },
      events: [
        {
          id: "lucia-audio-conversa",
          block: "messaging",
          trigger: { kind: "VIDEO_END" },
          blocking: true,
          actions: [{ type: "NEXT_SCENE" }],
          contactName: "Mamãe",
          avatarAssetId: "lucia-avatar",
          messages: [
            { id: "msg-mamae-preciso", type: "text", text: "Preciso te mandar uma coisa." },
            { id: "msg-mamae-audio", type: "voice_once", audioAssetId: "mother-voice-once-audio" },
          ],
          onClose: [{ type: "NEXT_SCENE" }],
          voiceFailure: "skip",
        },
      ],
    },
    {
      id: "scene-03-outro-dia",
      title: "Outro Dia",
      videoAssetId: "scene03-video",
      nextSceneId: "scene-03-consequencia",
      guided: { script: { happens: "O tempo passa. Clara tenta falar com Daniel e Marina começa a repetir a regra." } },
      events: [
        { id: "outro-dia-transition", block: "scene_transition", trigger: { kind: "VIDEO_END" }, blocking: false, targetSceneId: "scene-03-consequencia", actions: [{ type: "NEXT_SCENE" }] },
      ],
    },
    {
      id: "scene-03-consequencia",
      title: "A Consequência",
      videoAssetId: "scene03-consequence-video",
      nextSceneId: "scene-04-marina-futuro",
      guided: { script: { happens: "Daniel permite que Clara fale. Clara recua. Marina percebe o que acabou de fazer." } },
      events: [
        {
          id: "consequencia-quiz",
          block: "quiz",
          trigger: { kind: "VIDEO_END" },
          blocking: true,
          actions: [{ type: "NEXT_SCENE" }],
          // Event-level title is required by the schema; door-scene.tsx does not set one for this quiz,
          // so the question's own real text is reused here rather than inventing a heading.
          title: "Quando você sente que alguém pode não gostar do que você vai dizer, o que costuma acontecer?",
          variant: "immersive",
          feedbackMode: "none",
          showProgress: false,
          closeBehavior: "prevent",
          questions: [
            {
              id: "q-pattern-01",
              title: "Quando você sente que alguém pode não gostar do que você vai dizer, o que costuma acontecer?",
              options: [
                { id: "opt-self-erasure", label: "Eu diminuo o que ia dizer.", value: "self_erasure", tags: ["self_erasure"] },
                { id: "opt-avoidance", label: "Mudo de assunto ou deixo pra depois.", value: "avoidance", tags: ["avoidance"] },
                { id: "opt-hypervigilance", label: "Tento perceber primeiro se é seguro falar.", value: "hypervigilance", tags: ["hypervigilance"] },
                { id: "opt-assertive", label: "Eu digo o que penso mesmo com desconforto.", value: "assertive", tags: ["assertive"] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "scene-04-marina-futuro",
      title: "Marina do Futuro",
      videoAssetId: "future-marina-video",
      nextSceneId: "scene-05-espelho",
      guided: { script: { happens: "Depois de responder sobre si mesma, a espectadora recebe a primeira ligação da Marina Renascida." } },
      events: [
        {
          id: "futuro-call",
          block: "incoming_call",
          trigger: { kind: "VIDEO_END" },
          blocking: true,
          actions: [],
          callerName: "Marina",
          callerSubtitle: "Celular",
          avatarAssetId: "future-marina-avatar",
          vibrationAssetId: "phone-vibration-audio",
          connectSfxAssetId: "call-connect-audio",
          voiceAssetId: "marina-future-call-audio",
          endSfxAssetId: "call-end-audio",
          onAccept: [{ type: "RESUME_VIDEO" }],
          onDecline: [{ type: "STOP" }],
          onEnd: [{ type: "NEXT_SCENE" }],
        },
      ],
    },
    {
      id: "scene-05-espelho",
      title: "O Espelho",
      videoAssetId: "mirror-video",
      guided: { script: { happens: "Marina recebe um elogio, se olha de novo e transforma o próprio reflexo numa inspeção." } },
      events: [
        {
          id: "espelho-quiz",
          block: "quiz",
          trigger: { kind: "VIDEO_END" },
          blocking: true,
          // No scene exists yet after O Espelho in door-scene.tsx — COMPLETE_SCENE marks the real end
          // of production instead of inventing a next beat.
          actions: [{ type: "COMPLETE_SCENE" }],
          title: "AGORA OLHA PRA VOCÊ",
          completionLabel: "Você não respondeu sobre beleza. Respondeu sobre como você se olha.",
          variant: "immersive",
          feedbackMode: "none",
          showProgress: false,
          closeBehavior: "prevent",
          questions: [
            {
              id: "q-mirror-01",
              title: "Quando você se vê numa foto ou no espelho, o que seu olho procura primeiro?",
              options: [
                { id: "opt-appearance-criticism", label: "Vai direto pro que eu queria mudar.", value: "appearance_criticism", tags: ["appearance_criticism"] },
                { id: "opt-comparison", label: "Eu comparo com uma versão de mim que parece sempre melhor.", value: "comparison", tags: ["comparison"] },
                { id: "opt-compliment-rejection", label: "Se alguém diz que eu tô bonita, uma parte de mim acha que a pessoa não tá vendo direito.", value: "compliment_rejection", tags: ["compliment_rejection"] },
                { id: "opt-neutral-self-view", label: "Consigo me olhar sem transformar meu corpo numa lista de correções.", value: "neutral_self_view", tags: ["neutral_self_view"] },
              ],
            },
          ],
        },
      ],
    },
  ],
};
