/**
 * Extras del composer que dependen del chunk de misión (se cargan con él al entrar a Misión):
 * recientes ⟲ (historial local) y chips «Refinar» con los perfiles predefinidos del motor.
 */
import { useRef } from 'react'
import { useComposer } from './composerStore'
import { recentTexts } from './history'
import { missionController, type MissionSnapshotData } from './missionRun'
import { hidePopover, placeAbove } from './popover'
import './extras.css'

export interface RecentsMenuProps {
  id: string
  onPick: (text: string) => void
}

/** Botón ⟲ y su popover con los últimos textos enviados en este navegador. */
export function RecentsMenu({ id, onPick }: RecentsMenuProps) {
  const history = useComposer((state) => state.history)
  const button = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  const recents = recentTexts(history)
  if (recents.length === 0) return null
  return (
    <>
      <button ref={button} type="button" className="composer-icon" aria-label="Misiones recientes" title="Misiones recientes" popoverTarget={id}>
        <span aria-hidden="true">⟲</span>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="dialog"
        aria-label="Misiones recientes"
        className="composer-popover composer-recent"
        onBeforeToggle={(event) => {
          if (event.newState === 'open') placeAbove(popover.current, button.current, 360)
        }}
      >
        <p className="composer-popover-title">Misiones recientes</p>
        <ul>
          {recents.map((text) => (
            <li key={text}>
              <button
                type="button"
                onClick={() => {
                  hidePopover(popover.current)
                  onPick(text)
                }}
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export interface PresetChipsProps {
  snapshot: MissionSnapshotData | null
  activeProfileId: string | null
}

/** Chips «Refinar»: aparecen al enfocar el composer, encima de él (el dock no crece). */
export function PresetChips({ snapshot, activeProfileId }: PresetChipsProps) {
  const presets = useComposer((state) => state.presets)
  if (!presets || presets.length === 0) return null
  return (
    <div className="composer-chips" role="group" aria-label="Perfiles predefinidos">
      <span className="composer-chips-label" aria-hidden="true">Refinar</span>
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="composer-chip"
          title={preset.description}
          aria-pressed={activeProfileId === preset.id}
          disabled={!snapshot}
          onClick={() => {
            if (snapshot) missionController().applyPreset(preset.id, snapshot)
          }}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
