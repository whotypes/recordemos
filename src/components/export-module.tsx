"use client"

import { Download, HardDrive, Loader2, X } from "lucide-react"
import { useState } from "react"
import Modal from "@/components/ui/modal"
import { QUALITY_OPTIONS, type QualityOption } from "@/lib/types/video"
import { useVideoExportComposed as useVideoExport } from "@/lib/hooks/use-video-export-composed"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { Progress } from "@/components/ui/progress"

interface ExportModuleProps {
  aspectRatio: string
  onClose: () => void
}

export default function ExportModule({ aspectRatio, onClose }: ExportModuleProps) {
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>("1080")
  const { exportVideo, cancelExport, isExporting, exportProgress } = useVideoExport()
  const { videoSrc, videoFileName, videoFileFormat } = useVideoPlayerStore()

  const handleExport = async () => {
    if (!videoSrc) {
      return
    }

    await exportVideo({
      quality: selectedQuality,
      aspectRatio,
      videoSrc,
      fileName: videoFileName ? videoFileName.replace(/\.[^/.]+$/, `-${selectedQuality}p.mp4`) : undefined,
      videoFormat: videoFileFormat || undefined,
    })
  }

  const handleClose = () => {
    if (isExporting) {
      cancelExport()
    }
    onClose()
  }

  const footer = isExporting ? null : (
    <div className="flex gap-2">
      <button
        onClick={handleClose}
        className="flex-1 px-3 py-2 rounded border border-border/50 text-foreground hover:bg-accent transition-colors text-xs font-medium"
      >
        Cancel
      </button>
      <button
        onClick={handleExport}
        disabled={!videoSrc || isExporting}
        className="flex-1 px-3 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/90 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={14} />
        Export
      </button>
    </div>
  )

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title={isExporting ? "Exporting Video" : "Export Video"}
      footer={footer}
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        {isExporting ? (
          <div className="space-y-4 py-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground capitalize">{exportProgress.stage}</span>
                <span className="text-foreground font-medium">{exportProgress.progress}%</span>
              </div>
              <Progress value={exportProgress.progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{exportProgress.message}</p>
            </div>

            {exportProgress.stage !== "complete" && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={cancelExport}
                  className="px-3 py-1.5 rounded text-xs border border-border/50 text-foreground hover:bg-accent transition-colors flex items-center gap-1.5"
                >
                  <X size={12} />
                  Cancel Export
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Local Rendering */}
            <div className="bg-muted border border-accent/20 rounded p-3 flex gap-2">
              <HardDrive className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">100% Local Rendering</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your video never leaves your browser.</p>
              </div>
            </div>

            {/* Quality Selection */}
            <div>
              <label className="text-xs font-medium text-foreground mb-2 block">Quality</label>
              <div className="space-y-2">
                {QUALITY_OPTIONS.map((option) => (
                  <button
                    key={option.quality}
                    onClick={() => setSelectedQuality(option.quality)}
                    className={`w-full px-3 py-2 rounded border transition-all text-left flex justify-between items-center text-xs ${
                      selectedQuality === option.quality
                        ? "border-accent bg-accent/5"
                        : "border-border/30 hover:border-border/50"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-foreground">{option.label}</div>
                      <div className="text-muted-foreground">{option.size}</div>
                    </div>
                    <div
                      className={`w-3 h-3 rounded border flex items-center justify-center ${
                        selectedQuality === option.quality ? "border-accent bg-accent" : "border-border/30"
                      }`}
                    >
                      {selectedQuality === option.quality && (
                        <div className="w-1.5 h-1.5 bg-background rounded-full" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Aspect Ratio</label>
              <div className="px-3 py-2 bg-muted rounded text-xs text-muted-foreground border border-border/30">
                {aspectRatio}
              </div>
            </div>

            {/* Export Info */}
            <div className="bg-muted/50 border border-border/30 rounded p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Note:</span> The first export will download FFmpeg (~31MB).
                This is a one-time download and will be cached for future exports. Processing time depends on your video length and selected quality.
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
