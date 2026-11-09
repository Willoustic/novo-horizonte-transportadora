import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserPerfil, temAcessoDashboard } from "@/lib/supabase/profiles";

const carregamentoUpdateSchema = z.object({
  posto_destino_id: z.string().min(1, "posto destino obrigatório").optional(),
  motorista_id: z.string().min(1, "motorista obrigatório").optional(),
  cavalo_id: z.string().min(1, "cavalo obrigatório").optional(),
  tanque_carreta_id: z
    .string()
    .min(1, "tanque/carreta obrigatório")
    .optional(),
  volume: z.number().positive("volume deve ser maior que zero").optional(),
  base_id: z.string().min(1, "base obrigatória").optional(),
  status: z.string().optional(),
  data: z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || !isNaN(Date.parse(value)),
      "data inválida",
    ),
  base_origem: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const perfil = await getUserPerfil(supabase, user.id);
  if (!temAcessoDashboard(perfil)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const { data, error } = await supabase
    .from("carregamentos")
    .select(
      "*, posto_destino:postos(nome, abreviacao), motorista:motoristas(nome), cavalo:cavalos(placa), tanque_carreta:tanques_carreta(identificacao)",
    )
    .eq("id", id)
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const perfil = await getUserPerfil(supabase, user.id);
  if (!temAcessoDashboard(perfil)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = await request.json();
  const parsed = carregamentoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { base_origem, base_id, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (base_id) updateData.base_id = base_id;
  else if (base_origem) {
    const { data: baseRes } = await supabase
      .from("bases")
      .select("id")
      .eq("abreviacao", base_origem)
      .single();
    if (baseRes) updateData.base_id = baseRes.id;
  }
  const { data, error } = await supabase
    .from("carregamentos")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const perfil = await getUserPerfil(supabase, user.id);
  if (!temAcessoDashboard(perfil)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const { error } = await supabase.from("carregamentos").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
