import type { Garment } from '../types'
import { GarmentCard } from './GarmentCard'
import { overrideClassification } from '../api/garments'

interface Props {
  garments: Garment[]
  loading: boolean
  error: string | null
  onComplete: (id: string) => Promise<void>
  onOverride: (id: string, override: Parameters<typeof overrideClassification>[1]) => Promise<void>
}

export const GarmentList = ({ garments, loading, error, onComplete, onOverride }: Props) => {
  const active = garments.filter((g) => g.status !== 'completed')
  const completed = garments.filter((g) => g.status === 'completed')

  if (loading && garments.length === 0) {
    return (
      <div className="list-section">
        <h2 className="section-title">Garment Queue</h2>
        <div className="list-empty">
          <span className="spinner" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="list-section">
        <h2 className="section-title">Garment Queue</h2>
        <div className="list-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="list-section">
      <div className="list-header">
        <h2 className="section-title">Garment Queue</h2>
        <div className="queue-stats">
          <span className="stat-badge">{active.length} active</span>
          <span className="stat-badge stat-badge--muted">{completed.length} completed</span>
        </div>
      </div>

      {active.length === 0 && completed.length === 0 ? (
        <div className="list-empty">
          <p>No garments yet. Upload a photo to get started.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="garment-list">
              {active.map((g) => (
                <GarmentCard key={g.id} garment={g} onComplete={onComplete} onOverride={onOverride} />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <>
              <h3 className="subsection-title">Completed</h3>
              <div className="garment-list garment-list--completed">
                {completed.map((g) => (
                  <GarmentCard key={g.id} garment={g} onComplete={onComplete} onOverride={onOverride} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
