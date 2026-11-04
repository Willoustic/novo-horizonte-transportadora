import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPerfil, temAcessoDashboard } from "@/lib/supabase/profiles";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");
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

  let query = supabase
    .from("emprestimos")
    .select(
      "*, combustivel:combustiveis(nome, abreviacao), posto_origem:postos!posto_origem_id(nome, abreviacao), posto_destino:postos!posto_destino_id(nome, abreviacao)",
    );

  if (data) {
    // data no formato YYYY-MM-DD; validado por regex para evitar injecao de filtro no PostgREST
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return NextResponse.json({ error: "Data invalida" }, { status: 400 });
    }
    // Emprestimos pendentes aparecem em todas as datas a partir da data do emprestimo
    // Quitados aparecem apenas na data da devolucao (ou data do emprestimo se sem devolucao)
    const filter = `and(data_emprestimo.eq.${data},status.eq.pendente),and(data_emprestimo.lte.${data},status.eq.devolvido_parcial),and(data_emprestimo.lte.${data},status.eq.devolvido)`;
    query = query.or(filter);
  }

  const { data: emprestimos, error } = await query.order("data_emprestimo", {
    ascending: false,
  });
  if (error)
    return NextResponse.json(
      { error: "Erro ao listar emprestimos" },
      { status: 500 },
    );
  return NextResponse.json(emprestimos);
}

export async function POST(request: Request) {
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

  // Validate required fields
  if (!body || !body.data_emprestimo || !body.status || !body.posto_origem_id) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("emprestimos")
    .insert({
      data_emprestimo: body.data_emprestimo,
      status: body.status,
      posto_origem_id: body.posto_origem_id,
      posto_destino_id: body.posto_destino_id,
      combustivel_id: body.combustivel_id,
      observacoes: body.observacoes,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json(
      { error: "Erro ao criar emprestimo" },
      { status: 500 },
    );
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
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

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { error } = await supabase.from("emprestimos").delete().eq("id", id);
  if (error)
    return NextResponse.json(
      { error: "Erro ao excluir emprestimo" },
      { status: 500 },
    );
  return NextResponse.json({ success: true });
}
