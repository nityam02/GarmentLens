import './app.css'
import { useState } from 'react'
import { UploadForm } from './components/UploadForm'
import { GarmentList } from './components/GarmentList'
import { useGarments } from './hooks/useGarments'

type Page = 'intake' | 'queue'

export const App = () => {
  const { garments, loading, error, addGarment, markComplete, saveOverride } = useGarments()
  const [page, setPage] = useState<Page>('intake')

  const activeCount = garments.filter((g) => g.status !== 'completed').length

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">GL</div>
          <div className="brand-text">
            <div className="brand-name">GarmentLens</div>
            <div className="brand-caption">Intake Center</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${page === 'intake' ? 'nav-item--active' : ''}`}
            onClick={() => setPage('intake')}
          >
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Intake
          </button>

          <button
            className={`nav-item ${page === 'queue' ? 'nav-item--active' : ''}`}
            onClick={() => setPage('queue')}
          >
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Queue
            {activeCount > 0 && <span className="nav-badge">{activeCount}</span>}
          </button>
        </nav>
      </aside>

      <div className="main-wrap">
        <header className="top-bar">
          <div className="top-bar-search">
            <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input className="search-input" placeholder="Search garments…" />
          </div>
          <div className="top-bar-actions">
            <button className="icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button className="icon-btn" aria-label="Settings">
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </header>

        <main className="page-content">
          {page === 'intake' ? (
            <div className="intake-page">
              <div className="page-heading">
                <h1 className="page-title">New Garment Intake</h1>
                <p className="page-sub">Upload a photo to auto-detect details, or manually enter below.</p>
              </div>
              <UploadForm onUploaded={(g) => { addGarment(g); setPage('queue') }} />
            </div>
          ) : (
            <GarmentList
              garments={garments}
              loading={loading}
              error={error}
              onComplete={markComplete}
              onOverride={saveOverride}
            />
          )}
        </main>
      </div>
    </div>
  )
}
