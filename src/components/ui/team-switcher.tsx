import { UpgradeModal } from "@/components/autumn/upgrade-modal"
import { CreateProjectModal } from "@/components/create-project-modal"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { PRODUCT_IDS } from "@/lib/autumn/product-ids"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/tanstack-react-start"
import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { useCustomer } from "autumn-js/react"
import { api } from "convex/_generated/api"
import { Check, ChevronDown, CreditCard, Plus, Sparkles } from "lucide-react"
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

    const { data: convexProjects } = useSuspenseQuery(
        convexQuery(api.projects.listForCurrentUser, {}),
    )

    const createProjectMutationFn = useConvexMutation(api.projects.create)
    const createProjectMutation = useMutation({
        mutationFn: createProjectMutationFn,
    })

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
            const projectId = await createProjectMutation.mutateAsync({ name })

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
  }

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!user) {
      e.preventDefault()
      e.stopPropagation()
      toast.info("Sign in to save your projects, collaborate, and export freely")
      return false
    }
  }

  const isSignedIn = !!user

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
      <PopoverContent className="p-0" align="start" side="bottom">
        <div className="flex flex-col">
          <div className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold truncate">
                  {accountData.username}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {accountData.email}
                </span>
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
                    className="h-6 px-2 text-xs"
                    onClick={handleUpgrade}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Upgrade
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="p-2">
            <div className="px-2 py-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Projects ({defaultProjects.length}/{maxProjects})
              </span>
            </div>
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
                              {defaultProjects.length === 0 ? (
                                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                      No projects yet
                                  </div>
                              ) : (
                                  defaultProjects.map((project) => (
                                      <button
                                          key={project.id}
                                          onClick={() => handleProjectSelect(project.id)}
                                          className={cn(
                                              "w-full flex items-center justify-between px-2 py-2 rounded-md text-sm transition-colors",
                                              "hover:bg-accent hover:text-accent-foreground",
                                              activeProjectId === project.id
                                                  ? "bg-accent text-accent-foreground"
                                                  : "text-foreground"
                                          )}
                                      >
                                          <span className="truncate">{project.name}</span>
                                          {activeProjectId === project.id && (
                                              <Check className="h-4 w-4 shrink-0 ml-2" />
                                          )}
                                      </button>
                                  ))
                              )}
            </div>

            <Separator className="my-2" />

            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-9"
                onClick={handleCreateProject}
                                  disabled={isAtLimit}
              >
                                  <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
              {isAtLimit && (
                <p className="px-2 text-xs text-muted-foreground">
                  {accountData.plan === "free"
                    ? "Upgrade to Pro to create more projects"
                    : "Project limit reached"}
                </p>
              )}
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