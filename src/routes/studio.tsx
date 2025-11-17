import EditingPanel from "@/components/editing-panel/index"
import ExportModule from "@/components/export-module"
import PreviewCanvas from "@/components/preview-canvas"
import TimelineEditor from "@/components/timeline-editor"
import StudioNavbar from "@/components/ui/studio-navbar"
import { useCompositionStore } from "@/lib/composition-store"
import { DEFAULT_UNSPLASH_PHOTO_URLS } from "@/lib/constants"
import { usePresence } from "@/lib/hooks/use-presence"
import { usePresenceSync } from "@/lib/hooks/use-presence-sync"
import { useProjectRestore } from "@/lib/hooks/use-project-restore"
import { useProjectSettingsSync } from "@/lib/hooks/use-project-settings-sync"
import { useTimelineBlocks } from "@/lib/hooks/use-timeline-blocks"
import { useVideoPlayer } from "@/lib/hooks/use-video-player"
import { usePlayheadStore } from "@/lib/playhead-store"
import { useTimelineDurationStore } from "@/lib/timeline-duration-store"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
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
        videoDuration,
        setVideoDuration,
        videoSrc,
        setVideoSrc,
        videoFileName,
        currentClipAssetId,
    } = useVideoPlayerStore()

    const { playheadMs, isPlaying, setPlayheadMs, setIsPlaying } = usePlayheadStore()
    const { videoRef } = useVideoPlayer(videoSrc)
    const { computeActiveBlock } = useCompositionStore()
    const { getEffectiveDuration } = useTimelineDurationStore()

    // derive current time in seconds for display
    const currentTime = playheadMs / 1000

    // get the effective timeline duration (grows dynamically with blocks) - used for playback logic
    const timelineDuration = getEffectiveDuration()

    // use raw video duration for timeline canvas layout (fixed, doesn't grow)
    // this keeps the canvas stable when blocks are added/moved/trimmed
    const rawVideoDuration = videoDuration > 0 ? videoDuration : timelineDuration

    // Check if we have a video - either videoSrc is set, or we have metadata/asset ID
    const hasVideo = !!(videoSrc || videoFileName || currentClipAssetId)

    const handleVideoBlockDelete = () => {
        if (videoSrc && videoSrc.startsWith("blob:")) {
            URL.revokeObjectURL(videoSrc)
        }
        setVideoSrc(null)
        setPlayheadMs(0, "init")
        setVideoDuration(0)
    }

    // ensure composition compiler stays in sync even when not in edit mode,
    // so export and preview have timeline data immediately after upload
    useTimelineBlocks(
        projectId as Id<"projects"> | null,
        timelineDuration,
        currentTime,
        selectedBlock,
        setSelectedBlock,
        handleVideoBlockDelete
    )

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

    const aspectRatio = useVideoOptionsStore((state) => state.aspectRatio)
    const editorMode = useVideoOptionsStore((state) => state.editorMode)

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
            <StudioNavbar activeProjectId={projectId as Id<"projects"> | undefined} currentUserId={currentUser?._id} />

            <div className="flex flex-1 overflow-hidden gap-0">
                <div className="flex-1 max-w-96 min-w-xs border-r border-border bg-card sidebar-scrollbar">
                    <EditingPanel projectId={projectId} onExport={() => setShowExport(true)} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto bg-background flex items-center justify-center p-6 relative">
                        <PreviewCanvas
                            videoRef={videoRef}
                        />
                    </div>

                    <div className="border-t border-border bg-card">
                        {editorMode === 'edit' ? (
                            <TimelineEditor
                                projectId={projectId as Id<"projects"> | null}
                                currentTime={currentTime}
                                setCurrentTime={(time) => {
                                    const timeMs = time * 1000
                                    const compiler = useCompositionStore.getState().compiler

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
                                videoDuration={rawVideoDuration}
                                onVideoBlockDelete={handleVideoBlockDelete}
                            />
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-sm text-muted-foreground">
                                    {hasVideo
                                        ? "Switch to edit mode to start editing your video"
                                        : "Upload a video to get started"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showExport && <ExportModule aspectRatio={aspectRatio} onClose={() => setShowExport(false)} />}
        </div>
    )
}
