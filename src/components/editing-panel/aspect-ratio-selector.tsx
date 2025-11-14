import { useVideoOptionsStore } from "@/lib/video-options-store"

export default function AspectRatioSelector() {
  const aspectRatio = useVideoOptionsStore((state) => state.aspectRatio)
  const setAspectRatio = useVideoOptionsStore((state) => state.setAspectRatio)
  return (
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
  )
}
