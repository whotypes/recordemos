import { ScrollArea } from "@/components/ui/scroll-area"
import { useSubscriptionStore } from "@/lib/subscription-store"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { Frame, Monitor, Move, Palette, Video, ZoomIn } from "lucide-react"
import BackgroundSelector from "./background-selector"
import BrowserAppearance from "./browser-appearance"
import SidebarButton from "./sidebar-button"
import VideoControls from "./video-controls"
import ZoomAspectPanel from "./zoom-aspect-panel"

export default function EditingPanel() {
  const activeTabIndex = useVideoOptionsStore((state) => state.activeTabIndex)
  const setActiveTabIndex = useVideoOptionsStore((state) => state.setActiveTabIndex)
  const hideToolbars = useVideoOptionsStore((state) => state.hideToolbars)
  const isPremium = useSubscriptionStore((state) => state.isPremium)
  const setShowPremiumModal = useSubscriptionStore((state) => state.setShowPremiumModal)

  const tabs = [
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
    <div className="flex w-full h-full bg-card">
      {/* Left Sidebar */}
      <ul className="flex basis-full flex-col items-center gap-6 overflow-x-hidden border-r border-border/60 px-4 py-4 md:max-w-[28%] md:basis-[28%] md:border-r">
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

      {/* Right Content */}
      <div className="relative hidden h-full w-full flex-col overflow-hidden md:flex min-w-0">
        <ScrollArea type="scroll" className="flex-1 min-h-0">
          <div className="flex flex-col px-4">
            <div className="flex w-full flex-col py-10">
              <h3 className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase text-dark/70 whitespace-nowrap">
                {activeTab.icon}
                <div>{activeTab.text}</div>
              </h3>
              {activeTab.component}
            </div>
          </div>
        </ScrollArea>

        {/* Info */}
        <div className="shrink-0 flex items-end px-4 py-4 border-t border-border/60">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            All rendering is local on your device
          </p>
        </div>
      </div>
    </div>
  )
}
