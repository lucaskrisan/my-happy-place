import { ChoiceOverlay } from "@/components/dev/ChoiceOverlay";
import { IncomingCallOverlay } from "@/components/dev/IncomingCallOverlay";
import { MessagingOverlay } from "@/components/dev/MessagingOverlay";
import { NotificationOverlay } from "@/components/dev/NotificationOverlay";
import { QuizOverlay } from "@/components/dev/QuizOverlay";
import type { RuntimeSnapshot, FunnelRuntime } from "../runtime/funnelRuntime";
import type { FunnelDefinition, SceneEventDefinition } from "../schema/v1";

type PreviewUrls = Record<string, string>;
const RuntimeQuiz = QuizOverlay as any;
const RuntimeChoice = ChoiceOverlay as any;
const RuntimeMessaging = MessagingOverlay as any;
const RuntimeCall = IncomingCallOverlay as any;
const RuntimeNotification = NotificationOverlay as any;
export const assetUrl = (funnel: FunnelDefinition, urls: PreviewUrls, id?: string) => {
  const asset = funnel.assets.find((item) => item.id === id);
  return asset?.source === "permanent" ? asset.url : asset?.source === "preview" ? urls[asset.id] : undefined;
};

/** Uses the real narrative overlay components; it owns no parallel interaction UI. */
export function RuntimeOverlays({ funnel, urls, event, runtime, snapshot }: { funnel: FunnelDefinition; urls: PreviewUrls; event?: SceneEventDefinition; runtime: FunnelRuntime | null; snapshot: RuntimeSnapshot | null }) {
  if (!event || !runtime || !snapshot) return null;
  const done = () => runtime.completeInteraction(event.id, snapshot.runId);
  if (event.block === "quiz") return <RuntimeQuiz open definition={{ id: event.id, title: event.title, questions: event.questions }} variant={event.variant} closeBehavior={event.closeBehavior} onComplete={done} onClose={done} />;
  if (event.block === "choice") return <RuntimeChoice open definition={{ id: event.id, title: event.title, subtitle: event.subtitle, options: event.options, mode: event.mode, required: event.required, allowChange: event.allowChange }} onComplete={done} onClose={done} />;
  if (event.block === "messaging") return <RuntimeMessaging open contactName={event.contactName} contactSubtitle={event.contactSubtitle} contactAvatar={assetUrl(funnel, urls, event.avatarAssetId)} messages={event.messages.map((message) => ({ id: message.id, type: message.type, sender: "contact", text: message.text, audioSrc: assetUrl(funnel, urls, message.audioAssetId) }))} onComplete={done} onClose={done} />;
  if (event.block === "incoming_call") return <RuntimeCall open callerName={event.callerName} callerSubtitle={event.callerSubtitle} callerAvatar={assetUrl(funnel, urls, event.avatarAssetId)} ringtoneSrc={assetUrl(funnel, urls, event.ringtoneAssetId)} vibrationSrc={assetUrl(funnel, urls, event.vibrationAssetId)} voiceAudioSrc={assetUrl(funnel, urls, event.voiceAssetId)} connectSfxSrc={assetUrl(funnel, urls, event.connectSfxAssetId)} endSfxSrc={assetUrl(funnel, urls, event.endSfxAssetId)} onDecline={done} onEnd={done} />;
  if (event.block === "notification") return <RuntimeNotification open appName={event.appName} senderName={event.senderName} message={event.message} avatar={assetUrl(funnel, urls, event.avatarAssetId)} soundSrc={assetUrl(funnel, urls, event.soundAssetId)} autoDismiss={event.autoDismiss} onTap={done} onDismiss={done} />;
  return null;
}
