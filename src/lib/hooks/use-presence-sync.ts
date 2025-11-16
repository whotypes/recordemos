import { useEffect, useRef } from "react"
import { useCollaborationStore } from "../collaboration-store"
import type { Id } from "../../../convex/_generated/dataModel"

interface UsePresenceSyncOptions {
  currentUserId: Id<"users"> | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  enabled?: boolean
}

export const usePresenceSync = ({
  currentUserId,
  videoRef,
  setCurrentTime,
  setIsPlaying,
  enabled = true,
}: UsePresenceSyncOptions) => {
  const presence = useCollaborationStore((state) => state.presence)
  const lastSyncTimeRef = useRef<number>(0)
  const isSyncingRef = useRef(false)

  useEffect(() => {
    if (!enabled || !currentUserId || !videoRef.current) return

    // find the first other user who is playing
    const playingUser = presence.find(
      (p) => p.userId !== currentUserId && p.isPlaying && p.currentTimeMs !== undefined
    )

    if (!playingUser) return

    const now = Date.now()
    const timeSinceLastSync = now - lastSyncTimeRef.current

    // only sync if it's been at least 5 seconds since last sync
    // this prevents constant syncing and allows users to scrub independently
    if (timeSinceLastSync < 5000 || isSyncingRef.current) return

    const currentVideoTime = videoRef.current.currentTime * 1000
    const timeDiff = Math.abs(currentVideoTime - playingUser.currentTimeMs)

    // only sync if the time difference is significant (more than 1 second)
    if (timeDiff > 1000) {
      isSyncingRef.current = true
      lastSyncTimeRef.current = now

      const targetTime = playingUser.currentTimeMs / 1000
      videoRef.current.currentTime = targetTime
      setCurrentTime(targetTime)

      if (playingUser.isPlaying) {
        setIsPlaying(true)
        videoRef.current.play().catch(console.error)
      }

      // reset syncing flag after a short delay
      setTimeout(() => {
        isSyncingRef.current = false
      }, 500)
    }
  }, [presence, currentUserId, videoRef, setCurrentTime, setIsPlaying, enabled])
}
