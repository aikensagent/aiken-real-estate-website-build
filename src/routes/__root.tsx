import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import PostHogProvider from '../integrations/posthog/provider'
import { SiteFooter, SITE_HOME_DESCRIPTION, SITE_HOME_TITLE } from '../components/SiteFooter'

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
        title: SITE_HOME_TITLE,
      },
      {
        name: 'description',
        content: SITE_HOME_DESCRIPTION,
      },
      {
        property: 'og:title',
        content: SITE_HOME_TITLE,
      },
      {
        property: 'og:description',
        content: SITE_HOME_DESCRIPTION,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary',
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
    <>
      <main
        id="main-content"
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
      <SiteFooter />
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand-gold focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-navy"
        >
          Skip to content
        </a>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Scripts />
      </body>
    </html>
  )
}
