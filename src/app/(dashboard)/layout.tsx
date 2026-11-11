import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserPerfil, temAcessoDashboard } from "@/lib/supabase/profiles";
import { Sidebar } from "@/components/layout/Sidebar";
import { PerfilProvider } from "@/components/layout/perfil-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/login");
  }

  const perfil = await getUserPerfil(supabase, user.id);

  if (!temAcessoDashboard(perfil)) {
    redirect("/login");
  }

  // Perfil e admin ou padrao aqui (restrito e null ja redirecionados acima).
  const perfilAcesso = perfil as "admin" | "padrao";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800">
      <Sidebar perfil={perfilAcesso} />
      <PerfilProvider initialPerfil={perfilAcesso}>
        <main className="md:ml-64 pt-16 md:pt-6 p-4 md:p-6 min-h-screen">
          {children}
        </main>
      </PerfilProvider>
    </div>
  );
}
