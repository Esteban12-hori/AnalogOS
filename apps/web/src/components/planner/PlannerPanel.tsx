import { useMemo } from 'react'
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import type { GeologyContextState } from '../../domain/geologyContext'
import type { EvidenceBundle } from '../../mission'
import { PlannerView, type PlannerIntent } from './PlannerView'
import { usePlanner } from './usePlanner'

export type { PlannerIntent } from './PlannerView'

/**
 * Standalone team planner: its own state (usePlanner) and the full view. The integrated interface
 * uses `PlannerView` with the shared planner (ADR-013); this wrapper retains the
 * signature and behavior of the original panel, including the optional geological context (M10).
 */
export function PlannerPanel({ snapshot, intent, geology }: { snapshot: DemoSnapshot; intent: PlannerIntent | null; geology?: GeologyContextState }) {
  const bundle = useMemo<EvidenceBundle>(() => ({ candidates: snapshot.candidates, manifest: snapshot.manifest, profile: snapshot.profile }), [snapshot])
  const api = usePlanner(bundle, geology)
  return <PlannerView snapshot={snapshot} api={api} intent={intent} />
}
