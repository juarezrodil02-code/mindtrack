import { useState } from 'react'
import { X, Quote, Plus, Edit2, Trash2, CheckCircle2, Sparkles } from 'lucide-react'
import type { DailyQuote } from './types'
import { CURATED_QUOTES } from './quotesData'

interface Props {
  customQuotes: DailyQuote[]
  activeQuoteId: string
  onClose: () => void
  onSelectQuote: (quote: DailyQuote) => void
  onAddNew: () => void
  onEdit: (quote: DailyQuote) => void
  onDelete: (id: string) => void
}

export function QuotesManagerModal({
  customQuotes,
  activeQuoteId,
  onClose,
  onSelectQuote,
  onAddNew,
  onEdit,
  onDelete,
}: Props) {
  const [tab, setTab] = useState<'custom' | 'curated'>('custom')

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog quotes-manager-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="dialog-header">
          <h2 className="dialog-title">
            <Quote size={20} className="dialog-title-icon" />
            Manage Motivation Quotes
          </h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 10px' }}>
            <div className="status-tabs">
              <button
                type="button"
                className={`status-tab ${tab === 'custom' ? 'status-tab--active' : ''}`}
                onClick={() => setTab('custom')}
              >
                My Custom Quotes ({customQuotes.length})
              </button>
              <button
                type="button"
                className={`status-tab ${tab === 'curated' ? 'status-tab--active' : ''}`}
                onClick={() => setTab('curated')}
              >
                Curated Library ({CURATED_QUOTES.length})
              </button>
            </div>

            {tab === 'custom' && (
              <button
                type="button"
                className="btn btn--xs btn--primary"
                onClick={() => {
                  onClose()
                  onAddNew()
                }}
              >
                <Plus size={13} /> Add Quote
              </button>
            )}
          </div>
        </div>

        <div className="quotes-list-wrap" style={{ maxHeight: '420px', overflowY: 'auto', padding: '0 24px 20px' }}>
          {tab === 'custom' && customQuotes.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 16px' }}>
              <Quote size={32} className="empty-icon" />
              <p className="empty-title">No custom quotes yet</p>
              <p className="empty-text">Add your favorite study mottos, affirmations, or reminders.</p>
              <button
                type="button"
                className="btn btn--sm btn--primary"
                style={{ marginTop: '8px' }}
                onClick={() => {
                  onClose()
                  onAddNew()
                }}
              >
                <Plus size={14} /> Add Your First Quote
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(tab === 'custom' ? customQuotes : CURATED_QUOTES).map((q) => {
                const isActive = q.id === activeQuoteId
                return (
                  <div
                    key={q.id}
                    className={`quote-manager-item ${isActive ? 'quote-manager-item--active' : ''}`}
                    onClick={() => {
                      onSelectQuote(q)
                      onClose()
                    }}
                    title="Click to set as current daily quote"
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 500, color: 'var(--text)' }}>
                        "{q.text}"
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--indigo-light)', fontWeight: 600 }}>
                          — {q.author}
                        </span>
                        {q.category && (
                          <span className="inspiration-tag" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                            {q.category}
                          </span>
                        )}
                        {isActive && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--emerald)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                            <CheckCircle2 size={12} /> Active Today
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      {q.isCustom && (
                        <>
                          <button
                            type="button"
                            className="icon-btn icon-btn--sm"
                            onClick={() => {
                              onClose()
                              onEdit(q)
                            }}
                            title="Edit quote"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--sm icon-btn--danger"
                            onClick={() => {
                              if (window.confirm('Delete this quote?')) {
                                onDelete(q.id)
                              }
                            }}
                            title="Delete quote"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

