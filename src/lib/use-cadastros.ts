"use client";

import { useState, useEffect, useCallback } from "react";

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

      const [postosOk, combOk, fornOk, basesOk] = await Promise.all([
        postosRes.json().then(d => setPostos(Array.isArray(d) ? d : [])),
        combRes.json().then(d => setCombustiveis(Array.isArray(d) ? d : [])),
        fornRes.json().then(d => setFornecedores(Array.isArray(d) ? d : [])),
        basesRes.json().then(d => setBases(Array.isArray(d) ? d : [])),
      ]);

      const allOk = postosOk && combOk && fornOk && basesOk;
      setLoading(!allOk);
    }

    fetchData();
  }, [date]);

  return { postos, combustiveis, fornecedores, bases, loading };
}