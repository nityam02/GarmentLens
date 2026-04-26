import './app.css'
import { UploadForm } from './components/UploadForm'
import { GarmentList } from './components/GarmentList'
import { useGarments } from './hooks/useGarments'

export const App = () => {
  const { garments, loading, error, addGarment, markComplete, saveOverride } = useGarments()

  const activeCount = garments.filter((g) => g.status !== 'completed').length
  const completedCount = garments.filter((g) => g.status === 'completed').length

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-mark">GL</div>
            <span className="brand-name">GarmentLens</span>
            <span className="brand-sub">Intake</span>
          </div>
          <div className="header-right">
            <div className="header-stats">
              <span className="header-stat">
                <span className="header-stat-val">{activeCount}</span>
                <span className="header-stat-label">In queue</span>
              </span>
              <span className="header-stat-divider" />
              <span className="header-stat">
                <span className="header-stat-val">{completedCount}</span>
                <span className="header-stat-label">Done today</span>
              </span>
            </div>
            <span className="header-tag">Internal Tool</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-grid">
          <aside className="app-sidebar">
            <UploadForm onUploaded={addGarment} />
          </aside>
          <section className="app-content">
            <GarmentList
              garments={garments}
              loading={loading}
              error={error}
              onComplete={markComplete}
              onOverride={saveOverride}
            />
          </section>
        </div>
      </main>
    </div>
  )
}
