/**
 * Datos que el armazón entrega a cada slot (props `data`). Archivo del integrador.
 * El snapshot ya viene validado contra los contratos en el límite (loadDemoSnapshot).
 */
import type { DemoSnapshot } from '../data/loadDemoSnapshot'
import type { VisualContextState } from '../data/loadVisualContext'

export interface AppData {
  /** 'loading' mientras llega el snapshot; 'error' si no pasó la validación o no cargó. */
  status: 'loading' | 'ready' | 'error'
  /** null mientras carga o si falló. */
  snapshot: DemoSnapshot | null
  /** Contexto visual Sentinel-2 (opcional: nunca bloquea ni rompe el snapshot). */
  visual: VisualContextState
  /** Mensaje del error de carga, si lo hubo. */
  error: string | null
}

/** true si todos los candidatos son fixtures sintéticos (rótulo «DEMOSTRACIÓN TÉCNICA»). */
export function isFixtureSnapshot(snapshot: DemoSnapshot | null): boolean {
  return snapshot !== null && snapshot.candidates.length > 0 && snapshot.candidates.every((candidate) => candidate.status === 'fixture')
}
