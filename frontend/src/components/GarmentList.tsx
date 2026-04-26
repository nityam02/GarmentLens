import { useState } from 'react'
import type { Garment } from '../types'
import { GarmentCard } from './GarmentCard'
import { overrideClassification, getImageUrl } from '../api/garments'

type Tab = 'ready' | 'pending' | 'completed'

interface Props {
  garments: Garment[]
  loading: boolean
  error: string | null
  onComplete: (id: string) => Promise<void>
  onOverride: (id: string, override: Parameters<typeof overrideClassification>[1]) => Promise<void>
}

const TASK_NAME: Record<string, string> = {
  torn_seam: 'Repair Torn Seam', hole: 'Patch Hole', stain: 'Remove Stain',
  broken_zipper: 'Replace Zipper', missing_button: 'Replace Button',
  worn_fabric: 'Restore Worn Fabric', hem_damage: 'Repair Hem',
  multiple: 'Multiple Repairs', none_visible: 'General Inspection',
}

const todayStart = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() / 1000
}

const shortId = (id: string) => `#T-${id.slice(0, 4).toUpperCase()}`

export const GarmentList = ({ garments, loading, error, onComplete, onOverride }: Props) => {
  const [tab, setTab]           = useState<Tab>('ready')
  const [selected, setSelected] = useState<Garment | null>(null)

  const ready          = garments.filter((g) => g.status === 'classified')
  const pending        = garments.filter((g) => g.status === 'pending' || g.status === 'classification_failed')
  const completed      = garments.filter((g) => g.status === 'completed')
  const completedToday = completed.filter((g) => g.completedAt && g.completedAt >= todayStart())
  const visible        = tab === 'ready' ? ready : tab === 'pending' ? pending : completed

  const handleImageClick = (g: Garment) => setSelected((prev) => prev?.id === g.id ? null : g)

  // Keep image panel in sync if the selected garment is updated by polling
  const liveSelected = selected ? garments.find((g) => g.id === selected.id) ?? selected : null
  const cls = liveSelected ? (liveSelected.override ?? liveSelected.ai) : null

  if (loading && garments.length === 0) {
    return (
      <div className="queue-page">
        <div className="list-empty"><span className="spinner spinner--dark" /><span>Loading queue…</span></div>
      </div>
    )
  }

  if (error) {
    return <div className="queue-page"><div className="list-error">{error}</div></div>
  }

  return (
    <div className="queue-page">
      <div className="page-heading">
        <h1 className="page-title">Work Queue</h1>
        <p className="page-sub">Manage active repairs and throughput.</p>
      </div>

      {/* Stat cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-label">IN QUEUE</div>
          <div className="stat-card-value">{ready.length + pending.length}</div>
          {pending.length > 0 && <div className="stat-card-note">+{pending.length} classifying</div>}
          <div className="stat-card-icon">
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">COMPLETED TODAY</div>
          <div className="stat-card-value">{completedToday.length}</div>
          <div className="stat-card-note">Target: 20</div>
          <div className="stat-card-icon">
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tab filters */}
      <div className="tab-filters">
        {(['ready','pending','completed'] as Tab[]).map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? 'tab-btn--active' : ''}`} onClick={() => setTab(t)}>
            {t === 'ready' ? 'Ready to Start' : t === 'pending' ? 'Classifying' : 'Completed'}
            {t === 'ready' && ready.length > 0 && <span className="tab-count">{ready.length}</span>}
            {t === 'pending' && pending.length > 0 && <span className="tab-count">{pending.length}</span>}
          </button>
        ))}
      </div>

      {/* Split layout: list + image panel */}
      <div className={`queue-layout ${liveSelected ? 'queue-layout--split' : ''}`}>
        <div className="queue-list-col">
          {visible.length === 0 ? (
            <div className="list-empty">
              {tab === 'ready'     && <p>No garments ready. Upload a photo to get started.</p>}
              {tab === 'pending'   && <p>No garments being classified right now.</p>}
              {tab === 'completed' && <p>No completed garments yet.</p>}
            </div>
          ) : (
            <div className="queue-list">
              {visible.map((g) => (
                <GarmentCard
                  key={g.id}
                  garment={g}
                  onComplete={onComplete}
                  onOverride={onOverride}
                  onImageClick={handleImageClick}
                  selected={liveSelected?.id === g.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right image panel */}
        {liveSelected && (
          <aside className="image-panel">
            <div className="image-panel-header">
              <span className="image-panel-id">{shortId(liveSelected.id)}</span>
              <button className="image-panel-close" onClick={() => setSelected(null)} aria-label="Close">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <img
              src={getImageUrl(liveSelected.filename)}
              alt={liveSelected.originalName}
              className="image-panel-img"
            />

            <div className="image-panel-body">
              <p className="image-panel-filename">{liveSelected.originalName}</p>

              {liveSelected.status === 'pending' && (
                <div className="image-panel-thinking">
                  <span className="spinner spinner--dark" />
                  <span>AI is analysing this image…</span>
                </div>
              )}

              {cls && (
                <div className="image-panel-fields">
                  {[
                    { label: 'Task',       val: TASK_NAME[cls.damage] ?? cls.damage },
                    { label: 'Type',       val: cls.type },
                    { label: 'Material',   val: cls.material },
                    { label: 'Damage',     val: cls.damage.replace(/_/g, ' ') },
                    { label: 'Complexity', val: cls.complexity },
                  ].map(({ label, val }) => (
                    <div key={label} className="image-panel-field">
                      <span className="image-panel-field-label">{label}</span>
                      <span className="image-panel-field-val">{val}</span>
                      {!liveSelected.override && <span className="ai-pill">AI</span>}
                    </div>
                  ))}
                  {cls.notes && <p className="image-panel-notes">{cls.notes}</p>}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
