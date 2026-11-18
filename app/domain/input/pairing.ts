import type { Team } from '../score/types'

/**
 * Guided pairing: « Appuie sur le tag de l'équipe bleue », then « … orange ».
 * The first tag pressed at each step is assigned to that team.
 */
export interface PairingState {
  readonly step: Team | 'done'
  readonly assigned: Readonly<Partial<Record<Team, string>>>
  /** Tag pressed again for the wrong team (already assigned), to show a hint. */
  readonly rejected: string | null
}

export function startPairing(): PairingState {
  return { step: 'blue', assigned: {}, rejected: null }
}

export function pairingPress(state: PairingState, deviceId: string): PairingState {
  if (state.step === 'done') return state
  if (Object.values(state.assigned).includes(deviceId)) {
    return { ...state, rejected: deviceId }
  }
  const assigned = { ...state.assigned, [state.step]: deviceId }
  return { step: state.step === 'blue' ? 'orange' : 'done', assigned, rejected: null }
}
