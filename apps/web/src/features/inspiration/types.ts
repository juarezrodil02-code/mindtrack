export interface InspirationPicture {
  id: string
  url: string
  caption?: string
  createdAt: string
  isFeatured?: boolean
}

export interface DailyQuote {
  id: string
  text: string
  author: string
  category?: string
  isCustom?: boolean
  createdAt?: string
}

