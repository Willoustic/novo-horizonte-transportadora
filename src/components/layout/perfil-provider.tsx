"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Perfil = "admin" | "padrao" | "restrito";

interface PerfilProviderProps {
  initialPerfil: Perfil;
  children: ReactNode;
}

const PerfilContext = createContext<Perfil | undefined>(undefined);

export function PerfilProvider({
  initialPerfil,
  children,
}: PerfilProviderProps) {
  const [perfil, setPerfil] = useState<Perfil>(initialPerfil);

  return (
    <PerfilContext.Provider value={perfil}>{children}</PerfilContext.Provider>
  );
}

export function usePerfil(): Perfil | undefined {
  return useContext(PerfilContext);
}
