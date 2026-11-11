"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Truck,
  ClipboardList,
  DollarSign,
  Users,
  Settings,
  LayoutDashboard,
  Fuel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDateToDB } from "@/lib/date-utils";
import { DataTable } from "@/components/shared/DataTable";
import { useFetchData } from "@/components/shared/use-fetch-data";
import { ExportarExcelButton } from "@/components/dashboard/exportar-excel-button";
import { usePerfil } from "@/components/layout/perfil-provider";
import type { Row } from "@tanstack/react-table";

interface LitragemRow {
  posto: string;
  combustivel: string;
  bases: string;
  total: number;
  [key: string]: unknown;
}
interface CarregRow {
  motorista: string;
  cavalo: string;
  tanque: string;
  total: number;
  [key: string]: unknown;
}
interface EstoqueRow {
  posto: string;
  combustivel: string;
  volume: number;
  [key: string]: unknown;
}
interface PrecoRow {
  posto: string;
  combustivel: string;
  base: string;
  preco: number;
  [key: string]: unknown;
}

interface PostoResumo {
  abreviacao?: string;
  nome?: string;
  tipo?: "FILIAL" | "CLIENTE";
}

interface CombustivelResumo {
  abreviacao?: string;
  nome?: string;
}

interface PedidoItem {
  combustivel?: CombustivelResumo;
  volume_solicitado?: number;
}

interface Pedido {
  id: string | number;
  posto?: PostoResumo;
  itens?: PedidoItem[];
}

interface Carregamento {
  pedido_id?: string | number;
  posto_destino?: PostoResumo;
  base?: { abreviacao?: string };
  motorista?: { nome?: string };
  cavalo?: { placa?: string };
  tanque_carreta?: { identificacao?: string };
  volume?: number;
}

interface TanquePosto {
  posto?: PostoResumo;
  combustivel?: CombustivelResumo;
}

interface EstoqueSnapshot {
  tanque_posto?: TanquePosto;
  volume?: number;
}

interface Cotacao {
  posto?: PostoResumo;
  combustivel?: CombustivelResumo;
  base?: { abreviacao?: string };
  preco?: number;
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr = formatDateToDB(selectedDate);

  const pedidosUrl = `/api/pedidos?data=${dateStr}`;
  const carregamentosUrl = `/api/carregamentos?data=${dateStr}`;
  const estoqueUrl = `/api/estoque?data=${dateStr}`;
  const cotacoesUrl = `/api/cotacoes?data=${dateStr}`;

  const { data: pedidosData, loading: pedidosLoading } = useFetchData<Pedido[]>(
    pedidosUrl,
    [dateStr],
  );
  const { data: carregData, loading: carregLoading } = useFetchData<Carregamento[]>(
    carregamentosUrl,
    [dateStr],
  );
  const { data: estoqueData, loading: estoqueLoading } = useFetchData<EstoqueSnapshot[]>(
    estoqueUrl,
    [dateStr],
  );
  const { data: cotacoesData, loading: cotacoesLoading } = useFetchData<Cotacao[]>(
    cotacoesUrl,
    [dateStr],
  );

  const loading =
    pedidosLoading || carregLoading || estoqueLoading || cotacoesLoading;

  const perfil = usePerfil();

  // --- Litragem: pedidos itens agrupados por posto x combustível, bases via carregamentos ---
  const litragem = useMemo<LitragemRow[]>(() => {
    const pedidos = pedidosData || [];
    const carregs = carregData || [];

    const litMap: Record<string, number> = {};
    const pedidoCombMap: Record<string, Set<string>> = {};
    (pedidos || []).forEach((p: Pedido) => {
      const posto = p.posto?.abreviacao || p.posto?.nome || "?";
      const combs = new Set<string>();
      (p.itens || []).forEach((it: PedidoItem) => {
        const comb =
          it.combustivel?.abreviacao || it.combustivel?.nome || "?";
        combs.add(comb);
        const key = `${posto}|${comb}`;
        litMap[key] = (litMap[key] || 0) + Number(it.volume_solicitado || 0);
      });
      pedidoCombMap[p.id] = combs;
    });

    const basesMap: Record<string, Set<string>> = {};
    (carregs || []).forEach((c: Carregamento) => {
      const posto = c.posto_destino?.abreviacao || c.posto_destino?.nome || "?";
      const baseAbbr = c.base?.abreviacao;
      const bases = baseAbbr ? [baseAbbr] : [];
      const combs =
        c.pedido_id && pedidoCombMap[c.pedido_id]
          ? Array.from(pedidoCombMap[c.pedido_id])
          : [];
      const targetCombs = combs.length ? combs : bases.length ? ["?"] : [];
      targetCombs.forEach((comb: string) => {
        const key = `${posto}|${comb}`;
        if (!basesMap[key]) basesMap[key] = new Set();
        bases.forEach((b: string) => basesMap[key].add(b));
      });
    });

    return Object.entries(litMap).map(([k, v]) => {
      const [posto, combustivel] = k.split("|");
      const bs = basesMap[k];
      return {
        posto,
        combustivel,
        bases: bs && bs.size ? Array.from(bs).join(",") : "-",
        total: v,
      };
    });
  }, [pedidosData, carregData]);

  // --- Carregamento por motorista ---
  const carreg = useMemo<CarregRow[]>(() => {
    const carregs = carregData || [];
    const carMap: Record<
      string,
      { motorista: string; cavalo: string; tanque: string; total: number }
    > = {};
    (carregs || []).forEach((c: Carregamento) => {
      const m = c.motorista?.nome || "?";
      const key = m;
      if (!carMap[key])
        carMap[key] = {
          motorista: m,
          cavalo: c.cavalo?.placa || "-",
          tanque: c.tanque_carreta?.identificacao || "-",
          total: 0,
        };
      carMap[key].total += Number(c.volume || 0);
    });
    return Object.values(carMap);
  }, [carregData]);

  // --- Estoque por filial ---
  const estoque = useMemo<EstoqueRow[]>(() => {
    const snaps = estoqueData || [];
    const estMap: Record<string, number> = {};
    (snaps || []).forEach((s: EstoqueSnapshot) => {
      const tp = s.tanque_posto;
      if (tp?.posto?.tipo !== "FILIAL") return;
      const posto = tp.posto?.abreviacao || tp.posto?.nome || "?";
      const comb = tp.combustivel?.abreviacao || tp.combustivel?.nome || "?";
      const key = `${posto}|${comb}`;
      estMap[key] = (estMap[key] || 0) + Number(s.volume || 0);
    });
    return Object.entries(estMap).map(([k, v]) => {
      const [posto, combustivel] = k.split("|");
      return { posto, combustivel, volume: v };
    });
  }, [estoqueData]);

  // --- Melhor preço por posto x produto ---
  const precos = useMemo<PrecoRow[]>(() => {
    const cotacoes = cotacoesData || [];
    const precoMap: Record<string, { preco: number; base: string }> = {};
    (cotacoes || []).forEach((c: Cotacao) => {
      const posto = c.posto?.abreviacao || c.posto?.nome || "?";
      const comb = c.combustivel?.abreviacao || c.combustivel?.nome || "?";
      const base = c.base?.abreviacao || "-";
      const key = `${posto}|${comb}`;
      const p = Number(c.preco || 0);
      if (!(key in precoMap) || p < precoMap[key].preco)
        precoMap[key] = { preco: p, base };
    });
    return Object.entries(precoMap)
      .map(([k, v]) => {
        const [posto, combustivel] = k.split("|");
        return { posto, combustivel, base: v.base, preco: v.preco };
      })
      .sort(
        (a, b) =>
          a.posto.localeCompare(b.posto) ||
          a.combustivel.localeCompare(b.combustivel),
      );
  }, [cotacoesData]);

  const litragemColumns = useMemo(
    () => [
      { accessorKey: "posto", header: "Posto" },
      { accessorKey: "combustivel", header: "Combustível" },
      { accessorKey: "bases", header: "Bases" },
      {
        accessorKey: "total",
        header: "Litros",
        cell: ({ row }: { row: Row<LitragemRow> }) =>
          row.getValue<number>("total").toLocaleString("pt-BR"),
      },
    ],
    [],
  );

  const carregColumns = useMemo(
    () => [
      { accessorKey: "motorista", header: "Motorista" },
      { accessorKey: "cavalo", header: "Cavalo" },
      { accessorKey: "tanque", header: "Tanque" },
      {
        accessorKey: "total",
        header: "Litros",
        cell: ({ row }: { row: Row<CarregRow> }) => row.getValue<number>("total").toLocaleString("pt-BR"),
      },
    ],
    [],
  );

  const estoqueColumns = useMemo(
    () => [
      { accessorKey: "posto", header: "Posto" },
      { accessorKey: "combustivel", header: "Combustível" },
      {
        accessorKey: "volume",
        header: "Volume",
        cell: ({ row }: { row: Row<EstoqueRow> }) => row.getValue<number>("volume").toLocaleString("pt-BR"),
      },
    ],
    [],
  );

  const precosColumns = useMemo(
    () => [
      { accessorKey: "posto", header: "Posto" },
      { accessorKey: "combustivel", header: "Combustível" },
      { accessorKey: "base", header: "Base" },
      {
        accessorKey: "preco",
        header: "Preço",
        cell: ({ row }: { row: Row<PrecoRow> }) => row.getValue<number>("preco").toFixed(4),
      },
    ],
    [],
  );

  const shortcuts = [
    { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
    { href: "/carregamentos", label: "Carregamentos", icon: Truck },
    { href: "/estoque", label: "Estoque", icon: Package },
    { href: "/cotacoes", label: "Cotações", icon: DollarSign },
    { href: "/cadastros", label: "Cadastros", icon: Users },
    { href: "/parametros", label: "Parâmetros", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Visão operacional
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker
            date={selectedDate}
            onChange={setSelectedDate}
            label="Data"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Litragem de pedidos por posto x combustível */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 justify-between mb-3">
              <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  Litragem de Pedidos por Posto
                </h2>
              </div>
              <ExportarExcelButton
                data={litragem}
                fileName="litragem-pedidos"
                perfil={perfil}
                headers={{
                  posto: "Posto",
                  combustivel: "Combustível",
                  bases: "Bases",
                  total: "Litros",
                }}
              />
            </div>
            <DataTable
              columns={litragemColumns}
              data={litragem}
              loading={false}
              emptyMessage="Sem dados"
            />
          </div>

          {/* Card 2: Carregamento por motorista */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-600" />
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  Carregamento por Motorista
                </h2>
              </div>
              <ExportarExcelButton
                data={carreg}
                fileName="carregamento-motorista"
                perfil={perfil}
                headers={{
                  motorista: "Motorista",
                  cavalo: "Cavalo",
                  tanque: "Tanque",
                  total: "Litros",
                }}
              />
            </div>
            <DataTable
              columns={carregColumns}
              data={carreg}
              loading={false}
              emptyMessage="Sem dados"
            />
          </div>

          {/* Card 3: Estoque por filial */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  Estoque por Filial
                </h2>
              </div>
              <ExportarExcelButton
                data={estoque}
                fileName="estoque-filial"
                perfil={perfil}
                headers={{
                  posto: "Posto",
                  combustivel: "Combustível",
                  volume: "Volume",
                }}
              />
            </div>
            <DataTable
              columns={estoqueColumns}
              data={estoque}
              loading={false}
              emptyMessage="Sem dados"
            />
          </div>

          {/* Card 4: Melhor preço por posto x produto */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-yellow-600" />
                <h2 className="font-semibold text-gray-800 dark:text-white">
                  Melhor Preço por Posto
                </h2>
              </div>
              <ExportarExcelButton
                data={precos}
                fileName="melhor-preco-posto"
                perfil={perfil}
                headers={{
                  posto: "Posto",
                  combustivel: "Combustível",
                  base: "Base",
                  preco: "Preço",
                }}
              />
            </div>
            <DataTable
              columns={precosColumns}
              data={precos}
              loading={false}
              emptyMessage="Sem dados"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 transition-colors"
          >
            <s.icon className="h-5 w-5 text-green-600" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
              {s.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
