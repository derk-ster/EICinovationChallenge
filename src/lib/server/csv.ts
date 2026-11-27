import "server-only";

/** RFC 4180 CSV with spreadsheet formula-injection protection. */
export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

function cell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Prevent =, +, -, @, tab and CR from being evaluated as formulas in Excel/Sheets.
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
