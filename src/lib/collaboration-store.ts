import { create } from 'zustand'
import type { Id } from '../../convex/_generated/dataModel'

export interface PresenceUser {
  _id: Id<"presence">
  userId: Id<"users">
  username: string
  userImage: string
  lastSeenAt: number
  currentBlockId?: Id<"timeline_blocks">
  cursorPosition?: { x: number; y: number }
  currentTimeMs?: number
  isPlaying?: boolean
}

export interface Notification {
  _id: Id<"notifications">
  toUserId: Id<"users">
  fromUserId: Id<"users">
  projectId: Id<"projects">
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
  fromUser: {
    _id: Id<"users">
    username: string
    email: string
    image: string
  } | null
  project: {
    _id: Id<"projects">
    name: string
  } | null
  isOnline: boolean
}

interface CollaborationState {
  presence: PresenceUser[]
  notifications: Notification[]
  pendingCount: number
  selectedNotificationId: string | null

  setPresence: (users: PresenceUser[]) => void
  setNotifications: (notifications: Notification[]) => void
  setPendingCount: (count: number) => void
  setSelectedNotification: (id: string | null) => void

  addNotification: (notification: Notification) => void
  removeNotification: (id: Id<"notifications">) => void
  updateNotificationStatus: (id: Id<"notifications">, status: 'accepted' | 'rejected') => void
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  presence: [],
  notifications: [],
  pendingCount: 0,
  selectedNotificationId: null,

  setPresence: (users) => set({ presence: users }),
  setNotifications: (notifications) => set({ notifications }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setSelectedNotification: (id) => set({ selectedNotificationId: id }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      pendingCount: notification.status === 'pending' ? state.pendingCount + 1 : state.pendingCount,
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n._id !== id),
      pendingCount: Math.max(0, state.pendingCount - 1),
    })),

  updateNotificationStatus: (id, status) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n._id === id ? { ...n, status } : n
      ),
      pendingCount: Math.max(0, state.pendingCount - 1),
    })),
}))
