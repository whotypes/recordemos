"use client"

import { useState } from "react"
import { Check, Search, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Id } from "../../convex/_generated/dataModel"

export interface User {
  _id: Id<"users">
  username: string
  email: string
  image: string
}

interface UserSelectorProps {
  users: User[]
  selectedUsers: Id<"users">[]
  onSelectionChange: (users: Id<"users">[]) => void
  placeholder?: string
  maxHeight?: string
}

export default function UserSelector({
  users,
  selectedUsers,
  onSelectionChange,
  placeholder = "Search users...",
  maxHeight = "300px",
}: UserSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleUser = (userId: Id<"users">) => {
    if (selectedUsers.includes(userId)) {
      onSelectionChange(selectedUsers.filter((id) => id !== userId))
    } else {
      onSelectionChange([...selectedUsers, userId])
    }
  }

  const removeUser = (userId: Id<"users">) => {
    onSelectionChange(selectedUsers.filter((id) => id !== userId))
  }

  const selectedUserObjects = users.filter((u) => selectedUsers.includes(u._id))

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Selected Users Pills */}
      {selectedUserObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUserObjects.map((user) => (
            <Badge
              key={user._id}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-2 hover:bg-secondary/80 transition-colors"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={user.image} alt={user.username} />
                <AvatarFallback className="text-[10px]">
                  {user.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">{user.username}</span>
              <button
                onClick={() => removeUser(user._id)}
                className="hover:bg-background/50 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* User List */}
      <ScrollArea className="rounded-md border" style={{ maxHeight }}>
        {filteredUsers.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No users found
          </div>
        ) : (
          <div className="p-2">
            {filteredUsers.map((user) => {
              const isSelected = selectedUsers.includes(user._id)
              return (
                <button
                  key={user._id}
                  onClick={() => toggleUser(user._id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors",
                    isSelected && "bg-accent/50"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} alt={user.username} />
                    <AvatarFallback className="text-xs">
                      {user.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
