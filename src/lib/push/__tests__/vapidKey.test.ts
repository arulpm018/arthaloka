import { describe, it, expect } from "vitest";
import { urlBase64ToUint8Array } from "@/lib/push/vapidKey";

describe("urlBase64ToUint8Array", () => {
  it("decode base64url tanpa padding", () => {
    // "hello" = aGVsbG8 (base64url, tanpa "=")
    expect(Array.from(urlBase64ToUint8Array("aGVsbG8"))).toEqual([104, 101, 108, 108, 111]);
  });
  it("karakter - dan _ dipetakan ke + dan /", () => {
    // bytes [251, 255] = "+/8=" (base64) = "-_8" (base64url)
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual([251, 255]);
  });
});
