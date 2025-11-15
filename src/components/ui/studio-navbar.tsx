'use client'

import { useSubscriptionStore } from "@/lib/subscription-store"
import { cn } from '@/lib/utils'
import React from 'react'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  BellIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CreditCard,
  LogOut,
  Settings,
  User
} from "lucide-react"

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

const defaultTeams = [
  { id: "recorddemos", name: "RecordDemos Team" },
]

export function TeamSwitcher() {
  const [team, setTeam] = React.useState(defaultTeams[0])
  const [open, setOpen] = React.useState(false)

  const onCreateNewTeam = () => {
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "dark:hover:bg-accent max-w-[140px] cursor-pointer justify-start px-2 sm:max-w-[180px] flex items-center gap-2"
          )}
        >
          <div className="w-5 h-5 rounded-sm bg-accent flex items-center justify-center">
            <span className="text-xs font-bold text-accent-foreground">RD</span>
          </div>
          <p className="truncate text-sm">{team.name}</p>
          <ChevronsUpDownIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <div className="p-2">
          <div className="flex items-center gap-3 p-2 rounded-sm">
            <div className="w-5 h-5 rounded-sm bg-accent flex items-center justify-center">
              <span className="text-xs font-bold text-accent-foreground">RD</span>
            </div>
            <span className="flex-1">RecordDemos Team</span>
            <CheckIcon className="ml-auto h-4 w-4 opacity-100" aria-hidden />
          </div>
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
  const isPremium = useSubscriptionStore((state) => state.isPremium)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            sizeClass
          )}
          aria-label="Open user menu"
        >
          <Avatar className={cn("h-full w-full")}>
            <AvatarImage src="/avatar-1.png" alt="User avatar" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">John Doe</p>
            <p className="text-xs leading-none text-muted-foreground">
              john@example.com
            </p>
          </div>
        </DropdownMenuLabel>
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
        <DropdownMenuItem className="flex items-center">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const navigationLinks = [
  {
    name: "Menu",
    items: [
      { href: "#", label: "Overview", active: true },
      { href: "#", label: "Integrations" },
      { href: "#", label: "Deployments" },
      { href: "#", label: "Domains" },
      { href: "#", label: "Usage" },
      { href: "#", label: "Storage" },
      { href: "#", label: "Settings" },
    ],
  },
]

export default function StudioNavbar() {
  const Link: any = "a"

  return (
    <header className="border-border mt-4 w-full flex-col items-center justify-between gap-3 border-b px-4 xl:px-6">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex flex-1 items-center justify-start gap-2">
          <MobileNav nav={navigationLinks} />
          <TeamSwitcher />
        </div>

        <div className="flex items-center justify-end gap-4 md:flex-1">
          <div className="hidden items-center gap-1.5 sm:flex">
            <Link
              href="#"
              className={cn(
                "h-8 w-8 flex items-center justify-center"
              )}
            >
              <BellIcon className="h-4 w-4" />
            </Link>
            <Link
              href="#"
              className={cn(
                "h-8 w-8 flex items-center justify-center"
              )}
            >
              <BookOpenIcon className="h-4 w-4" />
            </Link>
          </div>
          <UserProfileDropdown align="end" sizeClass="h-8 w-8" />
        </div>
      </div>
      <div className="flex w-full items-center justify-start pb-1.5">
        <NavigationMenu className="max-md:hidden">
          <NavigationMenuList>
            {navigationLinks[0].items.map((link, index) => (
              <NavigationMenuItem key={index} asChild>
                <Link
                  href={link.href}
                  data-active={link.active}
                  className="text-foreground/60 data-[active=true]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex flex-col gap-1 rounded-md px-3 py-1.5 text-sm font-normal transition-all outline-none focus-visible:ring-[3px] data-[active=true]:relative"
                >
                  {link.label}
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  )
}
