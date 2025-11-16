"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { PresenceUser } from "@/lib/collaboration-store"

interface AvatarGroupProps {
  users: PresenceUser[]
  currentUserId?: string
  maxVisible?: number
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
}

export default function AvatarGroup({
  users,
  currentUserId,
  maxVisible = 5,
  size = "md",
  className,
}: AvatarGroupProps) {
  const filteredUsers = users.filter((u) => u.userId !== currentUserId)
  const visibleUsers = filteredUsers.slice(0, maxVisible)
  const remainingCount = filteredUsers.length - maxVisible

  if (filteredUsers.length === 0) {
    return null
  }

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visibleUsers.map((user, index) => (
        <div key={user._id} className="relative group">
          <Avatar
            className={cn(
              sizeClasses[size],
              "ring-2 ring-background transition-transform hover:scale-110 hover:z-10 cursor-pointer"
            )}
            style={{ zIndex: visibleUsers.length - index }}
          >
            <AvatarImage src={user.userImage} alt={user.username} />
            <AvatarFallback className={cn(sizeClasses[size])}>
              {user.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* online indicator */}
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background",
              size === "sm" ? "w-2 h-2" : size === "md" ? "w-2.5 h-2.5" : "w-3 h-3",
              user.isPlaying ? "bg-green-500" : "bg-blue-500"
            )}
          />

          {/* tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {user.username}
            {user.isPlaying && (
              <span className="text-green-500 ml-1">● Playing</span>
            )}
          </div>
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            sizeClasses[size],
            "rounded-full bg-muted ring-2 ring-background flex items-center justify-center font-medium text-muted-foreground"
          )}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
