import { useState } from 'react'
import { X, Quote, Sparkles } from 'lucide-react'
import { addCustomQuote } from './storage'
import type { DailyQuote } from './types'

interface Props {
  onClose: () => void
  onSuccess: (quote: DailyQuote) => void
}

export function AddQuoteModal({ onClose, onSuccess }: Props) {
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState('Personal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) {
      setError('Please enter a quote text.')
      return
    }

    try {
      setIsSubmitting(true)
      const newQuote = await addCustomQuote(text, author, category)
      onSuccess(newQuote)
      onClose()
    } catch {
      setError('Failed to save quote. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog vision-quote-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">
            <Quote size={20} className="dialog-title-icon" />
            Add Custom Daily Quote
          </h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          {error && <div className="form-server-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="quote-text" className="form-label">
              Quote / Motto <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              id="quote-text"
              className="form-textarea"
              placeholder="e.g. Every day is a new chance to learn and grow."
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quote-author" className="form-label">
                Author / Source
              </label>
              <input
                id="quote-author"
                type="text"
                className="form-input"
                placeholder="e.g. Yourself, Favorite Professor, Mentor"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="quote-category" className="form-label">
                Category
              </label>
              <select
                id="quote-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Personal">Personal Motto</option>
                <option value="Focus">Focus & Flow</option>
                <option value="Discipline">Discipline</option>
                <option value="Learning">Learning & Knowledge</option>
                <option value="Mindset">Mindset & Growth</option>
              </select>
            </div>
          </div>

          <div className="dialog-footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!text.trim() || isSubmitting}
            >
              <Sparkles size={16} />
              {isSubmitting ? 'Saving...' : 'Add Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

