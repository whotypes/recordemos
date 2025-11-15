import EditingPanel from "@/components/editing-panel"
import ExportModule from "@/components/export-module"
import PremiumUpsellModal from "@/components/premium-upsell-modal"
import PreviewCanvas from "@/components/preview-canvas"
import TimelineEditor from "@/components/timeline-editor"
import AppHeader from "@/components/ui/app-header"
import { useScreenRecorder } from "@/lib/hooks/use-screen-recorder"
import { useVideoPlayer } from "@/lib/hooks/use-video-player"
import { useVideoUpload } from "@/lib/hooks/use-video-upload"
import { useSubscriptionStore } from "@/lib/subscription-store"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { useState } from "react"

export const Route = createFileRoute("/studio")({
    ssr: false,
    component: Studio,
})

function Studio() {
    const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
    const [showExport, setShowExport] = useState(false)

    const isPremium = useSubscriptionStore((state) => state.isPremium)

    // Video player state from Zustand
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

    // Custom hooks
    const { videoRef } = useVideoPlayer(videoSrc)
    const { startScreenRecord, isRecording } = useScreenRecorder()
    const { handleVideoUpload } = useVideoUpload()

    const backgroundColor = useVideoOptionsStore((state) => state.backgroundColor)
    const setBackgroundColor = useVideoOptionsStore((state) => state.setBackgroundColor)
    const aspectRatio = useVideoOptionsStore((state) => state.aspectRatio)
    const setAspectRatio = useVideoOptionsStore((state) => state.setAspectRatio)
    const hideToolbars = useVideoOptionsStore((state) => state.hideToolbars)
    const setHideToolbars = useVideoOptionsStore((state) => state.setHideToolbars)

    const handleVideoBlockDelete = () => {
        // Clean up blob URL to prevent memory leaks
        if (videoSrc && videoSrc.startsWith("blob:")) {
            URL.revokeObjectURL(videoSrc)
        }
        setVideoSrc(null)
        setCurrentTime(0)
        setVideoDuration(0)
    }

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
            <AppHeader
                videoSrc={videoSrc}
                onVideoUpload={handleVideoUpload}
                onStartRecording={startScreenRecord}
                isRecording={isRecording}
                onExport={() => setShowExport(true)}
            />

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden gap-0">
                {/* Left Sidebar - Compact */}
                <div className="flex-1 max-w-96 min-w-xs border-r border-border bg-card sidebar-scrollbar">
                    <EditingPanel />
                </div>

                {/* Center: Preview + Timeline */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Preview Canvas - Takes priority with padding */}
                    <div className="flex-1 overflow-auto bg-background flex items-center justify-center p-6">
                        <PreviewCanvas
                            hideToolbars={hideToolbars}
                            currentTime={currentTime}
                            videoRef={videoRef}
                            videoSrc={videoSrc}
                        />
                    </div>

                    {/* Timeline - Compact */}
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

            {/* Export Modal */}
            {showExport && <ExportModule aspectRatio={aspectRatio} onClose={() => setShowExport(false)} />}

            <PremiumUpsellModal />
        </div>
    )
}
