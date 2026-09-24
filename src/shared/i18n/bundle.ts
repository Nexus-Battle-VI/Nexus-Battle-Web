/** Namespace → arbol de traducciones de un idioma. */
export type LocaleBundle = Readonly<Record<string, Record<string, unknown>>>

/** `./inventory.json` → `inventory`. */
export const collectNamespaces = (
  modules: Readonly<Record<string, Record<string, unknown>>>,
): LocaleBundle =>
  Object.fromEntries(
    Object.entries(modules).map(([path, tree]) => [
      path.replace(/^.*\//u, '').replace(/\.json$/u, ''),
      tree,
    ]),
  )
