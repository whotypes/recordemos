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
import { usePlayheadStore } from "@/lib/playhead-store"
import type { CompiledBlock } from "@/lib/timeline-compiler"
import { useAuth } from "@clerk/tanstack-react-start"
import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { useEffect, useState, useRef } from "react"

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
        videoDuration,
        setVideoDuration,
        videoSrc,
        setVideoSrc,
        loop: shouldLoop
    } = useVideoPlayerStore()

    const { playheadMs, isPlaying, setPlayheadMs, setIsPlaying } = usePlayheadStore()
    const { videoRef } = useVideoPlayer(videoSrc)
    const { computeActiveBlock, compiler } = useCompositionStore()

    // derive current time in seconds for display
    const currentTime = playheadMs / 1000

    // calculate compiled timeline duration (respects trimming)
    const compiledDuration = compiler ? compiler.getTotalDuration() / 1000 : videoDuration

    // broadcast presence to other users
    usePresence({
        projectId: projectId as Id<"projects"> | null,
        userId: currentUser?._id || null,
        username: currentUser?.username || "",
        userImage: currentUser?.image || "",
        currentTimeMs: playheadMs,
        isPlaying,
        enabled: !!projectId && !!currentUser,
    })

    // sync playback with other users
    usePresenceSync({
        currentUserId: currentUser?._id || null,
        videoRef,
        enabled: !!currentUser,
    })

    // Update composition store when playhead changes
    useEffect(() => {
        computeActiveBlock(playheadMs)
    }, [playheadMs, computeActiveBlock])

    // Timeline-driven playback loop (RAF-based master clock)
    // Respects visible window: effectiveTime = visibleStart + localOffset
    useEffect(() => {
        if (!isPlaying) return

        let last = performance.now()
        let rafId: number
        let lastUpdateTime = 0
        const UPDATE_INTERVAL = 16.67 // ~60fps, only update stores at this rate

        // Track playback start time and block for localOffset calculation
        let playbackStartTime = usePlayheadStore.getState().playheadMs
        let playbackStartBlock: CompiledBlock | null = null

        const tick = (t: number) => {
            const dt = t - last
            last = t

            const compiler = useCompositionStore.getState().compiler
            const curr = usePlayheadStore.getState().playheadMs

            // Get active block at current time
            const activeBlock = compiler?.getActiveVideoBlock(curr)

            // If we entered a new block, reset playback start
            if (activeBlock && (!playbackStartBlock || playbackStartBlock.block._id !== activeBlock.block._id)) {
                playbackStartTime = activeBlock.visibleStart
                playbackStartBlock = activeBlock
                console.log(`[PLAYBACK] Entered block ${activeBlock.block._id}, visibleStart=${(activeBlock.visibleStart/1000).toFixed(2)}s`)
            }

            // Calculate next timeline time
            let next = curr + dt

            if (activeBlock) {
                // Playback within visible window: effectiveTime = visibleStart + localOffset
                const localOffset = next - playbackStartTime
                const effectiveTime = activeBlock.visibleStart + localOffset

                // Check if we've exceeded visible window
                if (effectiveTime >= activeBlock.visibleEnd) {
                    if (shouldLoop) {
                        // Loop back to visible start
                        next = activeBlock.visibleStart
                        playbackStartTime = activeBlock.visibleStart
                        console.log(`[PLAYBACK] Looped to visibleStart=${(activeBlock.visibleStart/1000).toFixed(2)}s`)
                    } else {
                        // Stop at visible end
                        next = activeBlock.visibleEnd
                        setIsPlaying(false)
                        console.log(`[PLAYBACK] Reached visibleEnd=${(activeBlock.visibleEnd/1000).toFixed(2)}s, stopped`)
                        return
                    }
                } else {
                    next = effectiveTime
                }
            } else {
                // No active block - use compiled timeline boundaries
                const timelineEnd = (compiler?.getTotalDuration() ?? videoDuration * 1000)
                const timelineStart = 0

            if (next >= timelineEnd) {
                if (shouldLoop) {
                        next = timelineStart
                        playbackStartTime = timelineStart
                } else {
                    setIsPlaying(false)
                    return
                    }
                }
            }

            // Check if playhead is entering a trim block and skip it
            if (compiler) {
                const trimBlock = compiler.getTrimBlockAt(next)
                if (trimBlock) {
                    // Skip to the end of the trim block
                    const trimEndMs = trimBlock.startMs + trimBlock.durationMs
                    next = trimEndMs
                    console.log(`[PLAYBACK] Skipped trim block from ${(trimBlock.startMs/1000).toFixed(2)}s to ${(trimEndMs/1000).toFixed(2)}s`)
                }
            }

            // Throttle store updates to reduce re-renders (only update at ~60fps max)
            const timeSinceLastUpdate = t - lastUpdateTime
            if (timeSinceLastUpdate >= UPDATE_INTERVAL) {
                setPlayheadMs(next, "playback")
                lastUpdateTime = t
            }

            rafId = requestAnimationFrame(tick)
        }

        // Initialize playback start
        const compiler = useCompositionStore.getState().compiler
        const initialBlock = compiler?.getActiveVideoBlock(usePlayheadStore.getState().playheadMs)
        if (initialBlock) {
            playbackStartTime = initialBlock.visibleStart
            playbackStartBlock = initialBlock
        } else {
            playbackStartTime = usePlayheadStore.getState().playheadMs
        }

        rafId = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(rafId)
        }
    }, [isPlaying, videoDuration, shouldLoop, setPlayheadMs, setIsPlaying, compiler])

    const aspectRatio = useVideoOptionsStore((state) => state.aspectRatio)

    const handleVideoBlockDelete = () => {
        if (videoSrc && videoSrc.startsWith("blob:")) {
            URL.revokeObjectURL(videoSrc)
        }
        setVideoSrc(null)
        setPlayheadMs(0, "init")
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

                                // Check if this time is within an active block's visible window
                                const compiler = useCompositionStore.getState().compiler
                                const activeBlock = compiler?.getActiveVideoBlock(timeMs)

                                // If scrubbing outside visible window, snap to nearest visible boundary
                                if (!activeBlock && compiler) {
                                    const allBlocks = compiler.getBlocks()

                                    if (allBlocks && allBlocks.length > 0) {
                                        const videoBlocks = allBlocks.filter(b => b.blockType === 'video')
                                        if (videoBlocks.length > 0) {
                                            // Find block with nearest visible window
                                            let nearestBlock = null
                                            let nearestDistance = Infinity

                                            for (const block of videoBlocks) {
                                                const visibleStart = block.startMs + (block.trimStartMs || 0)
                                                const visibleEnd = block.startMs + block.durationMs - (block.trimEndMs || 0)

                                                if (timeMs >= visibleStart && timeMs < visibleEnd) {
                                                    nearestBlock = block
                                                    break
                                                }

                                                const distToStart = Math.abs(timeMs - visibleStart)
                                                const distToEnd = Math.abs(timeMs - visibleEnd)
                                                const minDist = Math.min(distToStart, distToEnd)

                                                if (minDist < nearestDistance) {
                                                    nearestDistance = minDist
                                                    nearestBlock = block
                                                }
                                            }

                                            if (nearestBlock) {
                                                const visibleStart = nearestBlock.startMs + (nearestBlock.trimStartMs || 0)
                                                const visibleEnd = nearestBlock.startMs + nearestBlock.durationMs - (nearestBlock.trimEndMs || 0)

                                                // Snap to nearest visible boundary
                                                const distToStart = Math.abs(timeMs - visibleStart)
                                                const distToEnd = Math.abs(timeMs - visibleEnd)
                                                const snappedTimeMs = distToStart < distToEnd ? visibleStart : visibleEnd

                                                console.log(`[SCRUB] Snapped to visible window: ${(snappedTimeMs/1000).toFixed(2)}s (visibleStart=${(visibleStart/1000).toFixed(2)}s, visibleEnd=${(visibleEnd/1000).toFixed(2)}s)`)
                                                setPlayheadMs(snappedTimeMs, "scrub")
                                            return
                                        }
                                        }
                                    }
                                }

                                // Check if scrubbing into a trim block and skip it
                                let finalTimeMs = timeMs
                                if (compiler) {
                                    const trimBlock = compiler.getTrimBlockAt(timeMs)
                                    if (trimBlock) {
                                        // Skip to the end of the trim block
                                        finalTimeMs = trimBlock.startMs + trimBlock.durationMs
                                        console.log(`[SCRUB] Skipped trim block from ${(trimBlock.startMs/1000).toFixed(2)}s to ${(finalTimeMs/1000).toFixed(2)}s`)
                                    }
                                }

                                // Normal scrubbing - just set playhead, video will follow
                                console.log(`[SCRUB] Set playhead to ${(finalTimeMs/1000).toFixed(2)}s`)
                                setPlayheadMs(finalTimeMs, "scrub")
                            }}
                            isPlaying={isPlaying}
                            setIsPlaying={setIsPlaying}
                            selectedBlock={selectedBlock}
                            setSelectedBlock={setSelectedBlock}
                            videoDuration={compiledDuration}
                            onVideoBlockDelete={handleVideoBlockDelete}
                        />
                    </div>
                </div>
            </div>

            {showExport && <ExportModule aspectRatio={aspectRatio} onClose={() => setShowExport(false)} />}
        </div>
    )
}
