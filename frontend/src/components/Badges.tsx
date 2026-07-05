import type { LifecycleState } from '../protocol/types'
import { lifecycleLabel } from '../protocol/lifecycle'

export function LifecycleBadge({ state }: { state: LifecycleState }) {
  const className =
    state === 'pre_expiry'
      ? 'badge badge-live'
      : state === 'exercise_window'
        ? 'badge badge-window'
        : 'badge badge-closed'

  return <span className={className}>{lifecycleLabel(state)}</span>
}

export function DirectionBadge({ direction }: { direction: 'call' | 'put' }) {
  return (
    <span
      className={`badge ${
        direction === 'call' ? 'bg-sky-500/15 text-sky-400' : 'bg-violet-500/15 text-violet-400'
      }`}
    >
      {direction === 'call' ? 'Call' : 'Put'}
    </span>
  )
}
