import { describe, it, expect } from "vitest";
import crypto from "crypto";
import type { Page } from "playwright";

process.env.ENCRYPTION_KEY =
  "0000000000000000000000000000000000000000000000000000000000000000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJyb290X2F1dGhvaWQ_iucm9zdGVtIiwicm9sZSI6Imluc2FtcGxlX3Jvb3QiLCJpYXQiOjE3NDkwMDAwMDB9.dBjxZ2aJVbYckEqm5f1ZnZTQ5T3R6N3pKkK8K8RzIQk";

import { decrypt, extractPrices } from "../scripts/vibra-capture";

// ---------------------------------------------------------------------------
// Mock helpers for Playwright Page/Locator API used by extractPrices
// ---------------------------------------------------------------------------

type MockLocator = {
  count: () => Promise<number>;
  locator: (sel: string) => MockLocator;
  nth: (i: number) => MockLocator;
  innerText: () => Promise<string>;
};

function locator(opts: { count?: number; text?: string } = {}): MockLocator {
  return {
    count: async () => opts.count ?? 0,
    locator: () => locator(),
    nth: () => locator({ text: opts.text }),
    innerText: async () => opts.text ?? "",
  };
}

function pageWithNoDialog(): Page {
  const emptyLoc = locator({ count: 0 });
  return {
    locator: () => emptyLoc as MockLocator,
  } as unknown as Page;
}

function pageWithDialogNoTable(): Page {
  const tableEmpty = locator({ count: 0 });
  const dialogLoc = {
    count: async () => 1,
    locator: () => tableEmpty as MockLocator,
    nth: () => locator(),
    innerText: async () => "",
  } as MockLocator;
  return {
    locator: (sel: string) => {
      if (sel === "mat-dialog-container:visible") return dialogLoc;
      return locator();
    },
  } as unknown as Page;
}

function pageWithRows(rows: Array<{ produto: string; preco: string }>): Page {
  const rowLocs = rows.map((r) => {
    const tdLoc = {
      count: async () => 4,
      locator: () => locator(),
      nth: (i: number) => {
        const texts = [r.produto, "BAGAM", r.preco, "Ação"];
        return locator({ text: texts[i] ?? "" });
      },
      innerText: async () => "",
    } as MockLocator;
    return {
      count: async () => 1,
      locator: () => tdLoc as MockLocator,
      nth: () => locator(),
      innerText: async () => "",
    } as MockLocator;
  });

  const rowsLoc = {
    count: async () => rows.length,
    locator: () => locator(),
    nth: (i: number) => rowLocs[i] ?? locator(),
    innerText: async () => "",
  } as MockLocator;

  const tableLoc = {
    count: async () => 1,
    locator: () => rowsLoc as MockLocator,
    nth: () => locator(),
    innerText: async () => "",
  } as MockLocator;

  const dialogLoc = {
    count: async () => 1,
    locator: () => tableLoc as MockLocator,
    nth: () => locator(),
    innerText: async () => "",
  } as MockLocator;

  return {
    locator: (sel: string) => {
      if (sel === "mat-dialog-container:visible") return dialogLoc;
      return locator();
    },
  } as unknown as Page;
}

// ---------------------------------------------------------------------------
// decrypt tests (unchanged)
// ---------------------------------------------------------------------------

describe("decrypt", () => {
  it("should roundtrip encrypt/decrypt", () => {
    const plain = "senha-secreta-123";
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(plain, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    const encryptedText =
      iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;

    expect(decrypt(encryptedText)).toBe(plain);
  });

  it("should return input when parts length is not 3", () => {
    expect(decrypt("invalid")).toBe("invalid");
  });

  it("should return input when parts split doesn't yield 3 parts", () => {
    expect(decrypt("onlyone")).toBe("onlyone");
  });
});

// ---------------------------------------------------------------------------
// extractPrices tests (DOM-based, async)
// ---------------------------------------------------------------------------

describe("extractPrices", () => {
  it("returns empty array when no dialog is visible", async () => {
    const page = pageWithNoDialog();
    const result = await extractPrices(page, "BAGAM");
    expect(result).toEqual([]);
  });

  it("returns empty array when dialog has no table", async () => {
    const page = pageWithDialogNoTable();
    const result = await extractPrices(page, "BAGAM");
    expect(result).toEqual([]);
  });

  it("returns empty array when table has no rows", async () => {
    const page = pageWithRows([]);
    const result = await extractPrices(page, "BAGAM");
    expect(result).toEqual([]);
  });

  it("extracts produto and preco from table rows", async () => {
    const page = pageWithRows([
      { produto: "Óleo Diesel S10", preco: "7,4582" },
      { produto: "Gasolina Comum", preco: "5,4998" },
      { produto: "Etanol Hidratado", preco: "4,7186" },
    ]);
    const result = await extractPrices(page, "BAGAM");
    expect(result).toEqual([
      { produto: "Óleo Diesel S10", preco: 7.4582, base: "BAGAM" },
      { produto: "Gasolina Comum", preco: 5.4998, base: "BAGAM" },
      { produto: "Etanol Hidratado", preco: 4.7186, base: "BAGAM" },
    ]);
  });

  it("uses the base argument passed to extractPrices", async () => {
    const page = pageWithRows([{ produto: "Diesel", preco: "6,1234" }]);
    const result = await extractPrices(page, "ARCAB");
    expect(result).toEqual([
      { produto: "Diesel", preco: 6.1234, base: "ARCAB" },
    ]);
  });

  it("filters out rows with zero or invalid price", async () => {
    const page = pageWithRows([
      { produto: "Produto A", preco: "0" },
      { produto: "Produto B", preco: "inválido" },
      { produto: "Produto C", preco: "10,00" },
    ]);
    const result = await extractPrices(page, "ARCAB");
    expect(result).toEqual([
      { produto: "Produto C", preco: 10, base: "ARCAB" },
    ]);
  });
});
