import { useVideoOptionsStore } from "@/lib/video-options-store"

export default function ZoomControls() {
  const zoomLevel = useVideoOptionsStore((state) => state.zoomLevel)
  const setZoomLevel = useVideoOptionsStore((state) => state.setZoomLevel)
  return (
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
  )
}
