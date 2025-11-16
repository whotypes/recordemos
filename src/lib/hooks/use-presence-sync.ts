import { useEffect, useRef } from "react"
import type { Id } from "../../../convex/_generated/dataModel"
import { useCollaborationStore } from "../collaboration-store"
import { usePlayheadStore } from "../playhead-store"

interface UsePresenceSyncOptions {
  currentUserId: Id<"users"> | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  enabled?: boolean
}

export const usePresenceSync = ({
  currentUserId,
  videoRef,
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

    if (!playingUser || playingUser.currentTimeMs === undefined) return

    const now = Date.now()
    const timeSinceLastSync = now - lastSyncTimeRef.current

    // only sync if it's been at least 5 seconds since last sync
    // this prevents constant syncing and allows users to scrub independently
    if (timeSinceLastSync < 5000 || isSyncingRef.current) return

    const currentTimelineTimeMs = usePlayheadStore.getState().playheadMs
    const targetTimelineMs = playingUser.currentTimeMs
    const timeDiff = Math.abs(currentTimelineTimeMs - targetTimelineMs)

    // only sync if the time difference is significant (more than 1 second)
    if (timeDiff > 1000) {
      isSyncingRef.current = true
      lastSyncTimeRef.current = now

      // Simply set playhead - video will follow automatically
      usePlayheadStore.getState().setPlayheadMs(targetTimelineMs, "presence")

      if (playingUser.isPlaying) {
        usePlayheadStore.getState().setIsPlaying(true)
        videoRef.current.play().catch(console.error)
      }

      // reset syncing flag after a short delay
      setTimeout(() => {
        isSyncingRef.current = false
      }, 500)
    }
  }, [presence, currentUserId, enabled])
}
