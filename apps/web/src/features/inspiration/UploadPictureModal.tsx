import { useState, useRef } from 'react'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { addPicture } from './storage'
import type { InspirationPicture } from './types'

interface Props {
  onClose: () => void
  onSuccess: (picture: InspirationPicture) => void
}

export function UploadPictureModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(selectedFile: File) {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP, or GIF).')
      return
    }
    setError(null)
    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(selectedFile)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Please choose a picture to upload.')
      return
    }

    try {
      setIsSubmitting(true)
      const newPic = await addPicture(file, caption)
      onSuccess(newPic)
      onClose()
    } catch {
      setError('Failed to upload picture. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog vision-upload-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">
            <ImageIcon size={20} className="dialog-title-icon" />
            Upload Inspiration Picture
          </h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          {error && <div className="form-server-error">{error}</div>}

          {/* Drag & Drop Area */}
          <div
            className={`picture-drop-zone ${isDragging ? 'picture-drop-zone--active' : ''} ${preview ? 'picture-drop-zone--has-preview' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0])
                }
              }}
            />

            {preview ? (
              <div className="picture-preview-wrap">
                <img src={preview} alt="Upload preview" className="picture-preview-img" />
                <div className="picture-preview-overlay">
                  <span>Click or drop another photo to change</span>
                </div>
              </div>
            ) : (
              <div className="picture-drop-prompt">
                <div className="picture-drop-icon">
                  <Upload size={24} />
                </div>
                <p className="picture-drop-text">
                  <strong>Click to browse</strong> or drag & drop your study photo here
                </p>
                <p className="picture-drop-sub">PNG, JPG, WEBP or GIF (Up to 10MB)</p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="pic-caption" className="form-label">
              Caption / Motivation Note (Optional)
            </label>
            <input
              id="pic-caption"
              type="text"
              className="form-input"
              placeholder="e.g. Dream university, Study goal, Vision board"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="dialog-footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!file || isSubmitting}
            >
              <Upload size={16} />
              {isSubmitting ? 'Uploading...' : 'Save to Vision Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

