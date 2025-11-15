"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useState } from "react"

interface CreateProjectModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreate: (name: string) => Promise<void>
	loading?: boolean
}

export function CreateProjectModal({
	open,
	onOpenChange,
	onCreate,
	loading = false,
}: CreateProjectModalProps) {
	const [projectName, setProjectName] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!projectName.trim() || isSubmitting) return

		setIsSubmitting(true)
		try {
			await onCreate(projectName.trim())
			setProjectName("")
			onOpenChange(false)
		} catch (error) {
			console.error("Failed to create project:", error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleOpenChange = (newOpen: boolean) => {
		if (!isSubmitting) {
			onOpenChange(newOpen)
			if (!newOpen) {
				setProjectName("")
			}
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Create New Project</DialogTitle>
					<DialogDescription>
						Give your project a name to get started.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Project Name</Label>
							<Input
								id="name"
								value={projectName}
								onChange={(e) => setProjectName(e.target.value)}
								placeholder="My Awesome Project"
								disabled={isSubmitting || loading}
								autoFocus
								required
								minLength={1}
								maxLength={100}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isSubmitting || loading}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={!projectName.trim() || isSubmitting || loading}
						>
							{(isSubmitting || loading) && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Create Project
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
