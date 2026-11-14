import { shortCandidateName } from '../domain/formatting'

/** Nombre corto del lugar para cabeceras («Pampa Yungay», sin «— sector de screening»). */
export function placeLabel(name: string): string {
  return shortCandidateName(name).split(' — ')[0] ?? name
}
