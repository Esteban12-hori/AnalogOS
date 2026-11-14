/**
 * Store `ui` (docs/UX_REDESIGN.md §2.1). Estado de interfaz compartido entre el armazón y las
 * features. Archivo del integrador: las features lo leen con `useUi` y escriben solo con
 * `uiActions` (cada acción dice qué feature la usa en docs/BUILD_CONTRACTS.md).
 *
 * `stageAnchor` {x, y, visible, mode} cambia en cada cuadro: NO va aquí; lo publica el globo por
 * su propio canal (features/globe).
 */
import { createStore, useStore } from './store'

export type UiMode = 'explorar' | 'mision'
export type SelectionKind = 'evaluated' | 'reference'

export interface UiSelection {
  siteId: string
  kind: SelectionKind
  /** true = vista previa (p. ej. el #1 al llegar resultados): no abre la hoja ni mueve el foco. */
  preview: boolean
}

export interface StageInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export type MissionPhase = 'idle' | 'interpreting' | 'profile' | 'scoring' | 'analysis' | 'done' | 'error' | 'cancelled'
export type IntroPhase = 'pending' | 'play' | 'done'

export type UiState = {
  mode: UiMode
  selection: UiSelection | null
  /** Canal ligero carrusel → globo. */
  hoverSiteId: string | null
  /** Riel ↔ líneas ↔ fichas de la IA. */
  activeCriterionId: string | null
  previewCriterionId: string | null
  /** Solo se actualiza cuando el layout se asienta (fin de transición), nunca por cuadro. */
  stageInsets: StageInsets
  /** Rects de paneles cacheados con ResizeObserver, para layoutLeaders. */
  obstacles: readonly DOMRectReadOnly[]
  missionPhase: MissionPhase
  introPhase: IntroPhase
  /** Decide si los resultados pueden volar al #1 (null = el usuario no tocó la cámara). */
  cameraTouchedAt: number | null
}

export const ZERO_INSETS: StageInsets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 })

export function readModeFromSearch(search: string): UiMode {
  const value = new URLSearchParams(search).get('modo')
  return value === 'mision' || value === 'misión' ? 'mision' : 'explorar'
}

/** `?modo=` se escribe con replaceState; Explorar es el modo por defecto y no se escribe. */
export function searchWithMode(search: string, mode: UiMode): string {
  const params = new URLSearchParams(search)
  if (mode === 'mision') params.set('modo', 'mision')
  else params.delete('modo')
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function createInitialUiState(search = ''): UiState {
  return {
    mode: readModeFromSearch(search),
    // Explorar arranca sin selección: el globo es el protagonista y el riel queda cerrado.
    selection: null,
    hoverSiteId: null,
    activeCriterionId: null,
    previewCriterionId: null,
    stageInsets: ZERO_INSETS,
    obstacles: [],
    missionPhase: 'idle',
    introPhase: 'pending',
    cameraTouchedAt: null,
  }
}

export const uiStore = createStore<UiState>(
  createInitialUiState(typeof window === 'undefined' ? '' : window.location.search),
)

export function useUi<T>(selector: (state: UiState) => T): T {
  return useStore(uiStore, selector)
}

export function sameInsets(a: StageInsets, b: StageInsets): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left
}

function sameRects(a: readonly DOMRectReadOnly[], b: readonly DOMRectReadOnly[]): boolean {
  return a.length === b.length && a.every((rect, i) => {
    const other = b[i]
    return other !== undefined && rect.x === other.x && rect.y === other.y && rect.width === other.width && rect.height === other.height
  })
}

const PHASES_BUSY: readonly MissionPhase[] = ['interpreting', 'profile', 'scoring', 'analysis']

/** ¿Hay una misión en curso? (resultados previos a --o-busy con aria-busy, sin inert). */
export function isMissionBusy(phase: MissionPhase): boolean {
  return PHASES_BUSY.includes(phase)
}

export const uiActions = {
  setMode(mode: UiMode): void {
    uiStore.setState({ mode })
  },
  /** Selección manual (preview=false) o vista previa (preview=true). */
  select(siteId: string, kind: SelectionKind = 'evaluated', preview = false): void {
    const current = uiStore.getState().selection
    if (current && current.siteId === siteId && current.kind === kind && current.preview === preview) return
    uiStore.setState({ selection: { siteId, kind, preview } })
  },
  clearSelection(): void {
    uiStore.setState({ selection: null, activeCriterionId: null, previewCriterionId: null })
  },
  setHover(siteId: string | null): void {
    uiStore.setState({ hoverSiteId: siteId })
  },
  setActiveCriterion(criterionId: string | null): void {
    uiStore.setState({ activeCriterionId: criterionId })
  },
  setPreviewCriterion(criterionId: string | null): void {
    uiStore.setState({ previewCriterionId: criterionId })
  },
  /** Solo el armazón: al asentarse el layout. Ignora valores iguales para no notificar. */
  setStageInsets(insets: StageInsets): void {
    if (sameInsets(uiStore.getState().stageInsets, insets)) return
    uiStore.setState({ stageInsets: Object.freeze({ ...insets }) })
  },
  /** Solo el armazón (ResizeObserver de sus paneles). */
  setObstacles(obstacles: readonly DOMRectReadOnly[]): void {
    if (sameRects(uiStore.getState().obstacles, obstacles)) return
    uiStore.setState({ obstacles: Object.freeze([...obstacles]) })
  },
  setMissionPhase(missionPhase: MissionPhase): void {
    uiStore.setState({ missionPhase })
  },
  setIntroPhase(introPhase: IntroPhase): void {
    uiStore.setState({ introPhase })
  },
  /** El globo/mapa lo llama ante cualquier input del usuario sobre la cámara. */
  touchCamera(at: number = Date.now()): void {
    uiStore.setState({ cameraTouchedAt: at })
  },
  /** Al empezar una espera de IA: los resultados solo volarán al #1 si nadie toca la cámara. */
  resetCameraTouch(): void {
    uiStore.setState({ cameraTouchedAt: null })
  },
}
