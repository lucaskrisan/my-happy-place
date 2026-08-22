import { describe, expect, it } from "vitest";
import { PermanentUploadError } from "../studio/permanentUpload";

describe("PermanentUploadError", () => {
  // AssetManager.tsx detects a cancelled upload via `error.name === "PermanentUploadError"` — without
  // setting `name` in the constructor it stays the inherited "Error", so every cancel was misreported
  // as a generic failure (with a "Tentar novamente" button) instead of "cancelled".
  it("sets its own name so callers can tell it apart from a generic Error", () => {
    const error = new PermanentUploadError("cancelled", "Upload cancelado.");
    expect(error.name).toBe("PermanentUploadError");
    expect(error.code).toBe("cancelled");
    expect(error instanceof Error).toBe(true);
  });
});
