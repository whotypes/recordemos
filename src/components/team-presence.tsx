"use client"

import { useEffect, useState } from "react"
import { Users, Copy, Check, UserPlus } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import UserSelector from "@/components/user-selector"
import { useCollaborationStore } from "@/lib/collaboration-store"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface TeamPresenceProps {
  projectId: Id<"projects"> | null
  currentUserId: Id<"users"> | null
}

export default function TeamPresence({ projectId, currentUserId }: TeamPresenceProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([])

  const presence = useCollaborationStore((state) => state.presence)
  const setPresence = useCollaborationStore((state) => state.setPresence)

  const presenceList = useQuery(
    api.presence.listPresence,
    projectId ? { projectId } : "skip"
  )

  const allUsers = useQuery(api.users.list) || []
  const sendInvite = useMutation(api.notifications.sendInvite)

  useEffect(() => {
    if (presenceList) {
      setPresence(presenceList)
    }
  }, [presenceList, setPresence])

  const activeUsers = presence.filter((p) => p.userId !== currentUserId)
  const shareUrl = `${window.location.origin}/studio?project=${projectId}`

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendInvite = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user")
      return
    }

    if (!projectId || !currentUserId) {
      toast.error("Project or user not found")
      return
    }

    try {
      for (const toUserId of selectedUsers) {
        await sendInvite({
          toUserId,
          fromUserId: currentUserId,
          projectId,
        })
      }

      toast.success(`Invite sent to ${selectedUsers.length} user(s)`)
      setSelectedUsers([])
    } catch (error) {
      toast.error("Failed to send invite")
      console.error(error)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors",
            open && "bg-accent"
          )}
          aria-label="Team collaboration"
        >
          <div className="flex items-center -space-x-2 px-2 py-1">
            {activeUsers.slice(0, 3).map((user, index) => (
              <Avatar
                key={user._id}
                className="h-6 w-6 ring-2 ring-background transition-transform hover:scale-110 hover:z-10"
                style={{ zIndex: 3 - index }}
              >
                <AvatarImage src={user.userImage} alt={user.username} />
                <AvatarFallback className="text-xs">
                  {user.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {activeUsers.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted ring-2 ring-background flex items-center justify-center text-[10px] font-medium">
                +{activeUsers.length - 3}
              </div>
            )}
            {activeUsers.length === 0 && (
              <div className="p-2">
                <Users className="h-4 w-4" />
              </div>
            )}
          </div>
          {activeUsers.length > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0 h-4 min-w-[1rem] flex items-center justify-center"
            >
              {activeUsers.length}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-[480px] p-0"
      >
        <div className="flex justify-between items-center border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Collaboration</h2>
          <Badge variant="outline" className="text-xs">
            {activeUsers.length + 1} online
          </Badge>
        </div>

        <div className="p-4 space-y-4">
          {/* Active Users */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Active now</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activeUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No other users online
                </p>
              ) : (
                activeUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.userImage} alt={user.username} />
                        <AvatarFallback className="text-xs">
                          {user.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.currentBlockId ? "Editing timeline" : "Viewing project"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Send Invite Section */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Invite collaborators</Label>

            <UserSelector
              users={allUsers
                .filter(u => u._id !== currentUserId)
                .map(u => ({
                  _id: u._id,
                  username: u.username,
                  email: u.email,
                  image: u.image,
                }))}
              selectedUsers={selectedUsers}
              onSelectionChange={setSelectedUsers}
              placeholder="Select users to invite..."
              maxHeight="150px"
            />

            <Button
              onClick={handleSendInvite}
              className="w-full gap-2 h-9"
              disabled={selectedUsers.length === 0}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite {selectedUsers.length || 0} user{selectedUsers.length !== 1 && "s"}
            </Button>
          </div>

          <Separator />

          {/* Share Link */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Share link</Label>
            <div className="flex items-center gap-2">
              <Input
                className="flex-1 text-xs"
                readOnly
                value={shareUrl}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view and edit this project
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
