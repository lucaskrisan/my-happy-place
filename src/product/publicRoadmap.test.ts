import { describe, expect, it } from "vitest";
import { toPublicRoadmap } from "./publicRoadmap";
import { ROADMAP } from "./roadmap";

const FORBIDDEN_SUBSTRINGS = [
  "internalNotes",
  "sk_live",
  "sk_test",
  "pk_live",
  "whsec_",
  "sb_secret",
  "sb_publishable",
  "@gmail.com",
  "@example.com",
  "stripe_customer_id",
  "cus_",
  "commit",
  "branch",
  "deployUrl",
];

describe("public roadmap sanitization", () => {
  it("never serializes internal-only fields", () => {
    const json = JSON.stringify(toPublicRoadmap());
    for (const needle of FORBIDDEN_SUBSTRINGS) {
      expect(json.includes(needle), `public roadmap payload unexpectedly contains "${needle}"`).toBe(false);
    }
  });

  it("omits EXTERNAL-scope tasks entirely", () => {
    const publicRoadmap = toPublicRoadmap();
    expect(publicRoadmap.tasks.some((t) => t.id === "EXTERNAL-001")).toBe(false);
  });

  it("core totals match the internal CORE-scope task count", () => {
    const publicRoadmap = toPublicRoadmap();
    const coreTaskCount = ROADMAP.tasks.filter((t) => t.scope === "CORE").length;
    expect(publicRoadmap.coreTotal).toBe(coreTaskCount);
    expect(publicRoadmap.tasks.length).toBe(coreTaskCount);
  });

  it("the AGORA block never exceeds 3 items", () => {
    expect(toPublicRoadmap().now.length).toBeLessThanOrEqual(3);
  });

  it("every public task exposes only the allowlisted fields", () => {
    const publicRoadmap = toPublicRoadmap();
    const allowedKeys = new Set(["id", "phaseId", "title", "description", "status", "priority"]);
    for (const t of publicRoadmap.tasks) {
      for (const key of Object.keys(t)) {
        expect(allowedKeys.has(key), `unexpected key "${key}" leaked onto a public task`).toBe(true);
      }
    }
  });
});
