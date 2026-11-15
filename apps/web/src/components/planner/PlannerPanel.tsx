import { useMemo } from 'react'
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import type { EvidenceBundle } from '../../mission'
import { PlannerView, type PlannerIntent } from './PlannerView'
import { usePlanner } from './usePlanner'

export type { PlannerIntent } from './PlannerView'

/**
 * Planificador autónomo del equipo: su propio estado (usePlanner) y la vista completa. La interfaz
 * integrada usa `PlannerView` con el planificador compartido (ADR-013); este envoltorio conserva la
 * firma y el comportamiento del panel original.
 */
export function PlannerPanel({ snapshot, intent }: { snapshot: DemoSnapshot; intent: PlannerIntent | null }) {
  const bundle = useMemo<EvidenceBundle>(() => ({ candidates: snapshot.candidates, manifest: snapshot.manifest, profile: snapshot.profile }), [snapshot])
  const api = usePlanner(bundle)
  return <PlannerView snapshot={snapshot} api={api} intent={intent} />
}
