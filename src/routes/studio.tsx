import EditingPanel from "@/components/editing-panel/index"
import ExportModule from "@/components/export-module"
import PreviewCanvas from "@/components/preview-canvas"
import TimelineEditor from "@/components/timeline-editor"
import StudioNavbar from "@/components/ui/studio-navbar"
import { DEFAULT_UNSPLASH_PHOTO_URLS } from "@/lib/constants"
import { useProjectRestore } from "@/lib/hooks/use-project-restore"
import { useProjectSettingsSync } from "@/lib/hooks/use-project-settings-sync"
import { useVideoPlayer } from "@/lib/hooks/use-video-player"
import { usePresence } from "@/lib/hooks/use-presence"
import { usePresenceSync } from "@/lib/hooks/use-presence-sync"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { useCompositionStore } from "@/lib/composition-store"
import { useAuth } from "@clerk/tanstack-react-start"
import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { useEffect, useState } from "react"

export const Route = createFileRoute("/studio")({
    ssr: false,
    validateSearch: (search: Record<string, unknown>) => {
        return {
            projectId: (search.projectId as string) || undefined,
        }
    },
    loader: async (opts) => {
        // Only prefetch if user is authenticated
        const userId = opts.context.userId;
        if (userId) {
            await opts.context.queryClient.ensureQueryData(
                convexQuery(api.projects.listForCurrentUser, {}),
            );
        }

        // Prefetch the default wallpaper image for dark mode
        // this ensures the image is cached and ready to display
        if (typeof window !== 'undefined') {
            const isDark = document.documentElement.classList.contains('dark')
            if (isDark) {
                // preload the image in the background
                const img = new Image()
                img.src = DEFAULT_UNSPLASH_PHOTO_URLS.regular
            }
        }
    },
    component: Studio,
})

function Studio() {
    const { projectId } = Route.useSearch()
    const navigate = useNavigate()
    const { isLoaded: isAuthLoaded, isSignedIn } = useAuth()
    const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
    const [showExport, setShowExport] = useState(false)

    const { data: convexProjects } = useQuery({
        ...convexQuery(api.projects.listForCurrentUser, {}),
        enabled: isAuthLoaded && isSignedIn,
    });

    const { data: currentUser } = useQuery({
        ...convexQuery(api.users.current, {}),
        enabled: isAuthLoaded && isSignedIn,
    })

    // restore project state from database and R2
    useProjectRestore(projectId as Id<"projects"> | null)

    // sync local settings changes to database
    useProjectSettingsSync(projectId as Id<"projects"> | null)

    useEffect(() => {
        if (!isAuthLoaded || !isSignedIn || !convexProjects) {
            return
        }

        const projects = Array.isArray(convexProjects) ? convexProjects : []

        if (!projectId && projects.length > 0) {
            navigate({
                to: "/studio",
                search: { projectId: projects[0]._id },
                replace: true,
            })
        }
    }, [projectId, convexProjects, navigate, isAuthLoaded, isSignedIn])

    const {
        currentTime,
        setCurrentTime,
        isPlaying,
        setIsPlaying,
        videoDuration,
        setVideoDuration,
        videoSrc,
        setVideoSrc,
        scrubToTime,
        loop: shouldLoop
    } = useVideoPlayerStore()

    const { videoRef } = useVideoPlayer(videoSrc)
    const { setCurrentTime: setCompositionTime } = useCompositionStore()

    // broadcast presence to other users
    usePresence({
        projectId: projectId as Id<"projects"> | null,
        userId: currentUser?._id || null,
        username: currentUser?.username || "",
        userImage: currentUser?.image || "",
        currentTimeMs: currentTime * 1000,
        isPlaying,
        enabled: !!projectId && !!currentUser,
    })

    // sync playback with other users
    usePresenceSync({
        currentUserId: currentUser?._id || null,
        videoRef,
        setCurrentTime,
        setIsPlaying,
        enabled: !!currentUser,
    })

    // Update composition store when scrubbing
    useEffect(() => {
        // Sync timeline time to composition time in ms
        setCompositionTime(currentTime * 1000)
    }, [currentTime, setCompositionTime])

    // Timeline-driven playback loop (RAF-based master clock)
    useEffect(() => {
        if (!isPlaying) return

        let last = performance.now()
        let rafId: number
        let lastUpdateTime = 0
        const UPDATE_INTERVAL = 16.67 // ~60fps, only update stores at this rate

        const tick = (t: number) => {
            const dt = t - last
            last = t

            const curr = useCompositionStore.getState().currentTimeMs
            const next = curr + dt

            // Get the active video block to determine boundaries
            const compiler = useCompositionStore.getState().compiler
            const activeBlock = compiler?.getActiveVideoBlock(curr)

            // Calculate timeline boundaries based on active block
            let timelineEnd = videoDuration * 1000
            let timelineStart = 0

            if (activeBlock) {
                // Use block boundaries for looping
                timelineStart = activeBlock.block.startMs
                timelineEnd = activeBlock.block.startMs + activeBlock.block.durationMs
            }

            // Handle timeline boundaries
            let finalTime = next
            if (next >= timelineEnd) {
                if (shouldLoop) {
                    finalTime = timelineStart
                } else {
                    // Stop at the end
                    setIsPlaying(false)
                    return
                }
            }

            // Throttle store updates to reduce re-renders (only update at ~60fps max)
            const timeSinceLastUpdate = t - lastUpdateTime
            if (timeSinceLastUpdate >= UPDATE_INTERVAL) {
                useCompositionStore.getState().setCurrentTime(finalTime)
                setCurrentTime(finalTime / 1000)
                lastUpdateTime = t
            }

            rafId = requestAnimationFrame(tick)
        }

        rafId = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(rafId)
        }
    }, [isPlaying, videoDuration, shouldLoop, setCurrentTime, setIsPlaying])

    const aspectRatio = useVideoOptionsStore((state) => state.aspectRatio)

    const handleVideoBlockDelete = () => {
        if (videoSrc && videoSrc.startsWith("blob:")) {
            URL.revokeObjectURL(videoSrc)
        }
        setVideoSrc(null)
        setCurrentTime(0)
        setVideoDuration(0)
    }

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
            <StudioNavbar activeProjectId={projectId} currentUserId={currentUser?._id} />

            <div className="flex flex-1 overflow-hidden gap-0">
                <div className="flex-1 max-w-96 min-w-xs border-r border-border bg-card sidebar-scrollbar">
                    <EditingPanel projectId={projectId} onExport={() => setShowExport(true)} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto bg-background flex items-center justify-center p-6 relative">
                        <PreviewCanvas
                            videoRef={videoRef}
                            videoSrc={videoSrc}
                        />
                    </div>

                    <div className="border-t border-border bg-card">
                        <TimelineEditor
                            projectId={projectId as Id<"projects"> | null}
                            currentTime={currentTime}
                            setCurrentTime={(time) => {
                                const timeMs = time * 1000

                                // Check if this time is within an active block
                                const compiler = useCompositionStore.getState().compiler
                                const activeBlock = compiler?.getActiveVideoBlock(timeMs)

                                // If scrubbing to a trimmed area (no active block), snap to nearest block start
                                if (!activeBlock && compiler) {
                                    const allBlocks = compiler.getBlocks()

                                    if (allBlocks && allBlocks.length > 0) {
                                        // Find the nearest block start
                                        const videoBlocks = allBlocks.filter(b => b.blockType === 'video')
                                        if (videoBlocks.length > 0) {
                                            // Find closest block start
                                            const closest = videoBlocks.reduce((prev, curr) => {
                                                const prevDiff = Math.abs(prev.startMs - timeMs)
                                                const currDiff = Math.abs(curr.startMs - timeMs)
                                                return currDiff < prevDiff ? curr : prev
                                            })

                                            const snappedTime = closest.startMs / 1000
                                            scrubToTime(snappedTime, videoRef)
                                            setCompositionTime(closest.startMs)
                                            return
                                        }
                                    }
                                }

                                // Normal scrubbing within a block
                                scrubToTime(time, videoRef)
                                setCompositionTime(timeMs)
                            }}
                            isPlaying={isPlaying}
                            setIsPlaying={setIsPlaying}
                            selectedBlock={selectedBlock}
                            setSelectedBlock={setSelectedBlock}
                            videoDuration={videoDuration}
                            onVideoBlockDelete={handleVideoBlockDelete}
                        />
                    </div>
                </div>
            </div>

            {showExport && <ExportModule aspectRatio={aspectRatio} onClose={() => setShowExport(false)} />}
        </div>
    )
}
