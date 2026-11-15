import { shortCandidateName } from '../domain/formatting'

/** Short name of the place for headers ("Pampa Yungay", without "— screening sector"). */
export function placeLabel(name: string): string {
  return shortCandidateName(name).split(' — ')[0] ?? name
}
