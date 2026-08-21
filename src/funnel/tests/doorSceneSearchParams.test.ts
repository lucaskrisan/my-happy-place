import { describe, expect, it } from "vitest";
import { z } from "zod";

// Mirrors src/routes/dev/door-scene.tsx's sceneSearchSchema exactly (kept here rather than imported so
// this test doesn't have to pull in the whole route's component tree — vitest here only runs
// src/funnel/**). Keep this in sync if that schema changes.
const optionalStringParam = z.union([z.string(), z.number()]).transform(String).optional();
const sceneSearchSchema = z.object({
  autostart: optionalStringParam,
  checkpoint: optionalStringParam,
});

describe("door-scene autostart search param", () => {
  it("accepts autostart as a string, as it arrives from /intro's router.navigate()", () => {
    expect(sceneSearchSchema.parse({ autostart: "1" })).toEqual({ autostart: "1" });
  });
  it("accepts autostart as a number, as it arrives from a raw '?autostart=1' URL, and normalizes it to a string", () => {
    expect(sceneSearchSchema.parse({ autostart: 1 })).toEqual({ autostart: "1" });
  });
  it("still accepts a plain checkpoint id", () => {
    expect(sceneSearchSchema.parse({ checkpoint: "scene01-start" })).toEqual({ checkpoint: "scene01-start" });
  });
});
