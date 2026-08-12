import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import PostHogProvider from '../integrations/posthog/provider'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Find your place in Aiken | Nick Williams',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
})

function NotFoundPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-brand-cream px-6 py-16"
      aria-labelledby="not-found-heading"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-gold">
        404
      </p>
      <h1
        id="not-found-heading"
        className="mt-3 text-center text-3xl font-semibold tracking-tight text-brand-navy sm:text-4xl"
      >
        This page isn’t on the map.
      </h1>
      <p className="mt-4 max-w-md text-center text-brand-slate">
        That address doesn’t exist here. Head back to search homes in Aiken.
      </p>
      <Link
        to="/"
        aria-label="Back to home search"
        className="mt-8 inline-flex rounded-lg border-2 border-brand-gold bg-brand-navy px-5 py-2.5 text-sm font-semibold text-brand-cream transition hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream"
      >
        Back to search
      </Link>
    </main>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Scripts />
      </body>
    </html>
  )
}
