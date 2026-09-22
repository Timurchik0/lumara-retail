/** Размеры через запятую/пробел, плюс диапазоны вида "35-40" — раскрываются
 * в 35,36,37,38,39,40. Порядок сохраняется, дубли схлопываются. */
export function parseSizes(raw: FormDataEntryValue | string | null): string[] {
  const tokens = String(raw ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const sizes: string[] = [];
  for (const token of tokens) {
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const step = start <= end ? 1 : -1;
      for (let n = start; step > 0 ? n <= end : n >= end; n += step) {
        sizes.push(String(n));
      }
    } else {
      sizes.push(token);
    }
  }
  return [...new Set(sizes)];
}
