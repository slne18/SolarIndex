/** Replace `{key}` placeholders in a translation string. Numbers are formatted with spaced thousands. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((s, [k, v]) => {
    const text = typeof v === "number" ? v.toLocaleString("fr-FR").replace(/\u202f/g, " ") : String(v);
    return s.replaceAll(`{${k}}`, text);
  }, template);
}
