import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/github')({
  server: {
    handlers: {
      GET: async () => {
        return redirect({
          href: 'https://github.com/whotypes/recordemos',
          statusCode: 302,
        })
      },
    },
  },
})