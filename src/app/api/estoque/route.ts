import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPerfil, temAcessoDashboard } from "@/lib/supabase/profiles";

export async function GET(request: Request) {
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
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");

  let query = supabase
    .from("estoque_snapshots")
    .select(
      "*, tanque_posto:tanques_posto(numero, capacidade_litros, estoque_minimo, posto:postos(nome, abreviacao), combustivel:combustiveis(nome, abreviacao))",
    );

  if (data) {
    query = query.eq("data", data);
  }

  const { data: snapshots, error } = await query.order("data", {
    ascending: false,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(snapshots);
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
  const { tanque_posto_id, volume, data } = body;
  const { data: result, error } = await supabase
    .from("estoque_snapshots")
    .upsert(
      { tanque_posto_id, volume, data },
      { onConflict: "tanque_posto_id,data" },
    )
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(request: Request) {
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
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { error } = await supabase
    .from("estoque_snapshots")
    .delete()
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
