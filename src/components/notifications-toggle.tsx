"use client"

import { useEffect, useState } from "react"
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  List,
  PanelsTopLeft,
  Check,
  X,
  UserPlus,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCollaborationStore } from "@/lib/collaboration-store"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useNavigate } from "@tanstack/react-router"

const getTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface NotificationsToggleProps {
  userId: Id<"users"> | null
}

export default function NotificationsToggle({ userId }: NotificationsToggleProps) {
  const [index, setIndex] = useState(0)
  const [isCarousel, setIsCarousel] = useState(true)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const notifications = useCollaborationStore((state) => state.notifications)
  const pendingCount = useCollaborationStore((state) => state.pendingCount)
  const setNotifications = useCollaborationStore((state) => state.setNotifications)
  const setPendingCount = useCollaborationStore((state) => state.setPendingCount)
  const removeNotification = useCollaborationStore((state) => state.removeNotification)
  const updateNotificationStatus = useCollaborationStore((state) => state.updateNotificationStatus)

  const notificationsList = useQuery(
    api.notifications.list,
    userId ? { userId } : "skip"
  )
  const pendingList = useQuery(
    api.notifications.listPending,
    userId ? { userId } : "skip"
  )

  const acceptInviteMutation = useMutation(api.notifications.acceptInvite)
  const rejectInviteMutation = useMutation(api.notifications.rejectInvite)
  const removeMutation = useMutation(api.notifications.remove)

  useEffect(() => {
    if (notificationsList) {
      setNotifications(notificationsList)
    }
  }, [notificationsList, setNotifications])

  useEffect(() => {
    if (pendingList) {
      setPendingCount(pendingList.length)
    }
  }, [pendingList, setPendingCount])

  const next = () => setIndex((prev) => (prev + 1) % notifications.length)
  const prev = () =>
    setIndex((prev) => (prev - 1 + notifications.length) % notifications.length)

  const handleAccept = async (id: Id<"notifications">, projectId: Id<"projects">) => {
    try {
      await acceptInviteMutation({ notificationId: id })
      updateNotificationStatus(id, "accepted")
      toast.success("Invite accepted!")

      setOpen(false)
      navigate({ to: "/studio", search: { project: projectId } })
    } catch (error) {
      toast.error("Failed to accept invite")
      console.error(error)
    }
  }

  const handleReject = async (id: Id<"notifications">) => {
    try {
      await rejectInviteMutation({ notificationId: id })
      updateNotificationStatus(id, "rejected")
      toast.success("Invite rejected")
    } catch (error) {
      toast.error("Failed to reject invite")
      console.error(error)
    }
  }

  const handleRemove = async (id: Id<"notifications">) => {
    try {
      await removeMutation({ notificationId: id })
      removeNotification(id)
    } catch (error) {
      toast.error("Failed to remove notification")
      console.error(error)
    }
  }

  const pendingNotifications = notifications.filter(n => n.status === "pending")
  const displayNotifications = pendingNotifications.length > 0 ? pendingNotifications : notifications

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative inline-flex items-center justify-center rounded-md p-2 hover:bg-accent transition-colors",
            open && "bg-accent"
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0 h-4 min-w-[1rem] flex items-center justify-center"
            >
              {pendingCount > 99 ? "99+" : pendingCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-80 p-0"
      >
        <div className="flex justify-between items-center border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Invites</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCarousel((prev) => !prev)}
            className="h-7 w-7"
          >
            {isCarousel ? (
              <List className="h-3.5 w-3.5" />
            ) : (
              <PanelsTopLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        {displayNotifications.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">
            No invites
          </div>
        ) : isCarousel ? (
          <div className="relative flex items-center w-full py-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 z-10 h-8 w-8"
              onClick={prev}
              disabled={displayNotifications.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Card className="w-full mx-10 p-4 flex flex-col items-start text-left transition-all duration-300 shadow-none border">
              <div className="flex items-start gap-3 mb-3 w-full">
                <Avatar className="h-10 w-10 ring-2 ring-border">
                  <AvatarImage
                    src={displayNotifications[index].fromUser?.image}
                    alt={displayNotifications[index].fromUser?.username}
                  />
                  <AvatarFallback>
                    {displayNotifications[index].fromUser?.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-sm">Project Invite</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">
                      {displayNotifications[index].fromUser?.username}
                    </span>
                    {" invited you to "}
                    <span className="font-medium text-foreground">
                      {displayNotifications[index].project?.name}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {getTimeAgo(displayNotifications[index].createdAt)}
                    </span>
                    {displayNotifications[index].isOnline && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
                        Online
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(displayNotifications[index]._id)}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {displayNotifications[index].status === "pending" ? (
                <div className="flex gap-2 w-full">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAccept(displayNotifications[index]._id, displayNotifications[index].projectId)}
                    className="flex-1 h-8 text-xs gap-1.5"
                  >
                    <Check className="h-3 w-3" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(displayNotifications[index]._id)}
                    className="flex-1 h-8 text-xs gap-1.5"
                  >
                    <X className="h-3 w-3" />
                    Decline
                  </Button>
                </div>
              ) : (
                <Badge
                  variant={displayNotifications[index].status === "accepted" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {displayNotifications[index].status === "accepted" ? "Accepted" : "Rejected"}
                </Badge>
              )}
            </Card>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 z-10 h-8 w-8"
              onClick={next}
              disabled={displayNotifications.length <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {displayNotifications.map((item) => (
              <div
                key={item._id}
                className={cn(
                  "p-4 hover:bg-muted/50 transition relative",
                  item.status === "pending" && "bg-accent/5"
                )}
              >
                <div className="flex items-start gap-3 mb-2">
                  <Avatar className="h-8 w-8 ring-2 ring-border">
                    <AvatarImage
                      src={item.fromUser?.image}
                      alt={item.fromUser?.username}
                    />
                    <AvatarFallback className="text-xs">
                      {item.fromUser?.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <UserPlus className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-xs">Project Invite</span>
                      {item.status === "pending" && (
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-medium text-foreground">
                        {item.fromUser?.username}
                      </span>
                      {" invited you to "}
                      <span className="font-medium text-foreground">
                        {item.project?.name}
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(item._id)}
                    className="h-5 w-5"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center justify-between pl-11">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {getTimeAgo(item.createdAt)}
                    </span>
                    {item.isOnline && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
                        Online
                      </Badge>
                    )}
                  </div>

                  {item.status === "pending" ? (
                    <div className="flex gap-1.5">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAccept(item._id, item.projectId)}
                        className="h-6 text-xs gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(item._id)}
                        className="h-6 text-xs gap-1"
                      >
                        <X className="h-3 w-3" />
                        Decline
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      variant={item.status === "accepted" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {item.status === "accepted" ? "Accepted" : "Rejected"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
