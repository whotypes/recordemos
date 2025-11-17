import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/vibeapps')({
  server: {
    handlers: {
      GET: async () => {
        return redirect({
          href: 'https://vibeapps.dev/s/recorddemos',
          statusCode: 302,
        })
      },
    },
  },
})
