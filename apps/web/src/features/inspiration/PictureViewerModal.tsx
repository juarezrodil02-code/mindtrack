import { useState } from 'react'
import { X, Trash2, Calendar, Edit2, Check } from 'lucide-react'
import { updatePictureCaption } from './storage'
import type { InspirationPicture } from './types'

interface Props {
  picture: InspirationPicture
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate: (updated: InspirationPicture) => void
}

export function PictureViewerModal({ picture, onClose, onDelete, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [caption, setCaption] = useState(picture.caption || '')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSaveCaption() {
    try {
      setIsSaving(true)
      const updated = await updatePictureCaption(picture.id, caption)
      if (updated) {
        onUpdate(updated)
      }
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  function handleDelete() {
    if (window.confirm('Are you sure you want to delete this picture from your vision board?')) {
      onDelete(picture.id)
      onClose()
    }
  }

  const dateFormatted = new Date(picture.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="picture-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="picture-viewer-header">
          <div className="picture-viewer-info" style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '340px' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: '32px', padding: '4px 8px', fontSize: '0.85rem' }}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Enter photo caption"
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn--xs btn--primary"
                  onClick={handleSaveCaption}
                  disabled={isSaving}
                  title="Save caption"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn--xs btn--ghost"
                  onClick={() => setIsEditing(false)}
                  title="Cancel editing"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="picture-viewer-caption">
                  {picture.caption || <span style={{ opacity: 0.6, fontStyle: 'italic' }}>No caption</span>}
                </h3>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={() => setIsEditing(true)}
                  title="Edit caption"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            )}
            <span className="picture-viewer-date" style={{ marginTop: '2px' }}>
              <Calendar size={13} /> Added on {dateFormatted}
            </span>
          </div>

          <div className="picture-viewer-actions">
            <button
              className="icon-btn icon-btn--danger"
              onClick={handleDelete}
              title="Delete picture"
              aria-label="Delete picture"
            >
              <Trash2 size={16} />
            </button>
            <button
              className="icon-btn"
              onClick={onClose}
              title="Close viewer"
              aria-label="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="picture-viewer-body">
          <img
            src={picture.url}
            alt={picture.caption || 'Inspiration picture'}
            className="picture-viewer-img"
          />
        </div>
      </div>
    </div>
  )
}
