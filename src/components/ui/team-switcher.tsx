import { UpgradeModal } from "@/components/autumn/upgrade-modal"
import { CreateProjectModal } from "@/components/create-project-modal"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { PRODUCT_IDS } from "@/lib/autumn/product-ids"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/tanstack-react-start"
import { convexQuery } from "@convex-dev/react-query"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { useCustomer } from "autumn-js/react"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { useAction, useMutation as useConvexMutation } from "convex/react"
import { Check, ChevronDown, CreditCard, Edit2, Plus, Sparkles, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
}

interface Account {
  username: string
  email: string
  plan: "free" | "pro"
}

interface TeamSwitcherProps {
  account?: Account
  projects?: Project[]
  activeProjectId?: string
  onProjectSelect?: (projectId: string) => void
    onCreateProject?: () => void // kept for backwards compatibility, but handled internally
  onUpgrade?: () => void
}

export function TeamSwitcher({
  account,
  projects = [],
  activeProjectId,
  onProjectSelect,
    onCreateProject: _onCreateProject, // kept for backwards compatibility, but handled internally
  onUpgrade,
}: TeamSwitcherProps) {
  const { user } = useUser()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
  const { customer } = useCustomer({ errorOnNotFound: false })
  const [open, setOpen] = useState(false)
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())

    const { data: convexProjects } = useSuspenseQuery(
        convexQuery(api.projects.listForCurrentUser, {}),
    )

  const createProjectAction = useAction(api.projects.create)
    const createProjectMutation = useMutation({
      mutationFn: createProjectAction,
    })
  const deleteProjectMutation = useConvexMutation(api.projects.deleteProject)

  const isPro = customer?.products?.some((p) => p.id === PRODUCT_IDS.pro) ?? false

  const accountData: Account = account || {
    username: user?.username || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "user",
    email: user?.emailAddresses[0]?.emailAddress || "",
    plan: isPro ? "pro" : "free",
  }

    const projectsList: Project[] = Array.isArray(convexProjects)
        ? convexProjects.map((p) => ({
            id: p._id,
            name: p.name,
        }))
        : projects.length > 0
            ? projects
            : []

    const defaultProjects: Project[] = projectsList.length > 0 ? projectsList : []

  const activeProject = defaultProjects.find((p) => p.id === activeProjectId) || defaultProjects[0]
  const maxProjects = accountData.plan === "free" ? 1 : 10
  const isAtLimit = defaultProjects.length >= maxProjects

  const handleProjectSelect = (projectId: string) => {
    onProjectSelect?.(projectId)
      navigate({
          to: "/studio",
          search: { projectId },
      })
    setOpen(false)
  }

  const handleCreateProject = () => {
      if (!isAtLimit && user) {
      setOpen(false)
            navigate({
                to: "/studio",
                search: { projectId: undefined },
            })
            setTimeout(() => {
                setCreateModalOpen(true)
            }, 100)
        }
    }

    const handleCreateProjectSubmit = async (name: string) => {
        if (!user || isCreating) return

        setIsCreating(true)
        try {
          const { projectId } = await createProjectMutation.mutateAsync({ name })

            await queryClient.invalidateQueries({
                queryKey: convexQuery(api.projects.listForCurrentUser, {}).queryKey,
            })

            await queryClient.refetchQueries({
                queryKey: convexQuery(api.projects.listForCurrentUser, {}).queryKey,
            })

            toast.success("Project created successfully!")

            navigate({
                to: "/studio",
                search: { projectId },
            })

            setCreateModalOpen(false)
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Failed to create project"
            toast.error(errorMessage)
            throw error
        } finally {
            setIsCreating(false)
    }
  }

  const handleUpgrade = () => {
      setUpgradeModalOpen(true)
    onUpgrade?.()
    setOpen(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !user) {
      toast.info("Sign in to save your projects, collaborate, and export freely")
      return
    }
    setOpen(newOpen)
    if (!newOpen) {
      setSelectedProjects(new Set())
      setDeleteMode(false)
    }
  }

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!user) {
      e.preventDefault()
      e.stopPropagation()
      toast.info("Sign in to save your projects, collaborate, and export freely")
      return false
    }
  }

  const handleToggleProject = (projectId: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedProjects.size === defaultProjects.length) {
      setSelectedProjects(new Set())
    } else {
      setSelectedProjects(new Set(defaultProjects.map((p) => p.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedProjects.size === 0) return

    const projectIds = Array.from(selectedProjects)
    const activeProjectWillBeDeleted = activeProjectId && selectedProjects.has(activeProjectId)

    try {
      await Promise.all(
        projectIds.map((projectId) => deleteProjectMutation({ projectId: projectId as Id<"projects"> }))
      )

      await queryClient.invalidateQueries({
        queryKey: convexQuery(api.projects.listForCurrentUser, {}).queryKey,
      })

      await queryClient.refetchQueries({
        queryKey: convexQuery(api.projects.listForCurrentUser, {}).queryKey,
      })

      setSelectedProjects(new Set())
      setDeleteMode(false)
      toast.success(`Deleted ${projectIds.length} project${projectIds.length > 1 ? "s" : ""}`)

      if (activeProjectWillBeDeleted) {
        navigate({
          to: "/studio",
          search: { projectId: undefined },
        })
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete project(s)"
      toast.error(errorMessage)
    }
  }

  const isSignedIn = !!user
  const allSelected = defaultProjects.length > 0 && selectedProjects.size === defaultProjects.length

  return (
    <div className="-mt-0.5">
      <Popover open={open && isSignedIn} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open && isSignedIn}
          onClick={handleButtonClick}
          onPointerDown={(e) => {
            if (!user) {
              e.preventDefault()
            }
          }}
          className={cn(
            "dark:hover:bg-accent max-w-[200px] cursor-pointer justify-start px-2 sm:max-w-[240px] flex items-center gap-2",
            !isSignedIn && "opacity-50 cursor-not-allowed"
          )}
        >
          <Link
            to="/"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <img
              src="/rd_logo.png"
              alt="Record Demos"
              className="h-5 w-5 dark:brightness-75"
            />
          </Link>
          <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
            <span className="text-xs font-medium truncate w-full text-left">
              {activeProject?.name || "Select Project"}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
        <PopoverContent className="w-72 p-1 max-h-[600px] flex flex-col" align="start" side="bottom">
          <div className="flex flex-col overflow-hidden">
            <div className="px-2 py-1.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {accountData.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate mt-0.5">
                    {accountData.email}
                  </p>
                </div>
                <div className="shrink-0">
                  {accountData.plan === "pro" ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                      <Sparkles className="h-3 w-3" />
                      <span className="text-xs font-medium">Pro</span>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={handleUpgrade}
                      >
                      <CreditCard className="h-3 w-3 mr-1.5" />
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col overflow-hidden min-h-0">
              <div className="px-2 py-1.5 flex items-center justify-between shrink-0">
                <span className="text-sm font-medium text-muted-foreground">
                  Projects ({defaultProjects.length}/{maxProjects})
                </span>
                {defaultProjects.length > 0 && (
                  <div className="flex items-center gap-1">
                    {deleteMode ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => {
                            setDeleteMode(false)
                            setSelectedProjects(new Set())
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1.5" />
                          Cancel
                        </Button>
                        {selectedProjects.size > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={handleDeleteSelected}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Delete ({selectedProjects.size})
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => setDeleteMode(true)}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {deleteMode && defaultProjects.length > 0 && (
                <>
                  <Separator />
                  <div className="px-2 py-1.5 flex items-center justify-between shrink-0">
                    <span className="text-xs text-muted-foreground">
                      Select projects to delete
                    </span>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        className="h-3.5 w-3.5"
                      />
                      <button
                        onClick={handleSelectAll}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Select all
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col overflow-hidden min-h-0">
                <div className="overflow-y-auto flex-1 min-h-0 max-h-[300px]">
                  {defaultProjects.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No projects yet
                    </div>
                  ) : (
                    defaultProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          if (!deleteMode) {
                            handleProjectSelect(project.id)
                          }
                        }}
                        className={cn(
                          "relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",
                          "focus:bg-accent focus:text-accent-foreground",
                          !deleteMode && "hover:bg-accent hover:text-accent-foreground",
                          activeProjectId === project.id && !deleteMode && "bg-accent text-accent-foreground",
                          deleteMode && "cursor-default"
                        )}
                      >
                        {deleteMode && (
                          <Checkbox
                            checked={selectedProjects.has(project.id)}
                            onCheckedChange={() => handleToggleProject(project.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 shrink-0"
                          />
                        )}
                        <span className="truncate flex-1 text-left">{project.name}</span>
                        {!deleteMode && activeProjectId === project.id && (
                          <Check className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                <Separator />

                <div className="shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-9 px-2"
                    onClick={handleCreateProject}
                    disabled={isAtLimit}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                  {isAtLimit && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">
                      {accountData.plan === "free"
                        ? "Upgrade to Pro to create more projects"
                        : "Project limit reached"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
      </PopoverContent>
    </Popover>
          <UpgradeModal
              open={upgradeModalOpen}
              onOpenChange={setUpgradeModalOpen}
          />
          <CreateProjectModal
              open={createModalOpen}
              onOpenChange={setCreateModalOpen}
              onCreate={handleCreateProjectSubmit}
              loading={isCreating}
          />
    </div>
  )
}