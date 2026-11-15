/**
 * What the camera does when the selection changes (docs/UX_REDESIGN.md §1.6 and choreographies B and D):
 *  - manual selection: flies in parallel with the opening of the rail;
 *  - preview of #1 when results arrive: flies only if the user did not touch the camera
 *    during the wait; if they touched it, control is not taken away from them and "Center on ‹#1›" appears.
 */
export type SelectionCamera = 'fly' | 'chip'

export function selectionCamera(preview: boolean, cameraTouched: boolean): SelectionCamera {
  return preview && cameraTouched ? 'chip' : 'fly'
}
