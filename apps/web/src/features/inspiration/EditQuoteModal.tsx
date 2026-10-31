import { useState, useEffect } from 'react'
import { X, Quote, Save } from 'lucide-react'
import { updateCustomQuote } from './storage'
import type { DailyQuote } from './types'

interface Props {
  quote: DailyQuote
  onClose: () => void
  onSuccess: (updated: DailyQuote) => void
}

export function EditQuoteModal({ quote, onClose, onSuccess }: Props) {
  const [text, setText] = useState(quote.text)
  const [author, setAuthor] = useState(quote.author)
  const [category, setCategory] = useState(quote.category || 'Personal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText(quote.text)
    setAuthor(quote.author)
    setCategory(quote.category || 'Personal')
  }, [quote])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) {
      setError('Please enter a quote text.')
      return
    }

    try {
      setIsSubmitting(true)
      const updated = await updateCustomQuote(quote.id, text, author, category)
      if (updated) {
        onSuccess(updated)
        onClose()
      } else {
        setError('Quote not found or could not be updated.')
      }
    } catch {
      setError('Failed to update quote. Please try again.')
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
            Edit Quote
          </h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          {error && <div className="form-server-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="edit-quote-text" className="form-label">
              Quote / Motto <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              id="edit-quote-text"
              className="form-textarea"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-quote-author" className="form-label">
                Author / Source
              </label>
              <input
                id="edit-quote-author"
                type="text"
                className="form-input"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-quote-category" className="form-label">
                Category
              </label>
              <select
                id="edit-quote-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Personal">Personal Motto</option>
                <option value="Focus">Focus & Flow</option>
                <option value="Discipline">Discipline</option>
                <option value="Learning">Learning & Knowledge</option>
                <option value="Mindset">Mindset & Growth</option>
                <option value="Productivity">Productivity</option>
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
              <Save size={16} />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

