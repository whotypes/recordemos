// src/server.ts
import { auth } from '@clerk/tanstack-react-start/server'
import {
	createStartHandler,
	defaultStreamHandler,
	defineHandlerCallback,
} from '@tanstack/react-start/server'
import { createServerEntry } from '@tanstack/react-start/server-entry'

type MyRequestContext = {
	clerkUserId?: string
}

declare module '@tanstack/react-start' {
  interface Register {
    server: {
      requestContext: MyRequestContext
    }
  }
}

const customHandler = defineHandlerCallback(async (ctx) => {

	const authResult = await auth()

	console.log({ authResult })

  return defaultStreamHandler(ctx)
})

const fetch = createStartHandler<MyRequestContext>(customHandler)

export default createServerEntry({
  fetch,
})