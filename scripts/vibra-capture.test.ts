import { describe, it, expect } from "vitest";
import crypto from "crypto";

process.env.ENCRYPTION_KEY = "0000000000000000000000000000000000000000000000000000000000000000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJyb290X2F1dGhvaWQ_iucm9zdGVtIiwicm9sZSI6Imluc2FtcGxlX3Jvb3QiLCJpYXQiOjE3NDkwMDAwMDB9.dBjxZ2aJVbYckEqm5f1ZnZTQ5T3R6N3pKkK8K8RzIQk";

import { decrypt, extractPrices } from "../scripts/vibra-capture";

describe("decrypt", () => {
  it("should roundtrip encrypt/decrypt", () => {
    const plain = "senha-secreta-123";
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(plain, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    const encryptedText = iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;

    expect(decrypt(encryptedText)).toBe(plain);
  });

  it("should return input when parts length is not 3", () => {
    expect(decrypt("invalid")).toBe("invalid");
  });

  it("should return input when parts split doesn't yield 3 parts", () => {
    expect(decrypt("onlyone")).toBe("onlyone");
  });
});

describe("extractPrices", () => {
  it("should extract produto, preco and base from body text with price pattern", () => {
    const bodyText = `Produto\nCOD:12345\nBase:\nBAGAM\nPreço: R$ 123,45`;
    const result = extractPrices(bodyText);
    expect(result).toEqual([
      { produto: "Produto", preco: "123,45", base: "BAGAM" },
    ]);
  });

  it("should handle multiple price matches", () => {
    const bodyText = `Produto A\nCOD:1\nBase:\nARCAB\nPreço: R$ 10,00Produto B\nCOD:2\nBase:\nAISUAP\nPreço: R$ 20,50`;
    const result = extractPrices(bodyText);
    expect(result).toEqual([
      { produto: "Produto A", preco: "10,00", base: "ARCAB" },
      { produto: "Produto B", preco: "20,50", base: "AISUAP" },
    ]);
  });

  it("should return empty array when no matches found", () => {
    const result = extractPrices("No prices here");
    expect(result).toEqual([]);
  });
});