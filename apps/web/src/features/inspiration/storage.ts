import type { InspirationPicture, DailyQuote } from './types'

const DB_NAME = 'mindtrack_inspiration_db'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'))
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('pictures')) {
        db.createObjectStore('pictures', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('custom_quotes')) {
        db.createObjectStore('custom_quotes', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Compress an image file using browser Canvas to save space and ensure high performance */
export function compressImage(file: File, maxDimension = 1400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          return resolve(e.target?.result as string)
        }

        ctx.drawImage(img, 0, 0, width, height)
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        resolve(canvas.toDataURL(format, quality))
      }
      img.onerror = () => resolve(e.target?.result as string)
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

// ─── Pictures (CRUD) ───────────────────────────────────────────────────────
export async function getPictures(): Promise<InspirationPicture[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pictures', 'readonly')
      const store = tx.objectStore('pictures')
      const req = store.getAll()
      req.onsuccess = () => {
        const items = (req.result || []) as InspirationPicture[]
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        resolve(items)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    try {
      const raw = localStorage.getItem('mindtrack_pictures')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
}

export async function addPicture(file: File, caption?: string): Promise<InspirationPicture> {
  const url = await compressImage(file)
  const picture: InspirationPicture = {
    id: `pic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    url,
    caption: caption?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }

  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('pictures', 'readwrite')
      const store = tx.objectStore('pictures')
      const req = store.put(picture)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch {
    try {
      const existing = await getPictures()
      existing.unshift(picture)
      localStorage.setItem('mindtrack_pictures', JSON.stringify(existing.slice(0, 50)))
    } catch {
      // Storage error
    }
  }

  return picture
}

export async function updatePictureCaption(id: string, caption: string): Promise<InspirationPicture | null> {
  const pictures = await getPictures()
  const pic = pictures.find(p => p.id === id)
  if (!pic) return null

  pic.caption = caption.trim() || undefined

  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('pictures', 'readwrite')
      const store = tx.objectStore('pictures')
      const req = store.put(pic)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch {
    try {
      localStorage.setItem('mindtrack_pictures', JSON.stringify(pictures))
    } catch {
      // Storage error
    }
  }

  return pic
}

export async function deletePicture(id: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('pictures', 'readwrite')
      const store = tx.objectStore('pictures')
      const req = store.delete(id)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch {
    try {
      const existing = await getPictures()
      const updated = existing.filter(p => p.id !== id)
      localStorage.setItem('mindtrack_pictures', JSON.stringify(updated))
    } catch {
      // Storage error
    }
  }
}

// ─── Custom Quotes (CRUD) ──────────────────────────────────────────────────
export async function getCustomQuotes(): Promise<DailyQuote[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('custom_quotes', 'readonly')
      const store = tx.objectStore('custom_quotes')
      const req = store.getAll()
      req.onsuccess = () => {
        const items = (req.result || []) as DailyQuote[]
        items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        resolve(items)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    try {
      const raw = localStorage.getItem('mindtrack_custom_quotes')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
}

export async function addCustomQuote(text: string, author?: string, category = 'Personal'): Promise<DailyQuote> {
  const quote: DailyQuote = {
    id: `quote_${Date.now()}`,
    text: text.trim(),
    author: author?.trim() || 'Anonymous',
    category,
    isCustom: true,
    createdAt: new Date().toISOString(),
  }

  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('custom_quotes', 'readwrite')
      const store = tx.objectStore('custom_quotes')
      const req = store.put(quote)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch {
    try {
      const existing = await getCustomQuotes()
      existing.unshift(quote)
      localStorage.setItem('mindtrack_custom_quotes', JSON.stringify(existing))
    } catch {
      // Storage error
    }
  }

  return quote
}

export async function updateCustomQuote(
  id: string,
  text: string,
  author?: string,
  category = 'Personal'
): Promise<DailyQuote | null> {
  const quotes = await getCustomQuotes()
  const quote = quotes.find(q => q.id === id)
  if (!quote) return null

  quote.text = text.trim()
  quote.author = author?.trim() || 'Anonymous'
  quote.category = category

  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('custom_quotes', 'readwrite')
      const store = tx.objectStore('custom_quotes')
      const req = store.put(quote)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch {
    try {
      localStorage.setItem('mindtrack_custom_quotes', JSON.stringify(quotes))
    } catch {
      // Storage error
    }
  }

  return quote
}

export async function deleteCustomQuote(id: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('custom_quotes', 'readwrite')
      const store = tx.objectStore('custom_quotes')
      const req = store.delete(id)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch {
    try {
      const existing = await getCustomQuotes()
      const updated = existing.filter(q => q.id !== id)
      localStorage.setItem('mindtrack_custom_quotes', JSON.stringify(updated))
    } catch {
      // Storage error
    }
  }
}

// ─── Avatar Photo ──────────────────────────────────────────────────────────
export async function getStoredAvatar(): Promise<string | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction('metadata', 'readonly')
      const store = tx.objectStore('metadata')
      const req = store.get('user_avatar')
      req.onsuccess = () => resolve(req.result?.value || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    try {
      return localStorage.getItem('mindtrack_user_avatar')
    } catch {
      return null
    }
  }
}

export async function saveStoredAvatar(file: File): Promise<string> {
  const url = await compressImage(file, 400, 0.9)
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readwrite')
      const store = tx.objectStore('metadata')
      const req = store.put({ key: 'user_avatar', value: url })
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch {
    // fallback
  }

  try {
    localStorage.setItem('mindtrack_user_avatar', url)
  } catch {
    // fallback
  }

  window.dispatchEvent(new CustomEvent('mindtrack:avatar-updated', { detail: url }))

  return url
}

export async function removeStoredAvatar(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readwrite')
      const store = tx.objectStore('metadata')
      const req = store.delete('user_avatar')
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch {
    // fallback
  }

  try {
    localStorage.removeItem('mindtrack_user_avatar')
  } catch {
    // fallback
  }

  window.dispatchEvent(new CustomEvent('mindtrack:avatar-updated', { detail: null }))
}
