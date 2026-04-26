import { useState } from 'react'
import type { Garment, Classification } from '../types'
import { getImageUrl } from '../api/garments'
import { OverrideModal } from './OverrideModal'

interface Props {
  garment: Garment
  onComplete: (id: string) => Promise<void>
  onOverride: (id: string, override: Parameters<typeof import('../api/garments').overrideClassification>[1]) => Promise<void>
}

const COMPLEXITY_COLOR: Record<string, string> = {
  low: 'badge--green',
  medium: 'badge--amber',
  high: 'badge--red',
}

const pct = (n: number) => `${Math.round(n * 100)}%`

const ConfidenceBar = ({ label, value }: { label: string; value: number }) => {
  const color = value > 0.8 ? 'var(--green)' : value > 0.6 ? 'var(--amber)' : 'var(--red)'
  return (
    <div className="confidence-row">
      <span className="confidence-label">{label}</span>
      <div className="confidence-track">
        <div className="confidence-fill" style={{ width: pct(value), background: color }} />
      </div>
      <span className="confidence-pct">{pct(value)}</span>
    </div>
  )
}

const ClassificationView = ({ cls, label, isOverride }: { cls: Omit<Classification, 'confidence'> & { confidence?: Classification['confidence'] }; label: string; isOverride?: boolean }) => (
  <div className={`classification ${isOverride ? 'classification--override' : ''}`}>
    <span className="classification-label">{label}</span>
    <div className="badge-row">
      <span className="badge badge--blue">{cls.type}</span>
      <span className="badge badge--purple">{cls.material}</span>
      <span className="badge badge--orange">{cls.damage?.replace(/_/g, ' ')}</span>
      <span className={`badge ${COMPLEXITY_COLOR[cls.complexity ?? 'low']}`}>{cls.complexity}</span>
    </div>
    {cls.notes && <p className="classification-notes">{cls.notes}</p>}
    {cls.confidence && (
      <div className="confidence-section">
        <ConfidenceBar label="type" value={cls.confidence.type} />
        <ConfidenceBar label="material" value={cls.confidence.material} />
        <ConfidenceBar label="damage" value={cls.confidence.damage} />
        <ConfidenceBar label="complexity" value={cls.confidence.complexity} />
      </div>
    )}
  </div>
)

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  classified: 'Classified',
  classification_failed: 'AI Failed',
  completed: 'Completed',
}
const STATUS_CLASS: Record<string, string> = {
  pending: 'status--pending',
  classified: 'status--classified',
  classification_failed: 'status--failed',
  completed: 'status--completed',
}

const fmt = (ts: number) => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export const GarmentCard = ({ garment, onComplete, onOverride }: Props) => {
  const [showOverride, setShowOverride] = useState(false)
  const [completing, setCompleting] = useState(false)

  const handleComplete = async () => {
    setCompleting(true)
    try { await onComplete(garment.id) } finally { setCompleting(false) }
  }

  const effective = garment.override ?? garment.ai

  return (
    <>
      <div className={`garment-card ${garment.status === 'completed' ? 'garment-card--completed' : ''}`}>
        <div className="card-image-col">
          <img
            src={getImageUrl(garment.filename)}
            alt={garment.originalName}
            className="card-image"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src =
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88"><rect width="88" height="88" fill="%23eceef0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="9" fill="%2376777d" font-family="sans-serif">No image</text></svg>'
            }}
          />
          <div className="card-time">{fmt(garment.createdAt)}</div>
        </div>

        <div className="card-content">
          <div className="card-header">
            <span className="card-name" title={garment.originalName}>{garment.originalName}</span>
            <span className={`status-badge ${STATUS_CLASS[garment.status]}`}>{STATUS_LABEL[garment.status]}</span>
          </div>

          {garment.override && garment.ai && (
            <ClassificationView
              cls={{ ...garment.ai }}
              label="AI"
            />
          )}

          {effective ? (
            <ClassificationView
              cls={garment.override ? garment.override : { ...garment.ai!, confidence: garment.ai!.confidence }}
              label={garment.override ? 'Override' : 'AI'}
              isOverride={!!garment.override}
            />
          ) : (
            <p className="no-classification">
              {garment.status === 'pending'
                ? <span className="classifying-indicator"><span className="spinner" />Classifying…</span>
                : 'Classification failed'}
            </p>
          )}

          {garment.status !== 'completed' && (
            <div className="card-actions">
              <button className="btn btn--secondary btn--sm" onClick={() => setShowOverride(true)}>
                Edit
              </button>
              {garment.status === 'classified' && (
                <button className="btn btn--success btn--sm" onClick={handleComplete} disabled={completing}>
                  {completing ? 'Marking...' : 'Mark Complete'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showOverride && (
        <OverrideModal
          garment={garment}
          onSave={(override) => onOverride(garment.id, override)}
          onClose={() => setShowOverride(false)}
        />
      )}
    </>
  )
}
