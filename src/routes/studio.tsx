import EditingPanel from "@/components/editing-panel"
import ExportModule from "@/components/export-module"
import PremiumUpsellModal from "@/components/premium-upsell-modal"
import PreviewCanvas from "@/components/preview-canvas"
import TimelineEditor from "@/components/timeline-editor"
import StudioNavbar from "@/components/ui/studio-navbar"
import { useVideoPlayer } from "@/lib/hooks/use-video-player"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { useAuth } from "@clerk/tanstack-react-start"
import { convexQuery } from "@convex-dev/react-query"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api } from "convex/_generated/api"
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
        scrubToTime
    } = useVideoPlayerStore()

    const { videoRef } = useVideoPlayer(videoSrc)

    const aspectRatio = useVideoOptionsStore((state) => state.aspectRatio)
    const hideToolbars = useVideoOptionsStore((state) => state.hideToolbars)

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
            <StudioNavbar activeProjectId={projectId} />

            <div className="flex flex-1 overflow-hidden gap-0">
                <div className="flex-1 max-w-96 min-w-xs border-r border-border bg-card sidebar-scrollbar">
                    <EditingPanel onExport={() => setShowExport(true)} />
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto bg-background flex items-center justify-center p-6">
                        <PreviewCanvas
                            hideToolbars={hideToolbars}
                            currentTime={currentTime}
                            videoRef={videoRef}
                            videoSrc={videoSrc}
                        />
                    </div>

                    <div className="border-t border-border bg-card">
                        <TimelineEditor
                            currentTime={currentTime}
                            setCurrentTime={(time) => scrubToTime(time, videoRef)}
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

            <PremiumUpsellModal />
        </div>
    )
}
