'use client'

import { PRODUCT_IDS } from "@/lib/autumn/product-ids"
import { cn } from '@/lib/utils'
import React from 'react'

import NotificationsToggle from "@/components/notifications-toggle"
import TeamPresence from "@/components/team-presence"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TeamSwitcher } from "@/components/ui/team-switcher"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/tanstack-react-start"
import { Link as RouterLink, useLocation } from "@tanstack/react-router"
import { useCustomer } from "autumn-js/react"
import {
  Cloud,
  CloudOff,
  CreditCard,
  LogOut,
  Settings,
  User
} from "lucide-react"
import type { Id } from "../../../convex/_generated/dataModel"

type MobileNavProps = {
    nav: {
        name: string
        items: {
            label: string
            href: string
        }[]
    }[]
}

export function MobileNav({ nav }: MobileNavProps) {
    const Link = 'a'
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'extend-touch-target block size-8 touch-manipulation items-center justify-start gap-2.5 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent md:hidden dark:hover:bg-transparent'
                    )}
                >
                    <div className="relative flex items-center justify-center">
                        <div className="relative size-4">
                            <span
                                className={cn(
                                    'bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100',
                                    open ? 'top-[0.4rem] -rotate-45' : 'top-1'
                                )}
                            />
                            <span
                                className={cn(
                                    'bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100',
                                    open ? 'top-[0.4rem] rotate-45' : 'top-2.5'
                                )}
                            />
                        </div>
                        <span className="sr-only">Toggle Menu</span>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="bg-background/90 no-scrollbar h-(--radix-popover-content-available-height) w-(--radix-popover-content-available-width) overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur duration-100"
                align="start"
                side="bottom"
                alignOffset={-16}
                sideOffset={4}
            >
                <div className="flex flex-col gap-12 overflow-auto px-6 py-6">
                    {nav.map((category, index) => (
                        <div className="flex flex-col gap-4" key={index}>
                            <p className="text-muted-foreground text-sm font-medium">
                                {category.name}
                            </p>
                            <div className="flex flex-col gap-3">
                                {category.items.map((item, index) => (
                                    <Link
                                        key={index}
                                        href={item.href as string}
                                        className="text-2xl font-medium"
                                        onClick={() => setOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}

function UserProfileDropdown({
  align = "end",
  sizeClass = "h-8 w-8",
}: {
  align?: "start" | "center" | "end"
  sizeClass?: string
}) {
  const { customer } = useCustomer({ errorOnNotFound: false })
  const isPremium = customer?.products?.some((p) => p.id === PRODUCT_IDS.pro) ?? false
  const { user } = useUser()
  const { signOut } = useClerk()

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/" })
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative flex size-8 items-center justify-center rounded-full ring-2 ring-border transition-all hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            sizeClass
          )}
          aria-label="User menu"
        >
          <Avatar className="size-8">
            <AvatarImage
              src={user.imageUrl}
              alt={user.fullName || user.emailAddresses[0]?.emailAddress || "User"}
            />
            <AvatarFallback>
              {user.fullName?.[0]?.toUpperCase() ||
                user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || (
                  <User className="size-4" />
                )}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium leading-none">
            {user.username || "User"}
          </p>
          <p className="text-xs leading-none text-muted-foreground">
            {user.emailAddresses[0]?.emailAddress}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          {isPremium && (
            <DropdownMenuItem className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer flex items-center">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CloudUploadToggle() {
  const cloudUploadEnabled = useVideoPlayerStore((state) => state.cloudUploadEnabled)
  const setCloudUploadEnabled = useVideoPlayerStore((state) => state.setCloudUploadEnabled)

  const handleToggle = () => {
    setCloudUploadEnabled(!cloudUploadEnabled)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleToggle}
            className={cn(
              "h-8 w-8 flex items-center justify-center transition-colors rounded-md",
              cloudUploadEnabled
                ? "text-foreground hover:bg-accent"
                : "text-muted-foreground hover:bg-accent"
            )}
            aria-label={cloudUploadEnabled ? "Cloud upload enabled" : "Cloud upload disabled"}
          >
            {cloudUploadEnabled ? (
              <Cloud className="h-4 w-4" />
            ) : (
              <CloudOff className="h-4 w-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <span>
            {cloudUploadEnabled
              ? "Cloud upload enabled - videos will be saved to the project"
              : "Cloud upload disabled - videos will only be edited locally"}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const navigationLinks = [
  {
    name: "Menu",
    items: [
      { href: "/", label: "Home" },
      { href: "/studio", label: "Studio" },
      // TODO: Server routes that redirect to these
      { href: "/github", label: "GitHub" },
      { href: "/vibeapps", label: "VibeApps" },
      { href: "/manifesto", label: "Manifesto" },
    ],
  },
]

interface StudioNavbarProps {
  activeProjectId?: Id<"projects">
  currentUserId?: Id<"users">
}

export default function StudioNavbar({ activeProjectId, currentUserId }: StudioNavbarProps = {}) {
  const Link: any = "a"
  const location = useLocation()

  const isLinkActive = (href: string): boolean => {
    if (href === "#" || !href) return false
    const currentPath = location.pathname
    if (href === "/") {
      return currentPath === "/"
    }
    return currentPath.startsWith(href)
  }

  return (
    <header className="border-border mt-4 w-full flex-col items-center justify-between gap-3 border-b px-4 xl:px-6">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex flex-1 items-center justify-start gap-2">
          <MobileNav nav={navigationLinks} />
          <TeamSwitcher activeProjectId={activeProjectId} />
        </div>

        <div className="flex items-center justify-end gap-4 md:flex-1">
          <div className="hidden items-center gap-1.5 sm:flex">
            <CloudUploadToggle />
            <TeamPresence projectId={activeProjectId ?? null} currentUserId={currentUserId ?? null} />
            <NotificationsToggle userId={currentUserId ?? null} />
            <ThemeToggle />
          </div>
          <SignedIn>
            <UserProfileDropdown align="end" sizeClass="h-8 w-8" />
          </SignedIn>
          <SignedOut>
            <RouterLink
              to="/sign-in/$"
              className={buttonVariants({ size: "sm" })}
            >
              Sign In
            </RouterLink>
          </SignedOut>
        </div>
      </div>
      <div className="flex w-full items-center justify-start pb-1.5">
        <NavigationMenu className="max-md:hidden">
          <NavigationMenuList>
            {navigationLinks[0].items.map((link, index) => {
              const isActive = isLinkActive(link.href)
              return (
                <NavigationMenuItem key={index} asChild>
                  <Link
                    href={link.href}
                    data-active={isActive}
                    className="text-foreground/60 data-[active=true]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex flex-col gap-1 rounded-md px-3 py-1.5 text-sm font-normal transition-all outline-none focus-visible:ring-[3px] data-[active=true]:relative"
                  >
                    {link.label}
                  </Link>
                </NavigationMenuItem>
              )
            })}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  )
}
