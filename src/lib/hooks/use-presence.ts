import { useEffect, useRef } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

interface UsePresenceOptions {
  projectId: Id<"projects"> | null
  userId: Id<"users"> | null
  username: string
  userImage: string
  currentTimeMs: number
  isPlaying: boolean
  enabled?: boolean
}

export const usePresence = ({
  projectId,
  userId,
  username,
  userImage,
  currentTimeMs,
  isPlaying,
  enabled = true,
}: UsePresenceOptions) => {
  const updatePresence = useMutation(api.presence.updatePresence)
  const removePresence = useMutation(api.presence.removePresence)
  const lastUpdateRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled || !projectId || !userId) return

    // update presence immediately on mount
    updatePresence({
      projectId,
      userId,
      username,
      userImage,
      currentTimeMs,
      isPlaying,
    }).catch(console.error)

    // update presence every 2 seconds
    intervalRef.current = setInterval(() => {
      updatePresence({
        projectId,
        userId,
        username,
        userImage,
        currentTimeMs,
        isPlaying,
      }).catch(console.error)
    }, 2000)

    // cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (projectId && userId) {
        removePresence({ projectId, userId }).catch(console.error)
      }
    }
  }, [projectId, userId, username, userImage, enabled])

  // update presence when playback state changes
  useEffect(() => {
    if (!enabled || !projectId || !userId) return

    const now = Date.now()
    // throttle updates to every 100ms during playback
    if (now - lastUpdateRef.current < 100) return

    lastUpdateRef.current = now
    updatePresence({
      projectId,
      userId,
      username,
      userImage,
      currentTimeMs,
      isPlaying,
    }).catch(console.error)
  }, [currentTimeMs, isPlaying, projectId, userId, username, userImage, enabled])
}

