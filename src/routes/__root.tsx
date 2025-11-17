import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { ClerkProvider } from "@clerk/tanstack-react-start";
import * as Sentry from "@sentry/tanstackstart-react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	CatchBoundary,
	createRootRouteWithContext,
	DefaultGlobalNotFound,
	HeadContent,
	Outlet,
	Scripts,
	useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import React from "react";

import { AutumnProviderComponent } from "@/components/autumn/autumn-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@clerk/tanstack-react-start/server";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { createServerFn } from "@tanstack/react-start";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import appCss from "../styles.css?url";

const fetchClerkAuth = createServerFn({ method: 'GET' }).handler(async () => {
	const authResult = await auth()

	if (!authResult.isAuthenticated || !authResult.userId) {
		return {
			userId: undefined,
			token: undefined,
		}
	}

	const token = await authResult.getToken({ template: 'convex' })

	return {
		userId: authResult.userId,
		token,
	}
})

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
	convexClient: ConvexReactClient;
	convexQueryClient: ConvexQueryClient;
}>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "description", content: "An intuitive, powerful, and open source video editor for all your product demos." },
			{ name: "title", content: "Record Demos | A browser-based video editor" },
			{ property: 'og:title', content: 'Record Demos | A browser-based video editor' },
			{ property: 'og:description', content: 'An intuitive, powerful, and open source video editor for all your product demos.' },
			{ property: 'og:image', content: 'https://recorddemos.com/og.webp' },
			{ property: 'og:url', content: 'https://recorddemos.com' },
			{ property: 'og:type', content: 'website' },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:title', content: 'Record Demos | A browser-based video editor' },
			{ name: 'twitter:description', content: 'An intuitive, powerful, and open source video editor for all your product demos.' },
			{ name: 'twitter:image', content: 'https://recorddemos.com/og.webp' },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/rd_logo.png", type: "image/png", sizes: "16x16" },
		],
	}),
	shellComponent: RootComponent,
	notFoundComponent: () => <DefaultGlobalNotFound />,
	beforeLoad: async (ctx) => {
		const authData = await fetchClerkAuth()
		const { userId, token } = authData

		// During SSR only (the only time serverHttpClient exists),
		// set the Clerk auth token to make HTTP queries with.
		if (token) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(token)
		}

		return {
			userId,
			token,
		}
	},
	errorComponent: (props) => {
		Sentry.captureException(props.error);
		return (
			<RootDocument>
				<CatchBoundary
					getResetKey={() => 'reset'}
					onCatch={(error) => console.error(error)}
				>
					<div>Error: {props.error.message}</div>
				</CatchBoundary>
			</RootDocument>
		)
	},
});

function RootComponent() {
	const context = useRouteContext({ from: Route.id })

	// Use the ConvexQueryClient's internal client, not the separate convexClient
	const convexClientForAuth = context.convexQueryClient.convexClient

	return (
		<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
			<ConvexProviderWithClerk client={convexClientForAuth} useAuth={useClerkAuth}>
				<AutumnProviderComponent>
					<RootDocument>
						<Outlet />
					</RootDocument>
				</AutumnProviderComponent>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	)
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider defaultTheme="system">
					{/* <Navbar /> */}
					{children}
					<Toaster />
					<TanStackDevtools
						config={{
							position: "bottom-right",
							hideUntilHover: true,
							openHotkey: ["mod+shift+t"],
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
					<Scripts />
				</ThemeProvider>
			</body>
		</html>
	);
}
