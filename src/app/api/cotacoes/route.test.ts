import { describe, it, expect, vi } from "vitest";

// Mock next/headers cookies before anything else
vi.mock("next/headers", async () => ({
  cookies: () => ({
    getAll: () => [],
    setAll: vi.fn(),
  }),
}));

// Mock @/lib/supabase/server - the createClient function
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock @/lib/supabase/profiles
vi.mock("@/lib/supabase/profiles", () => {
  const mockGetUserPerfil = vi.fn();
  const mockTemAcessoDashboard = vi.fn();
  return {
    getUserPerfil: mockGetUserPerfil,
    temAcessoDashboard: mockTemAcessoDashboard,
    isAdmin: vi.fn(),
  };
});

import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "./route";

// Chainable mock: every method returns the same object
const mockChain = {
  eq: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  order: vi.fn(),
};
mockChain.eq.mockReturnValue(mockChain);
mockChain.gte.mockReturnValue(mockChain);
mockChain.lte.mockReturnValue(mockChain);
mockChain.select.mockReturnValue(mockChain);
mockChain.update.mockReturnValue(mockChain);
mockChain.single.mockResolvedValue({ data: [], error: null });
mockChain.insert.mockResolvedValue({ data: [], error: null });
mockChain.order.mockResolvedValue({ data: [], error: null });

const mockGetUser = vi.fn();
const mockSupabase = {
  from: vi.fn().mockReturnValue(mockChain),
  auth: {
    getUser: mockGetUser,
  },
};

vi.mocked(createClient).mockResolvedValue(mockSupabase);

describe("cotacoes API route auth", () => {
  it("GET should return 401 when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new Request("http://localhost/api/cotacoes?data=2024-01-01");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("GET should return 403 when user lacks dashboard access", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const { temAcessoDashboard } = await import("@/lib/supabase/profiles");
    ;(temAcessoDashboard as any).mockReturnValue(false);

    const request = new Request("http://localhost/api/cotacoes?data=2024-01-01");
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("GET should return 200 when user has dashboard access", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const { temAcessoDashboard } = await import("@/lib/supabase/profiles");
    ;(temAcessoDashboard as any).mockReturnValue(true);

    const request = new Request("http://localhost/api/cotacoes?data=2024-01-01");
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("POST should return 401 when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new Request("http://localhost/api/cotacoes", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("POST should return 403 when user lacks dashboard access", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const { temAcessoDashboard } = await import("@/lib/supabase/profiles");
    ;(temAcessoDashboard as any).mockReturnValue(false);

    const request = new Request("http://localhost/api/cotacoes", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("POST should return 201 when user has dashboard access", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const { temAcessoDashboard } = await import("@/lib/supabase/profiles");
    ;(temAcessoDashboard as any).mockReturnValue(true);

    const request = new Request("http://localhost/api/cotacoes", {
      method: "POST",
      body: JSON.stringify({
        posto_id: "p1",
        combustivel_id: "c1",
        fornecedor_id: "f1",
        preco: "100,00",
        fonte: "manual",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});