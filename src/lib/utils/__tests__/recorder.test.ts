import { describe, it, expect } from "vitest";
import { recorderLabel } from "@/lib/utils/recorder";

const me = { uid: "u-arul", role: "arul" as const };
const partner = { uid: "u-fifi", role: "fifi" as const };

describe("recorderLabel", () => {
  it("uid sendiri → label role sendiri", () => {
    expect(recorderLabel("u-arul", me, partner)).toBe("Arul");
  });
  it("uid pasangan → label role pasangan", () => {
    expect(recorderLabel("u-fifi", me, partner)).toBe("Fifi");
  });
  it("uid tak dikenal / kosong → null", () => {
    expect(recorderLabel("lain", me, partner)).toBeNull();
    expect(recorderLabel(undefined, me, null)).toBeNull();
  });
});
