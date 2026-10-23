/**
 * Utilitários para manipulação de datas no formato Brasileiro (DD/MM/YYYY)
 * e formato de Banco de Dados (YYYY-MM-DD)
 */

export function formatDateToDB(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export function formatDateFromDB(dateString: string): string {
  if (!dateString) return "";
  
  // Espera-se YYYY-MM-DD
  const [year, month, day] = dateString.split('-');
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  
  return dateString;
}

export function getTodayIso(): string {
  return formatDateToDB(new Date());
}
