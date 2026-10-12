import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
  fetchUnreadCount, snoozeReminder, dismissReminder, syncDueNotifications,
} from '@/lib/api'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/AuthProvider'

export const notifKeys = {
  all: ['notifications'] as const,
  list: () => [...notifKeys.all, 'list'] as const,
  count: () => [...notifKeys.all, 'count'] as const,
}

export function useNotifications() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const synced = useRef(false)

  // Auto-sync due notifications once per session when user is available
  useEffect(() => {
    if (!user?.id || synced.current) return
    synced.current = true
    syncDueNotifications()
      .then(() => {
        qc.invalidateQueries({ queryKey: notifKeys.all })
      })
      .catch(console.warn)
  }, [user?.id, qc])

  return useQuery({
    queryKey: notifKeys.list(),
    queryFn: () => fetchNotifications(50),
    enabled: !!user?.id,
  })
}

export function useNotificationCount() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const query = useQuery({
    queryKey: notifKeys.count(),
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
    enabled: !!user?.id,
  })

  // Realtime subscription for instant badge updates
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: notifKeys.count() })
        qc.invalidateQueries({ queryKey: notifKeys.list() })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, qc])

  // Periodically re-sync due notifications so the badge stays up to date
  useEffect(() => {
    if (!user?.id) return
    const interval = setInterval(() => {
      syncDueNotifications()
        .then(() => {
          qc.invalidateQueries({ queryKey: notifKeys.all })
        })
        .catch(console.warn)
    }, 5 * 60_000) // every 5 minutes
    return () => clearInterval(interval)
  }, [user?.id, qc])

  return query
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all })
    },
  })
}

export function useSnoozeReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) => snoozeReminder(id, minutes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all })
    },
  })
}

export function useDismissReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dismissReminder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all })
    },
  })
}

export function useSyncNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: syncDueNotifications,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all })
    },
  })
}
