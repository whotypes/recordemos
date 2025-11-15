import { PRODUCT_IDS } from "@/lib/autumn/product-ids"
import { useCustomer } from "autumn-js/react"

interface AppHeaderProps {
  videoSrc: string | null
  onVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onStartRecording: () => void
  onStopRecording: () => void
  isRecording: boolean
  onExport: () => void
}

export default function AppHeader({
  videoSrc,
  onVideoUpload,
  onStartRecording,
  onStopRecording,
  isRecording,
  onExport,
}: AppHeaderProps) {
  const { customer } = useCustomer({ errorOnNotFound: false })
  const isPremium = customer?.products?.some((p) => p.id === PRODUCT_IDS.pro) ?? false

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-sm bg-accent flex items-center justify-center">
          <span className="text-xs font-bold text-accent-foreground">RD</span>
        </div>
        <h1 className="font-semibold text-sm text-foreground">RecordDemos</h1>
      </div>
      <div className="flex gap-3 items-center">
        {isPremium && (
          <a href="#billing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Billing
          </a>
        )}
        <div className="flex gap-2">
          {!videoSrc && !isRecording && (
            <>
              <label className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded transition-colors hover:bg-accent/90 cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  onChange={onVideoUpload}
                  className="hidden"
                />
                Upload Video
              </label>
              <button
                onClick={onStartRecording}
                className="px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded transition-colors hover:bg-destructive/90 cursor-pointer"
              >
                Record
              </button>
            </>
          )}
          {isRecording && (
            <button
              onClick={onStopRecording}
              className="px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded transition-colors hover:bg-destructive/90 flex items-center gap-2 cursor-pointer"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Stop Recording
            </button>
          )}
          {videoSrc && !isRecording && (
            <button
              onClick={onExport}
              className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded transition-colors hover:bg-accent/90 cursor-pointer"
            >
              Export
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
