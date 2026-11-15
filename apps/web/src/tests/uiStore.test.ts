import { describe, expect, it, vi } from 'vitest'
import { createStore } from '../state/store'
import {
  createInitialUiState,
  isMissionBusy,
  readModeFromSearch,
  searchWithMode,
  uiActions,
  uiStore,
  ZERO_INSETS,
} from '../state/ui'
import { INITIAL_MISSION_STATE, missionStore } from '../state/mission'

describe('createStore', () => {
  it('mezcla superficialmente y notifica solo si algo cambió', () => {
    const store = createStore({ a: 1, b: 'x' })
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.setState({ a: 1 })
    expect(listener).not.toHaveBeenCalled()
    const before = store.getState()
    store.setState((state) => ({ a: state.a + 1 }))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getState()).toEqual({ a: 2, b: 'x' })
    expect(store.getState()).not.toBe(before)
    unsubscribe()
    store.setState({ b: 'y' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reset vuelve al estado inicial', () => {
    const store = createStore({ n: 0 })
    store.setState({ n: 5 })
    store.reset()
    expect(store.getState().n).toBe(0)
  })
})

describe('store ui (UX_REDESIGN §2.1)', () => {
  it('arranca en Explorar, sin selección, intro pendiente y misión en reposo', () => {
    const state = createInitialUiState('')
    expect(state).toMatchObject({ mode: 'explorar', selection: null, introPhase: 'pending', missionPhase: 'idle', cameraTouchedAt: null })
    expect(state.stageInsets).toEqual(ZERO_INSETS)
    expect(createInitialUiState('?modo=mision').mode).toBe('mision')
  })

  it('lee y escribe ?modo= (Explorar no se escribe)', () => {
    expect(readModeFromSearch('?modo=misión')).toBe('mision')
    expect(readModeFromSearch('?modo=otro')).toBe('explorar')
    expect(searchWithMode('?intro=full', 'mision')).toBe('?intro=full&modo=mision')
    expect(searchWithMode('?modo=mision&intro=full', 'explorar')).toBe('?intro=full')
    expect(searchWithMode('', 'explorar')).toBe('')
  })

  it('selección: misma selección no notifica; limpiar borra también los criterios activos', () => {
    uiStore.reset()
    const listener = vi.fn()
    const unsubscribe = uiStore.subscribe(listener)
    uiActions.select('cl-a')
    uiActions.select('cl-a')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(uiStore.getState().selection).toEqual({ siteId: 'cl-a', kind: 'evaluated', preview: false })
    uiActions.select('cl-a', 'evaluated', true)
    expect(uiStore.getState().selection?.preview).toBe(true)
    uiActions.setActiveCriterion('slope')
    uiActions.clearSelection()
    expect(uiStore.getState()).toMatchObject({ selection: null, activeCriterionId: null, previewCriterionId: null })
    unsubscribe()
  })

  it('los márgenes y obstáculos iguales no notifican (se publican solo al asentarse)', () => {
    uiStore.reset()
    const listener = vi.fn()
    const unsubscribe = uiStore.subscribe(listener)
    uiActions.setStageInsets({ top: 78, right: 0, bottom: 280, left: 0 })
    uiActions.setStageInsets({ top: 78, right: 0, bottom: 280, left: 0 })
    const rect = { x: 1, y: 2, width: 3, height: 4 } as DOMRectReadOnly
    uiActions.setObstacles([rect])
    uiActions.setObstacles([{ ...rect }])
    expect(listener).toHaveBeenCalledTimes(2)
    expect(Object.isFrozen(uiStore.getState().stageInsets)).toBe(true)
    unsubscribe()
  })

  it('fases y cámara', () => {
    uiStore.reset()
    uiActions.setMissionPhase('scoring')
    expect(isMissionBusy(uiStore.getState().missionPhase)).toBe(true)
    expect(isMissionBusy('done')).toBe(false)
    uiActions.touchCamera(1234)
    expect(uiStore.getState().cameraTouchedAt).toBe(1234)
    uiActions.resetCameraTouch()
    expect(uiStore.getState().cameraTouchedAt).toBeNull()
    uiActions.setIntroPhase('done')
    uiActions.setMode('mision')
    expect(uiStore.getState()).toMatchObject({ introPhase: 'done', mode: 'mision' })
    uiStore.reset()
  })
})

describe('store mission', () => {
  it('arranca vacío: sin planificador, solicitud, evaluación ni explicación', () => {
    expect(missionStore.getState()).toEqual(INITIAL_MISSION_STATE)
    expect(INITIAL_MISSION_STATE).toMatchObject({ planner: null, request: null, evaluation: null, explanation: null, stale: false, revision: 0 })
  })

  it('la fase «review» (editar requisitos) no cuenta como espera; borrador y explicación de IA sí', () => {
    expect(isMissionBusy('review')).toBe(false)
    expect(isMissionBusy('interpreting')).toBe(true)
    expect(isMissionBusy('analysis')).toBe(true)
    expect(isMissionBusy('idle')).toBe(false)
  })
})
