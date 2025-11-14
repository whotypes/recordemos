'use client'

import { Button } from '@/components/ui/button'

interface SidebarButtonProps {
  icon: React.ReactNode
  text: string
  index: number
  activeTabIndex: number
  setActiveTabIndex: (index: number) => void
}

export default function SidebarButton({ icon, text, index, activeTabIndex, setActiveTabIndex }: SidebarButtonProps) {

  const handleClick = () => {
    setActiveTabIndex(index)
  }

  return (
    <li className="flex flex-col items-center gap-2">
      <Button
        className="h-11 rounded-xl px-3 py-2 md:h-12 md:px-4 md:py-3"
        variant={activeTabIndex === index ? "activeIcon" : 'icon'}
        aria-label={`${text} options`}
        onClick={handleClick}
      >
        {icon}
      </Button>
      <span className="hidden max-w-[3.25rem] truncate text-xs md:inline">
        {text}
      </span>
    </li>
  )
}
