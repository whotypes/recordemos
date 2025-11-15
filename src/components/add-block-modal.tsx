"use client"

import { useState } from "react"
import Modal from "@/components/ui/modal"
import { BlockData } from "@/lib/types/timeline"

interface AddBlockModalProps {
  isOpen: boolean
  onClose: () => void
  onAddBlock: (blockData: BlockData) => void
  currentTime: number
}

export default function AddBlockModal({ isOpen, onClose, onAddBlock, currentTime }: AddBlockModalProps) {
  const [blockType, setBlockType] = useState<"zoom" | "pan" | "trim">("zoom")
  const [zoomLevel, setZoomLevel] = useState(1.5)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(3)
  const [cropX, setCropX] = useState(10)
  const [cropY, setCropY] = useState(10)
  const [cropW, setCropW] = useState(80)
  const [cropH, setCropH] = useState(80)

  const handleAdd = () => {
    const configs = {
      zoom: {
        type: "zoom",
        label: `${zoomLevel.toFixed(1)}x`,
        color: "bg-primary",
        zoomLevel,
      },
      pan: {
        type: "pan",
        label: "Pan",
        color: "bg-secondary",
        cropX,
        cropY,
        cropW,
        cropH,
      },
      trim: {
        type: "trim",
        label: "Trim",
        color: "bg-destructive",
        trimStart,
        trimEnd,
      },
    }
    onAddBlock(configs[blockType] as BlockData)
    onClose()
  }

  const footer = (
    <div className="flex gap-3">
      <button
        onClick={onClose}
        className="flex-1 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={handleAdd}
        className="flex-1 px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
      >
        Add Block
      </button>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Block" footer={footer}>
      <div className="space-y-6">
        {/* Block Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Block Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "zoom", label: "Zoom", desc: "Zoom in" },
              { id: "pan", label: "Pan", desc: "Move view" },
              { id: "trim", label: "Trim", desc: "Cut segment" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setBlockType(opt.id as any)}
                className={`px-3 py-3 rounded-lg border-2 text-center transition-all ${
                  blockType === opt.id
                    ? "border-accent bg-accent/10 text-accent font-medium"
                    : "border-border/30 text-muted-foreground hover:border-border"
                }`}
              >
                <div className="text-xs font-semibold">{opt.label}</div>
                <div className="text-xs opacity-60">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Block-specific controls */}
        {blockType === "zoom" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex justify-between">
              <span>Zoom Level</span>
              <span className="text-accent font-semibold">{zoomLevel.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number.parseFloat(e.target.value))}
              className="w-full h-2 bg-muted rounded-full accent-accent"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1x</span>
              <span>3x</span>
            </div>
          </div>
        )}

        {blockType === "pan" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground flex justify-between">
                <span>X Position</span>
                <span className="text-accent">{cropX}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={cropX}
                onChange={(e) => setCropX(Number.parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-full accent-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground flex justify-between">
                <span>Y Position</span>
                <span className="text-accent">{cropY}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={cropY}
                onChange={(e) => setCropY(Number.parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-full accent-accent"
              />
            </div>
          </div>
        )}

        {blockType === "trim" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground flex justify-between">
                <span>Trim Start</span>
                <span className="text-accent">{trimStart.toFixed(1)}s</span>
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={trimStart}
                onChange={(e) => setTrimStart(Number.parseFloat(e.target.value))}
                className="w-full h-2 bg-muted rounded-full accent-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground flex justify-between">
                <span>Trim End</span>
                <span className="text-accent">{trimEnd.toFixed(1)}s</span>
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={trimEnd}
                onChange={(e) => setTrimEnd(Number.parseFloat(e.target.value))}
                className="w-full h-2 bg-muted rounded-full accent-accent"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
