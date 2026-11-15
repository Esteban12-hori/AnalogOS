/**
 * Extras del composer (se cargan con el chunk de misión al entrar a Misión): recientes ⟲
 * (historial local) y sugerencias para empezar una prueba sin IA.
 *
 * Las sugerencias usan el planificador del equipo tal cual: «Usar ejemplo» (`exampleState`),
 * «Añadir requisito: …» (`defaultMetricRequirement`, que llega SIN valor: el usuario escribe el
 * umbral) y «Evaluar un sector…». Nunca proponen cifras.
 */
import { useRef } from 'react'
import type { MetricId } from '../../mission/types'
import { useComposer } from './composerStore'
import { recentTexts } from './history'
import { hidePopover, placeAbove } from './popover'
import { withController } from './runLoader'
import './extras.css'

export interface RecentsMenuProps {
  id: string
  onPick: (text: string) => void
}

/** Botón ⟲ y su popover con los últimos textos evaluados en este navegador. */
export function RecentsMenu({ id, onPick }: RecentsMenuProps) {
  const history = useComposer((state) => state.history)
  const button = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  const recents = recentTexts(history)
  if (recents.length === 0) return null
  return (
    <>
      <button ref={button} type="button" className="composer-icon" aria-label="Pruebas recientes" title="Pruebas recientes" popoverTarget={id}>
        <span aria-hidden="true">⟲</span>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="dialog"
        aria-label="Pruebas recientes"
        className="composer-popover composer-recent"
        onBeforeToggle={(event) => {
          if (event.newState === 'open') placeAbove(popover.current, button.current, 360)
        }}
      >
        <p className="composer-popover-title">Pruebas recientes</p>
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

/** Requisitos que se pueden añadir con un clic (el valor lo escribe el usuario). */
export const METRIC_SUGGESTIONS: ReadonlyArray<{ metric: MetricId; label: string }> = [
  { metric: 'median_slope_degree', label: 'pendiente' },
  { metric: 'terrain_roughness_meter', label: 'rugosidad' },
  { metric: 'local_relief_meter', label: 'relieve' },
  { metric: 'nonvegetated_fraction', label: 'suelo desnudo' },
  { metric: 'polygon_area_km2', label: 'área' },
  { metric: 'country', label: 'país' },
]

/** Sugerencias: aparecen al enfocar el composer, encima de él (el dock no crece). */
export function SuggestionChips() {
  return (
    <div className="composer-chips" role="group" aria-label="Empezar una prueba">
      <button type="button" className="composer-chip" onClick={() => withController((mission) => mission.loadExample())}>
        Usar ejemplo
      </button>
      <span className="composer-chips-label" aria-hidden="true">Añadir requisito</span>
      {METRIC_SUGGESTIONS.map((item) => (
        <button
          key={item.metric}
          type="button"
          className="composer-chip"
          aria-label={`Añadir requisito: ${item.label}`}
          onClick={() => withController((mission) => mission.addMetricRequirement(item.metric))}
        >
          + {item.label}
        </button>
      ))}
      <button type="button" className="composer-chip" onClick={() => withController((mission) => mission.startSector())}>
        Evaluar un sector…
      </button>
    </div>
  )
}
