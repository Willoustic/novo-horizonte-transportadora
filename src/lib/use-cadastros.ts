"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateToDB } from "./date-utils";

interface CadastrosBases {
  id: string;
  nome: string;
  abreviacao: string;
}

interface CadastrosPostos {
  id: string;
  nome: string;
  abreviacao: string;
}

interface CadastrosCombustiveis {
  id: string;
  nome: string;
  abreviacao: string;
}

interface CadastrosFornecedores {
  id: string;
  nome: string;
}

export function useCadastros(date: Date) {
  const [postos, setPostos] = useState<CadastrosPostos[]>([]);
  const [combustiveis, setCombustiveis] = useState<CadastrosCombustiveis[]>([]);
  const [fornecedores, setFornecedores] = useState<CadastrosFornecedores[]>([]);
  const [bases, setBases] = useState<CadastrosBases[]>([]);
  const [loading, setLoading] = useState(true);

  const dateStr = formatDateToDB(date);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [postosRes, combRes, fornRes, basesRes] = await Promise.all([
        fetch("/api/cadastros/postos"),
        fetch("/api/cadastros/combustiveis"),
        fetch("/api/cadastros/fornecedores"),
        fetch("/api/cadastros/bases"),
      ]);

      const [postosJson, combJson, fornJson, basesJson] = await Promise.all([
        postosRes.json(),
        combRes.json(),
        fornRes.json(),
        basesRes.json(),
      ]);

      setPostos(Array.isArray(postosJson) ? postosJson : []);
      setCombustiveis(Array.isArray(combJson) ? combJson : []);
      setFornecedores(Array.isArray(fornJson) ? fornJson : []);
      setBases(Array.isArray(basesJson) ? basesJson : []);

      const allOk =
        postosJson.length > 0 &&
        combJson.length > 0 &&
        fornJson.length > 0 &&
        basesJson.length > 0;
      setLoading(false);
    }

    fetchData();
  }, [date]);

  return { postos, combustiveis, fornecedores, bases, loading };
}
