import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPerfil, temAcessoDashboard } from "@/lib/supabase/profiles";

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
    .from("pedidos")
    .select(
      "*, posto:postos(nome, abreviacao), itens:itens_pedido(*, combustivel:combustiveis(nome, abreviacao), fornecedor:fornecedores(nome), base:bases(nome, abreviacao))",
    )
    .eq("id", id)
    .single();
  if (error)
    return NextResponse.json(
      { error: "Pedido não encontrado" },
      { status: 404 },
    );
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
  const updateData: Record<string, unknown> = {};
  if (body.status) updateData.status = body.status;
  if (body.observacoes !== undefined) updateData.observacao = body.observacoes;

  const { data, error } = await supabase
    .from("pedidos")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error)
    return NextResponse.json(
      { error: "Erro ao atualizar pedido" },
      { status: 500 },
    );
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

  const { error } = await supabase.from("pedidos").delete().eq("id", id);
  if (error)
    return NextResponse.json(
      { error: "Erro ao excluir pedido" },
      { status: 500 },
    );
  return NextResponse.json({ success: true });
}
