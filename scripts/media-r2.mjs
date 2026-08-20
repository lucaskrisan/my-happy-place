import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const target = process.argv[2];
if (target !== "--local" && target !== "--remote") {
  throw new Error("Use --local ou --remote.");
}

const media = [
  ["scene-02/video/scene-02-dinner.mp4", "scene-02-dinner.mp4"],
  ["scene-03/video/scene-03-time-passage-first-pattern.mp4", "scene-03-time-passage-first-pattern.mp4"],
  ["scene-03/video/scene-03-consequence-reaction.mp4", "scene-03-consequence-reaction.mp4"],
  ["scene-05/video/scene-05-mirror-self-criticism.mp4", "scene-05-mirror-self-criticism.mp4"],
];

const wranglerEntrypoint = resolve("node_modules/wrangler/bin/wrangler.js");

for (const [key, filename] of media) {
  const file = resolve(".local-media", filename);
  if (!existsSync(file)) {
    throw new Error(`Arquivo ausente: ${file}`);
  }

  const args = [
    "r2", "object", "put", `my-happy-place-media/${key}`,
    "--file", file,
    "--content-type", "video/mp4",
    "--cache-control", "public, max-age=86400",
    target,
  ];

  execFileSync(process.execPath, [wranglerEntrypoint, ...args], { stdio: "inherit" });
}
