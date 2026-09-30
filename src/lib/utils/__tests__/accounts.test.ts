import { describe, it, expect } from "vitest";
import { summarizeAccountsByOwner } from "@/lib/utils/accounts";

const acc = (accountId: string, owner: "arul" | "fifi" | "shared", balance: number) => ({
  accountId,
  owner,
  balance,
});

describe("summarizeAccountsByOwner", () => {
  it("urut Arul, Fifi, Bersama dengan subtotal; total keseluruhan", () => {
    const res = summarizeAccountsByOwner([
      acc("s1", "shared", 300),
      acc("a1", "arul", 100),
      acc("f1", "fifi", 50),
      acc("a2", "arul", 25),
    ]);
    expect(res.total).toBe(475);
    expect(res.groups.map((g) => [g.owner, g.subtotal, g.accounts.length])).toEqual([
      ["arul", 125, 2],
      ["fifi", 50, 1],
      ["shared", 300, 1],
    ]);
  });
  it("grup kosong tidak ditampilkan", () => {
    const res = summarizeAccountsByOwner([acc("a1", "arul", 10)]);
    expect(res.groups.map((g) => g.owner)).toEqual(["arul"]);
  });
});
