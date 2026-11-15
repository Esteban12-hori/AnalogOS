/**
 * Datos que el armazón entrega a cada slot (props `data`). Archivo del integrador.
 * El snapshot ya viene validado contra los contratos en el límite (loadDemoSnapshot).
 */
import type { DemoSnapshot } from '../data/loadDemoSnapshot'
import type { VisualContextState } from '../data/loadVisualContext'
import type { AppGeology } from '../data/loadAppGeology'

export interface AppData {
  /** 'loading' mientras llega el snapshot; 'error' si no pasó la validación o no cargó. */
  status: 'loading' | 'ready' | 'error'
  /** null mientras carga o si falló. */
  snapshot: DemoSnapshot | null
  /** Contexto visual Sentinel-2 (opcional: nunca bloquea ni rompe el snapshot). */
  visual: VisualContextState
  /** Mensaje del error de carga, si lo hubo. */
  error: string | null
  /**
   * Contexto geológico oficial (M9, opcional): se carga en un chunk diferido después del snapshot y
   * nunca bloquea nada. Ausente = todavía cargando.
   */
  geology?: AppGeology
}

/** Estado estable «cargando» (misma referencia siempre: no dispara efectos en cada render). */
const GEOLOGY_LOADING: AppGeology['state'] = { status: 'loading' }

/** Estado del contexto geológico para las features (ausente = cargando). */
export function geologyStateOf(data: Pick<AppData, 'geology'>): AppGeology['state'] {
  return data.geology?.state ?? GEOLOGY_LOADING
}

/** ¿Este sector tiene SU ficha geológica oficial válida? (selectGeologySite «ready», calculado al cargar). */
export function hasGeologyFor(data: Pick<AppData, 'geology'>, siteId: string): boolean {
  return data.geology?.readySites.has(siteId) ?? false
}

/** true si todos los candidatos son fixtures sintéticos (rótulo «DEMOSTRACIÓN TÉCNICA»). */
export function isFixtureSnapshot(snapshot: DemoSnapshot | null): boolean {
  return snapshot !== null && snapshot.candidates.length > 0 && snapshot.candidates.every((candidate) => candidate.status === 'fixture')
}
