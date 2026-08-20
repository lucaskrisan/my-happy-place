import { z } from "zod";

export const blockTypes = [
  "video",
  "audio",
  "incoming_call",
  "messaging",
  "notification",
  "quiz",
  "choice",
  "scene_transition",
] as const;
export type BlockType = (typeof blockTypes)[number];

const id = z.string().min(1);
export const assetRefSchema = z.discriminatedUnion("source", [
  z.object({
    id,
    mediaType: z.enum(["video", "audio", "image"]),
    source: z.literal("permanent"),
    url: z.string().min(1),
    fileName: z.string().min(1).optional(),
    contentType: z.string().min(1).optional(),
    size: z.number().int().nonnegative().optional(),
    uploadedAt: z.string().datetime().optional(),
    r2Key: z.string().min(1).optional(),
    etag: z.string().min(1).optional(),
  }),
  // Object URLs are in-memory preview handles, not durable/public asset URLs.
  z.object({
    id,
    mediaType: z.enum(["video", "audio", "image"]),
    source: z.literal("preview"),
    objectUrl: z.string().min(1).optional(),
    fileName: z.string().min(1),
    status: z.enum(["ready", "needs_reattach"]).optional(),
  }),
]);
export type AssetRef = z.infer<typeof assetRefSchema>;

export const triggerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("SCENE_START") }),
  z.object({ kind: z.literal("TIME"), seconds: z.number().finite().nonnegative() }),
  z.object({ kind: z.literal("BEFORE_END"), seconds: z.number().finite().nonnegative() }),
  z.object({ kind: z.literal("VIDEO_END") }),
  z.object({ kind: z.literal("INTERACTION_COMPLETE"), interactionId: id }),
  z.object({ kind: z.literal("MANUAL") }),
]);
export type TriggerDefinition = z.infer<typeof triggerSchema>;

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("RESUME_VIDEO") }),
  z.object({ type: z.literal("PAUSE_VIDEO") }),
  z.object({ type: z.literal("NEXT_SCENE") }),
  z.object({ type: z.literal("GO_TO_SCENE"), sceneId: id }),
  z.object({ type: z.literal("OPEN_EVENT"), eventId: id }),
  z.object({ type: z.literal("STOP") }),
  z.object({ type: z.literal("COMPLETE_SCENE") }),
]);
export type ActionDefinition = z.infer<typeof actionSchema>;

const optionSchema = z.object({
  id,
  label: z.string().min(1),
  value: z.string().optional(),
  score: z.number().optional(),
  tags: z.array(z.string()).optional(),
  feedback: z.string().optional(),
});
const baseEvent = z.object({
  id,
  block: z.enum(blockTypes),
  trigger: triggerSchema,
  blocking: z.boolean().default(false),
  actions: z.array(actionSchema).default([]),
});
export const sceneEventSchema = z.discriminatedUnion("block", [
  baseEvent.extend({ block: z.literal("video"), assetId: id.optional() }),
  baseEvent.extend({
    block: z.literal("audio"),
    assetId: id,
    volume: z.number().min(0).max(1).optional(),
    loop: z.boolean().optional(),
  }),
  baseEvent.extend({
    block: z.literal("incoming_call"),
    callerName: z.string().min(1),
    callerSubtitle: z.string().optional(),
    avatarAssetId: id.optional(),
    ringtoneAssetId: id.optional(),
    vibrationAssetId: id.optional(),
    connectSfxAssetId: id.optional(),
    voiceAssetId: id.optional(),
    endSfxAssetId: id.optional(),
    voiceFailure: z.enum(["retry", "skip", "stop"]).optional(),
    onAccept: z.array(actionSchema).default([]),
    onDecline: z.array(actionSchema).default([]),
    onEnd: z.array(actionSchema).default([]),
  }),
  baseEvent.extend({
    block: z.literal("messaging"),
    contactName: z.string().min(1),
    contactSubtitle: z.string().optional(),
    avatarAssetId: id.optional(),
    messages: z.array(
      z.object({
        id,
        type: z.enum(["text", "voice", "voice_once", "system"]),
        text: z.string().optional(),
        audioAssetId: id.optional(),
      }),
    ),
    onClose: z.array(actionSchema).default([]),
    voiceFailure: z.enum(["retry", "skip", "stop"]).default("skip"),
  }),
  baseEvent.extend({
    block: z.literal("notification"),
    appName: z.string().min(1),
    senderName: z.string().min(1),
    message: z.string().min(1),
    avatarAssetId: id.optional(),
    soundAssetId: id.optional(),
    autoDismiss: z.boolean().optional(),
    onTap: z.array(actionSchema).default([]),
    onDismiss: z.array(actionSchema).default([]),
  }),
  baseEvent.extend({
    block: z.literal("quiz"),
    title: z.string().min(1),
    variant: z.enum(["default", "cinematic", "immersive"]).optional(),
    completionLabel: z.string().optional(),
    feedbackMode: z.enum(["none", "after_each"]).optional(),
    showProgress: z.boolean().optional(),
    closeBehavior: z.enum(["allow", "prevent"]).optional(),
    questions: z.array(z.object({ id, title: z.string().min(1), options: z.array(optionSchema) })),
  }),
  baseEvent.extend({
    block: z.literal("choice"),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    mode: z.enum(["instant", "confirm"]).optional(),
    required: z.boolean().optional(),
    allowChange: z.boolean().optional(),
    options: z.array(optionSchema),
  }),
  baseEvent.extend({ block: z.literal("scene_transition"), targetSceneId: id }),
]);
export type SceneEventDefinition = z.infer<typeof sceneEventSchema>;

export const sceneSchema = z.object({
  id,
  title: z.string().min(1),
  description: z.string().optional(),
  videoAssetId: id.optional(),
  posterAssetId: id.optional(),
  duration: z.number().positive().optional(),
  fit: z.enum(["contain", "cover"]).optional(),
  volume: z.number().min(0).max(1).optional(),
  startAt: z.number().nonnegative().optional(),
  endAt: z.number().positive().optional(),
  nextSceneId: id.optional(),
  events: z.array(sceneEventSchema),
  guided: z
    .object({
      objective: z.string().optional(),
      script: z
        .object({
          who: z.string().optional(),
          happens: z.string().optional(),
          dialogue: z.string().optional(),
          notes: z.string().optional(),
        })
        .optional(),
      productionGuide: z
        .object({
          steps: z.array(
            z.object({
              id,
              tool: z.string().optional(),
              type: z.enum(["IMAGE_GENERATION", "VIDEO_ANIMATION", "VOICE", "EDITING", "EXPORT"]),
              title: z.string(),
              instructions: z.string().optional(),
              prompt: z.string().optional(),
              completed: z.boolean().default(false),
              takes: z
                .array(
                  z.object({
                    id,
                    title: z.string(),
                    objective: z.string().optional(),
                    prompt: z.string().optional(),
                    completed: z.boolean().default(false),
                  }),
                )
                .default([]),
            }),
          ),
        })
        .optional(),
      tested: z.boolean().optional(),
      testedAt: z.number().finite().optional(),
      testedFingerprint: z.string().optional(),
    })
    .optional(),
});
export type SceneDefinition = z.infer<typeof sceneSchema>;
export const funnelSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  title: z.string().min(1),
  entrySceneId: id,
  exportable: z.boolean().default(true),
  assets: z.array(assetRefSchema),
  scenes: z.array(sceneSchema),
  guided: z
    .object({
      experienceType: z.enum(["story", "vsl", "quiz", "gamified", "training", "blank"]).optional(),
      description: z.string().optional(),
    })
    .optional(),
});
export type FunnelDefinition = z.infer<typeof funnelSchema>;
