import './app.css'
import { UploadForm } from './components/UploadForm'
import { GarmentList } from './components/GarmentList'
import { useGarments } from './hooks/useGarments'

export const App = () => {
  const { garments, loading, error, addGarment, markComplete, saveOverride } = useGarments()

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-icon">🧵</span>
            <span className="brand-name">GarmentLens</span>
            <span className="brand-sub">Intake</span>
          </div>
          <div className="header-meta">
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
