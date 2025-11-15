import { SignInComponent } from '@/components/ui/sign-in'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sign-in/$')({
  component: Page,
})

function Page() {
  return <SignInComponent />
}