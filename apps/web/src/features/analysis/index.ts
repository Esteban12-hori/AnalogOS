/**
 * features/analysis — the Reading (ADR-013): team evaluation result, highlighted
 * reasons (deterministic template or validated Anthropic selection) and snapshot facts.
 * Slots: `left.reading` (panel ≥1440 in Mission), `rail.reading` ("Reading" tab of the rail in
 * 1100–1439), `full.reading` (full sheet tab / S2), `sheet.reading` ("Reading" view
 * of S2 with no ● selected, M11) and `pill.reading` (pill in Explore ≥1100 and in Mission 1100–1439).
 *
 * STABLE INTERFACE: types and signatures of this file (docs/BUILD_CONTRACTS.md §2.8).
 *
 * Main chunk: this file, the pill and the panel wrapper. The view, the facts layer
 * and the adapters are downloaded with `import()` when the Reading is opened. The AI is never called on its own:
 * only with "✦ Highlight reasons with AI", which goes through the mission controller (team reducer).
 */
import type { AppData } from '../../shell/public'

export interface ReadingPanelProps {
  data: AppData
  /** 'panel' (left ≥1440) · 'rail' (rail tab 1100–1439) · 'full' (full sheet / S2). */
  placement: 'panel' | 'rail' | 'full'
}

export interface ReadingPillProps {
  data: AppData
  /** Counter for "Go to the Reading" (M11): each new value opens the pill. */
  openSignal?: number
}

export { ReadingPanel } from './ReadingPanel'
export { ReadingPill } from './ReadingPill'
export type { FactsLayer, SiteFacts } from './types'
