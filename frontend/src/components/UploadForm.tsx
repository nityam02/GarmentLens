import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { uploadGarment } from '../api/garments'
import type { Garment } from '../types'

interface Props {
  onUploaded: (garment: Garment) => void
}

export const UploadForm = ({ onUploaded }: Props) => {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const setSelectedFile = (f: File) => {
    setFile(f)
    setUploadError(null)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setSelectedFile(f)
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setSelectedFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const garment = await uploadGarment(file)
      onUploaded(garment)
      setFile(null)
      setPreview(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="upload-panel">
      <h2 className="section-title">New Garment Intake</h2>

      <div
        className={`drop-zone ${dragging ? 'drop-zone--active' : ''} ${preview ? 'drop-zone--has-preview' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !preview && inputRef.current?.click()}
      >
        {preview ? (
          <div className="preview-wrapper">
            <img src={preview} alt="Preview" className="preview-img" />
            <button
              className="btn btn--ghost preview-clear"
              onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null) }}
            >
              ✕ Remove
            </button>
          </div>
        ) : (
          <div className="drop-zone__empty">
            <div className="drop-icon">📷</div>
            <p className="drop-text">Drop garment photo here</p>
            <p className="drop-subtext">or click to browse · JPG, PNG, WebP · max 10 MB</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        style={{ display: 'none' }}
      />

      {uploadError && <p className="error-msg">{uploadError}</p>}

      <button
        className={`btn btn--primary upload-btn ${uploading ? 'btn--loading' : ''}`}
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? (
          <>
            <span className="spinner" />
            Classifying with AI...
          </>
        ) : (
          'Upload & Classify'
        )}
      </button>
    </div>
  )
}
