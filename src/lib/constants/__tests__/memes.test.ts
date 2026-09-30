import { describe, it, expect } from "vitest";
import { giphyUrl, MEMES_BY_MOOD, MOOD_CAPTION, MOOD_EMOJI, pickMeme } from "@/lib/constants/memes";
import type { BudgetMood } from "@/lib/utils/budgetMood";

const MOODS: BudgetMood[] = ["hemat", "aman", "boros", "mepet", "boncos"];

describe("memes", () => {
  it("tiap mood punya minimal satu GIF, caption, dan emoji cadangan", () => {
    for (const mood of MOODS) {
      expect(MEMES_BY_MOOD[mood].length).toBeGreaterThan(0);
      expect(MOOD_CAPTION[mood]).toBeTruthy();
      expect(MOOD_EMOJI[mood]).toBeTruthy();
    }
  });

  it("pickMeme stabil untuk seed yang sama & berputar antar seed", () => {
    const list = MEMES_BY_MOOD.aman;
    expect(pickMeme("aman", 3)).toBe(pickMeme("aman", 3));
    expect(pickMeme("aman", 0)).toBe(list[0]);
    expect(pickMeme("aman", list.length)).toBe(list[0]);
  });

  it("URL GIPHY pakai rendition ringan 200w.webp", () => {
    expect(giphyUrl("abc123")).toBe("https://media.giphy.com/media/abc123/200w.webp");
  });
});
