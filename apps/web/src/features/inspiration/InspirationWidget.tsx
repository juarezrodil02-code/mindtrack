import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, Quote, RefreshCw, Plus, Image as ImageIcon,
  Copy, Check, Maximize2, Trash2, Edit2, List, Upload,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { CURATED_QUOTES } from './quotesData'
import {
  getPictures, deletePicture, getCustomQuotes, deleteCustomQuote
} from './storage'
import type { InspirationPicture, DailyQuote } from './types'
import { UploadPictureModal } from './UploadPictureModal'
import { AddQuoteModal } from './AddQuoteModal'
import { EditQuoteModal } from './EditQuoteModal'
import { PictureViewerModal } from './PictureViewerModal'
import { QuotesManagerModal } from './QuotesManagerModal'

export function InspirationWidget() {
  const [pictures, setPictures] = useState<InspirationPicture[]>([])
  const [customQuotes, setCustomQuotes] = useState<DailyQuote[]>([])
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  // Carousel state
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselDir, setCarouselDir] = useState<'left' | 'right'>('right')

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [addQuoteModalOpen, setAddQuoteModalOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<DailyQuote | null>(null)
  const [quotesManagerOpen, setQuotesManagerOpen] = useState(false)
  const [viewingPicture, setViewingPicture] = useState<InspirationPicture | null>(null)

  useEffect(() => {
    async function loadData() {
      const [storedPics, storedQuotes] = await Promise.all([
        getPictures(),
        getCustomQuotes(),
      ])
      setPictures(storedPics)
      setCustomQuotes(storedQuotes)

      const totalQuotes = CURATED_QUOTES.length + storedQuotes.length
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
      )
      setQuoteIndex(dayOfYear % totalQuotes)
    }

    loadData()
  }, [])

  const allQuotes: DailyQuote[] = [...customQuotes, ...CURATED_QUOTES]
  const currentQuote = allQuotes[quoteIndex % allQuotes.length] || CURATED_QUOTES[0]

  function nextQuote() {
    setQuoteIndex((prev) => (prev + 1) % allQuotes.length)
  }

  async function handleCopyQuote() {
    if (!currentQuote) return
    const textToCopy = `"${currentQuote.text}" — ${currentQuote.author}`
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }

  async function handleDeleteQuote(quoteId: string) {
    if (window.confirm('Are you sure you want to delete this custom quote?')) {
      await deleteCustomQuote(quoteId)
      setCustomQuotes((prev) => prev.filter((q) => q.id !== quoteId))
      setQuoteIndex(0)
    }
  }

  async function handleDeletePic(id: string) {
    await deletePicture(id)
    setPictures((prev) => prev.filter((p) => p.id !== id))
    if (viewingPicture?.id === id) {
      setViewingPicture(null)
    }
  }

  function handleUpdatePic(updated: InspirationPicture) {
    setPictures((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    if (viewingPicture?.id === updated.id) {
      setViewingPicture(updated)
    }
  }

  function handleSelectQuote(quote: DailyQuote) {
    const idx = allQuotes.findIndex((q) => q.id === quote.id)
    if (idx !== -1) {
      setQuoteIndex(idx)
    }
  }

  const carouselPrev = useCallback(() => {
    setCarouselDir('left')
    setCarouselIndex((prev) => (prev - 1 + pictures.length) % pictures.length)
  }, [pictures.length])

  const carouselNext = useCallback(() => {
    setCarouselDir('right')
    setCarouselIndex((prev) => (prev + 1) % pictures.length)
  }, [pictures.length])

  // Reset carousel index when a picture is deleted
  function handleDeletePicAndReset(id: string) {
    handleDeletePic(id)
    setCarouselIndex((prev) => Math.max(0, prev - 1))
  }

  return (
    <section className="inspiration-section" aria-label="Daily Inspiration & Vision Board">
      {/* Outer Section Header */}
      <div className="inspiration-header">
        <div className="inspiration-title-wrap">
          <div className="inspiration-title-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="inspiration-title">Daily Inspiration & Vision Board</h2>
            <p className="inspiration-subtitle">Motivational quote & study moodboard for your goals</p>
          </div>
        </div>

        <div className="inspiration-actions">
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => setQuotesManagerOpen(true)}
            title="Browse and manage all quotes"
          >
            <List size={14} />
            <span>Manage Quotes</span>
          </button>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => setAddQuoteModalOpen(true)}
            title="Add your own custom quote"
          >
            <Plus size={14} />
            <span>Add Quote</span>
          </button>
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => setUploadModalOpen(true)}
            title="Upload a new study photo or vision picture"
          >
            <Upload size={14} />
            <span>Upload Picture</span>
          </button>
        </div>
      </div>

      {/* 2-Column Main Cards */}
      <div className="inspiration-grid">
        {/* Left Column: Daily Quote Card */}
        <div className="quote-card">
          <div className="quote-card-header">
            <div className="quote-badge">
              <Sparkles size={12} />
              <span>{currentQuote?.category || 'Daily Wisdom'}</span>
              {currentQuote?.isCustom && <span className="quote-badge--custom">Custom</span>}
            </div>

            <div className="quote-controls">
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={handleCopyQuote}
                title="Copy quote"
                aria-label="Copy quote text"
              >
                {copied ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
              </button>

              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={nextQuote}
                title="Next inspiring quote"
                aria-label="Next inspiring quote"
              >
                <RefreshCw size={14} />
              </button>

              {currentQuote?.isCustom && (
                <>
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    onClick={() => setEditingQuote(currentQuote)}
                    title="Edit this quote"
                    aria-label="Edit quote"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm icon-btn--danger"
                    onClick={() => handleDeleteQuote(currentQuote.id)}
                    title="Delete this custom quote"
                    aria-label="Delete custom quote"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="quote-body">
            <Quote size={26} className="quote-mark" />
            <blockquote className="quote-text">
              "{currentQuote?.text}"
            </blockquote>
            <p className="quote-author">— {currentQuote?.author || 'Unknown'}</p>
          </div>

          <div className="quote-footer">
            <span className="quote-counter">
              Quote {((quoteIndex % allQuotes.length) + 1)} of {allQuotes.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="quote-shuffle-link"
                onClick={() => setQuotesManagerOpen(true)}
              >
                View all ({allQuotes.length})
              </button>
              <button
                type="button"
                className="quote-shuffle-link"
                onClick={nextQuote}
              >
                Shuffle quote →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Vision Board & Uploaded Pictures */}
        <div className="vision-board-card">
          <div className="vision-board-header">
            <div className="vision-board-title">
              <ImageIcon size={16} style={{ color: 'var(--indigo-light)' }} />
              <span>Study Vision Board</span>
              <span className="vision-board-count">({pictures.length})</span>
            </div>
            <button
              type="button"
              className="vision-add-inline-btn"
              onClick={() => setUploadModalOpen(true)}
              title="Upload Picture"
            >
              <Plus size={14} /> Add Picture
            </button>
          </div>

          {pictures.length === 0 ? (
            <div
              className="vision-empty-state"
              onClick={() => setUploadModalOpen(true)}
              role="button"
              tabIndex={0}
              title="Click to upload your first study picture"
            >
              <div className="vision-empty-icon">
                <ImageIcon size={26} />
              </div>
              <p className="vision-empty-title">Your vision board is empty</p>
              <p className="vision-empty-text">
                Upload pictures of your dream university, study goals, or aesthetic setups to stay inspired!
              </p>
              <span className="btn btn--xs btn--primary" style={{ marginTop: '6px' }}>
                <Plus size={13} /> Upload First Picture
              </span>
            </div>
          ) : (
            <div className="vision-carousel">
              {/* Main slide */}
              <div
                className="vision-carousel-track"
                onClick={() => setViewingPicture(pictures[carouselIndex])}
                title="Click to view full picture"
              >
                <img
                  key={pictures[carouselIndex].id}
                  src={pictures[carouselIndex].url}
                  alt={pictures[carouselIndex].caption || 'Vision board picture'}
                  className={`vision-carousel-img vision-carousel-img--${carouselDir}`}
                />
                <div className="vision-carousel-overlay">
                  <span className="vision-carousel-zoom">
                    <Maximize2 size={16} />
                  </span>
                  {pictures[carouselIndex].caption && (
                    <p className="vision-carousel-caption">{pictures[carouselIndex].caption}</p>
                  )}
                </div>
                {/* Delete button */}
                <button
                  type="button"
                  className="vision-carousel-del"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('Delete this picture from your vision board?')) {
                      handleDeletePicAndReset(pictures[carouselIndex].id)
                    }
                  }}
                  title="Delete picture"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Arrows — only show if more than 1 */}
              {pictures.length > 1 && (
                <>
                  <button
                    type="button"
                    className="vision-carousel-arrow vision-carousel-arrow--prev"
                    onClick={(e) => { e.stopPropagation(); carouselPrev() }}
                    aria-label="Previous picture"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="vision-carousel-arrow vision-carousel-arrow--next"
                    onClick={(e) => { e.stopPropagation(); carouselNext() }}
                    aria-label="Next picture"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {pictures.length > 1 && (
                <div className="vision-carousel-dots">
                  {pictures.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`vision-carousel-dot ${i === carouselIndex ? 'vision-carousel-dot--active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setCarouselIndex(i) }}
                      aria-label={`Go to picture ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Slide counter + thumbnail strip */}
              <div className="vision-carousel-footer">
                <span className="vision-carousel-counter">{carouselIndex + 1} / {pictures.length}</span>
                <div className="vision-carousel-thumbs">
                  {pictures.map((pic, i) => (
                    <button
                      key={pic.id}
                      type="button"
                      className={`vision-thumb ${i === carouselIndex ? 'vision-thumb--active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setCarouselIndex(i) }}
                      title={pic.caption || `Photo ${i + 1}`}
                    >
                      <img src={pic.url} alt="" className="vision-thumb-img" />
                    </button>
                  ))}
                  <button
                    type="button"
                    className="vision-thumb vision-thumb--add"
                    onClick={(e) => { e.stopPropagation(); setUploadModalOpen(true) }}
                    title="Add another picture"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CRUD Modals */}
      {uploadModalOpen && (
        <UploadPictureModal
          onClose={() => setUploadModalOpen(false)}
          onSuccess={(newPic) => {
            setPictures((prev) => [newPic, ...prev])
          }}
        />
      )}

      {addQuoteModalOpen && (
        <AddQuoteModal
          onClose={() => setAddQuoteModalOpen(false)}
          onSuccess={(newQuote) => {
            setCustomQuotes((prev) => [newQuote, ...prev])
            setQuoteIndex(0)
          }}
        />
      )}

      {editingQuote && (
        <EditQuoteModal
          quote={editingQuote}
          onClose={() => setEditingQuote(null)}
          onSuccess={(updated) => {
            setCustomQuotes((prev) =>
              prev.map((q) => (q.id === updated.id ? updated : q))
            )
          }}
        />
      )}

      {quotesManagerOpen && (
        <QuotesManagerModal
          customQuotes={customQuotes}
          activeQuoteId={currentQuote?.id}
          onClose={() => setQuotesManagerOpen(false)}
          onSelectQuote={handleSelectQuote}
          onAddNew={() => setAddQuoteModalOpen(true)}
          onEdit={(q) => setEditingQuote(q)}
          onDelete={handleDeleteQuote}
        />
      )}

      {viewingPicture && (
        <PictureViewerModal
          picture={viewingPicture}
          onClose={() => setViewingPicture(null)}
          onDelete={handleDeletePicAndReset}
          onUpdate={handleUpdatePic}
        />
      )}
    </section>
  )
}
