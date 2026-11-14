/**
 * Qué hace la cámara al cambiar la selección (docs/UX_REDESIGN.md §1.6 y coreografías B y D):
 *  - selección manual: vuela en paralelo con la apertura del riel;
 *  - vista previa del #1 al llegar resultados: vuela solo si el usuario no tocó la cámara
 *    durante la espera; si la tocó, no se le quita el control y aparece «Centrar en ‹#1›».
 */
export type SelectionCamera = 'fly' | 'chip'

export function selectionCamera(preview: boolean, cameraTouched: boolean): SelectionCamera {
  return preview && cameraTouched ? 'chip' : 'fly'
}
