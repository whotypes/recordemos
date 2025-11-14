import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"

export default function ZoomAspectPanel() {
  const zoomLevel = useVideoOptionsStore((state) => state.zoomLevel)
  const setZoomLevel = useVideoOptionsStore((state) => state.setZoomLevel)
  const aspectRatio = useVideoOptionsStore((state) => state.aspectRatio)
  const setAspectRatio = useVideoOptionsStore((state) => state.setAspectRatio)
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)

  const isDisabled = !videoSrc

  return (
    <div className={`w-full space-y-6 ${isDisabled ? 'pointer-events-none opacity-40' : ''}`}>
      <div className="w-full">
        <h3 className="mb-3 text-xs font-medium uppercase text-dark/70">Zoom & Pan</h3>
        <div className="flex justify-center gap-2 mb-3">
          <button
            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
            className="max-w-xs flex-1 px-3 py-2 bg-muted text-xs rounded hover:bg-muted/80 transition-colors text-foreground"
          >
            − Zoom
          </button>
          <button
            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
            className="max-w-xs flex-1 px-3 py-2 bg-muted text-xs rounded hover:bg-muted/80 transition-colors text-foreground"
          >
            + Zoom
          </button>
        </div>
        <div className="text-xs text-muted-foreground text-center font-medium">{zoomLevel}%</div>
      </div>

      <div className="w-full">
        <h3 className="mb-3 text-xs font-medium uppercase text-dark/70">Aspect Ratio</h3>
        <div className="flex flex-col items-center space-y-1.5">
          {["16:9", "9:16", "1:1", "4:3", "Custom"].map((ratio) => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={`w-full max-w-xs px-3 py-2 rounded text-xs transition-all ${
                aspectRatio === ratio
                  ? "bg-accent text-accent-foreground font-medium"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
