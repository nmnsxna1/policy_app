import api from './api'

export interface NotificationItem {
  id: number
  application_id: number | null
  message: string
  notification_type: string
  is_read: boolean
  created_at: string
}

export interface NotificationsResponse {
  notifications: NotificationItem[]
  unread_count: number
}

export async function fetchNotifications(): Promise<NotificationsResponse> {
  const res = await api.get('/notifications')
  return res.data
}

export async function markRead(id: number) {
  await api.post(`/notifications/${id}/read`)
}

export async function markAllRead() {
  await api.post('/notifications/read-all')
}
