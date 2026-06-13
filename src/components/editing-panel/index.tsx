import { ScrollArea } from "@/components/ui/scroll-area"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { Frame, Monitor, Move, Palette, Play } from "lucide-react"
import BackgroundSelector from "./background-selector"
import BrowserAppearance from "./browser-appearance"
import SidebarButton from "./sidebar-button"
import VideoControls from "./video-controls"
import VideoPanel from "./video-panel"
import ZoomAspectPanel from "./zoom-aspect-panel"

interface EditingPanelProps {
  projectId?: string
  onExport?: () => void
}

export default function EditingPanel({ projectId, onExport }: EditingPanelProps) {
  const activeTabIndex = useVideoOptionsStore((state) => state.activeTabIndex)
  const setActiveTabIndex = useVideoOptionsStore((state) => state.setActiveTabIndex)

  const tabs = [
    {
      id: 'video',
      text: 'Video',
      icon: <Play size={20} />,
      component: <VideoPanel projectId={projectId} onExport={onExport || (() => { })} />,
    },
    {
      id: 'background',
      text: 'Background',
      icon: <Palette size={20} />,
      component: <BackgroundSelector />,
    },
    {
      id: 'motion',
      text: 'Motion',
      icon: <Move size={20} />,
      component: <VideoControls />,
    },
    {
      id: 'browser',
      text: 'Browser',
      icon: <Monitor size={20} />,
      component: <BrowserAppearance />,
    },
    {
      id: 'frame',
      text: 'Frame',
      icon: <Frame size={20} />,
      component: <ZoomAspectPanel />,
    },
  ]

  const activeTab = tabs[activeTabIndex] || tabs[0]

  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden bg-card">
      <ul className="flex w-[4.75rem] shrink-0 flex-col items-center gap-4 border-r border-border/60 px-2 py-4">
        {tabs.map((tab, index) => (
          <SidebarButton
            key={tab.id}
            text={tab.text}
            icon={tab.icon}
            index={index}
            activeTabIndex={activeTabIndex}
            setActiveTabIndex={setActiveTabIndex}
          />
        ))}
      </ul>

      <div className="relative hidden h-full min-w-0 flex-1 flex-col overflow-hidden md:flex">
        <ScrollArea type="scroll" className="min-h-0 flex-1 overflow-x-hidden">
          <div className="flex min-w-0 flex-col px-4">
            <div className="flex w-full min-w-0 flex-col py-6">
              <h3 className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {activeTab.icon}
                <span>{activeTab.text}</span>
              </h3>
              {activeTab.component}
            </div>
          </div>
        </ScrollArea>

        <div className="shrink-0 flex items-end px-4 py-4 border-t border-border/60">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            All rendering is local on your device
          </p>
        </div>
      </div>
    </div>
  )
}
