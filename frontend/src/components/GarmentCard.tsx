import { useState, useEffect, useRef } from 'react'
import type { Garment } from '../types'
import { getImageUrl } from '../api/garments'
import { OverrideModal } from './OverrideModal'

interface Props {
  garment: Garment
  onComplete: (id: string) => Promise<void>
  onOverride: (id: string, override: Parameters<typeof import('../api/garments').overrideClassification>[1]) => Promise<void>
  onImageClick: (garment: Garment) => void
  selected: boolean
}

const TASK_NAME: Record<string, string> = {
  torn_seam:      'Repair Torn Seam',
  hole:           'Patch Hole',
  stain:          'Remove Stain',
  broken_zipper:  'Replace Zipper',
  missing_button: 'Replace Button',
  worn_fabric:    'Restore Worn Fabric',
  hem_damage:     'Repair Hem',
  multiple:       'Multiple Repairs',
  none_visible:   'General Inspection',
}

// AI thinking steps cycled during classification
const THINKING_STEPS = [
  'Scanning image…',
  'Analyzing fabric texture…',
  'Detecting damage patterns…',
  'Identifying garment type…',
  'Estimating repair complexity…',
  'Generating classification…',
]

const shortId = (id: string) => `#T-${id.slice(0, 4).toUpperCase()}`
const confidenceTier = (v: number) => v >= 0.85 ? 'high' : v >= 0.6 ? 'mid' : 'low'
const fmt = (ts: number) => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const useElapsed = (startTs: number, active: boolean) => {
  const [elapsed, setElapsed] = useState(() => Math.floor(Date.now() / 1000 - startTs))
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setElapsed(Math.floor(Date.now() / 1000 - startTs)), 1000)
    return () => clearInterval(t)
  }, [startTs, active])
  return elapsed
}

const useThinkingStep = (active: boolean) => {
  const [step, setStep] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      ref.current = (ref.current + 1) % THINKING_STEPS.length
      setStep(ref.current)
    }, 1600)
    return () => clearInterval(t)
  }, [active])
  return THINKING_STEPS[step]
}

export const GarmentCard = ({ garment, onComplete, onOverride, onImageClick, selected }: Props) => {
  const [showOverride, setShowOverride] = useState(false)
  const [completing, setCompleting] = useState(false)

  const isPending   = garment.status === 'pending'
  const isCompleted = garment.status === 'completed'
  const isOverridden = !!garment.override
  const cls = garment.override ?? garment.ai
  const isRush = cls?.complexity === 'high'

  const elapsed     = useElapsed(garment.createdAt, isPending)
  const thinkStep   = useThinkingStep(isPending)

  const taskName   = cls ? (TASK_NAME[cls.damage] ?? 'Garment Repair') : thinkStep
  const description = cls
    ? `${cls.material.charAt(0).toUpperCase() + cls.material.slice(1)} ${cls.type}`
    : `Elapsed: ${elapsed}s`

  const handleComplete = async () => {
    setCompleting(true)
    try { await onComplete(garment.id) } finally { setCompleting(false) }
  }

  return (
    <>
      <div className={`queue-row ${isCompleted ? 'queue-row--done' : ''} ${selected ? 'queue-row--selected' : ''}`}>

        {/* Thumbnail with processing overlay */}
        <div className="thumb-wrap" onClick={() => onImageClick(garment)}>
          <img
            src={getImageUrl(garment.filename)}
            alt={garment.originalName}
            className="queue-thumb"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src =
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23eceef0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="9" fill="%2376777d" font-family="sans-serif">img</text></svg>'
            }}
          />
          {isPending && (
            <div className="thumb-processing">
              <div className="processing-ring" />
              <span className="processing-time">{elapsed}s</span>
            </div>
          )}
          {!isPending && (
            <div className="thumb-expand-hint">
              <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" />
              </svg>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="queue-meta">
          <div className="queue-row-top">
            <span className="queue-id">{shortId(garment.id)}</span>
            {isPending
              ? <span className="priority-badge priority-badge--pending">AI Classifying</span>
              : isRush
                ? <span className="priority-badge priority-badge--rush">RUSH</span>
                : <span className="priority-badge priority-badge--standard">STANDARD</span>
            }
            {isOverridden && <span className="priority-badge priority-badge--override">Edited</span>}
          </div>

          <div className="queue-task">
            {isPending
              ? <span className="thinking-text"><span className="thinking-dot" />{thinkStep}</span>
              : taskName
            }
          </div>
          <div className="queue-desc">{description}</div>

          {/* Inline AI fields */}
          {cls && (
            <div className="ai-fields">
              <span className="ai-field">
                <span className={`conf-dot conf-dot--${confidenceTier(garment.ai?.confidence?.type ?? 1)}`} />
                <span className="ai-field-label">Type:</span>
                <span className="ai-field-val">{cls.type}</span>
                {!isOverridden && <span className="ai-pill">AI</span>}
              </span>
              <span className="ai-field">
                <span className={`conf-dot conf-dot--${confidenceTier(garment.ai?.confidence?.material ?? 1)}`} />
                <span className="ai-field-label">Material:</span>
                <span className="ai-field-val">{cls.material}</span>
                {!isOverridden && <span className="ai-pill">AI</span>}
              </span>
              <span className="ai-field">
                <span className={`conf-dot conf-dot--${confidenceTier(garment.ai?.confidence?.damage ?? 1)}`} />
                <span className="ai-field-label">Damage:</span>
                <span className="ai-field-val">{cls.damage.replace(/_/g, ' ')}</span>
                {!isOverridden && <span className="ai-pill">AI</span>}
              </span>
            </div>
          )}

          {cls?.notes && <p className="queue-notes">{cls.notes}</p>}
        </div>

        {/* Actions */}
        <div className="queue-actions">
          <div className="queue-time">{fmt(garment.createdAt)}</div>
          {!isCompleted && !isPending && (
            <div className="queue-btns">
              <button className="btn-edit" onClick={() => setShowOverride(true)} title="Edit classification">
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              {garment.status === 'classified' && (
                <button className="btn-start" onClick={handleComplete} disabled={completing}>
                  {completing
                    ? <span className="spinner" />
                    : <>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Start
                      </>
                  }
                </button>
              )}
            </div>
          )}
          {isPending && (
            <div className="processing-elapsed">
              <span className="spinner spinner--dark" />
            </div>
          )}
          {isCompleted && (
            <div className="queue-done-mark">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Done
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
