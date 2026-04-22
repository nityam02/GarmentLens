import { useState } from 'react'
import type { Garment, GarmentType, Material, DamageType, Complexity } from '../types'
import { GARMENT_TYPES, MATERIALS, DAMAGE_TYPES, COMPLEXITIES } from '../types'

interface Props {
  garment: Garment
  onSave: (override: { type: string; material: string; damage: string; complexity: string; notes: string }) => Promise<void>
  onClose: () => void
}

const current = (garment: Garment) => ({
  type: (garment.override?.type ?? garment.ai?.type ?? 'other') as GarmentType,
  material: (garment.override?.material ?? garment.ai?.material ?? 'unknown') as Material,
  damage: (garment.override?.damage ?? garment.ai?.damage ?? 'none_visible') as DamageType,
  complexity: (garment.override?.complexity ?? garment.ai?.complexity ?? 'low') as Complexity,
  notes: garment.override?.notes ?? garment.ai?.notes ?? '',
})

export const OverrideModal = ({ garment, onSave, onClose }: Props) => {
  const [form, setForm] = useState(current(garment))
  const [saving, setSaving] = useState(false)

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Override Classification</h3>
          <button className="btn btn--ghost" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="field-label">Garment Type
            <select className="field-select" value={form.type} onChange={set('type')}>
              {GARMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label className="field-label">Material
            <select className="field-select" value={form.material} onChange={set('material')}>
              {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>

          <label className="field-label">Damage
            <select className="field-select" value={form.damage} onChange={set('damage')}>
              {DAMAGE_TYPES.map((d) => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
            </select>
          </label>

          <label className="field-label">Complexity
            <select className="field-select" value={form.complexity} onChange={set('complexity')}>
              {COMPLEXITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="field-label">Notes
            <textarea
              className="field-textarea"
              value={form.notes ?? ''}
              onChange={set('notes')}
              rows={2}
              placeholder="Additional observations..."
            />
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Override'}
          </button>
        </div>
      </div>
    </div>
  )
}
