import { create } from "zustand"

interface EditorState {
  backgroundColor: string
  setBackgroundColor: (color: string) => void
  zoomLevel: number
  setZoomLevel: (level: number) => void
  aspectRatio: string
  setAspectRatio: (ratio: string) => void
  hideToolbars: boolean
  setHideToolbars: (hide: boolean) => void
  activeTabIndex: number
  setActiveTabIndex: (index: number) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  backgroundColor: "#1a1a1a",
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  zoomLevel: 100,
  setZoomLevel: (level) => set({ zoomLevel: level }),
  aspectRatio: "16:9",
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  hideToolbars: false,
  setHideToolbars: (hide) => set({ hideToolbars: hide }),
  activeTabIndex: 0,
  setActiveTabIndex: (index) => set({ activeTabIndex: index }),
}))
