import { useEffect, useRef } from 'react';
import { Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { AlertIcon, Button, EmptyState, SearchIcon, buttonClasses } from './design';

// One string child: `${name} · 42 PeerConnect`, or the brand alone when
// `name` is absent. React hoists it into <head> and removes it on unmount,
// so each page owns its title and every transition ends with the right one.
// `web/index.html` keeps its static title as the fallback before the app
// mounts.
export function PageTitle({ name }: { name?: string }): React.JSX.Element {
  return <title>{name === undefined ? '42 PeerConnect' : `${name} · 42 PeerConnect`}</title>;
}

function SiteHeader(): React.JSX.Element {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3">
        <Link to="/" className="rounded-lg text-lg font-semibold text-ink focus-ring">
          42 PeerConnect
        </Link>
      </div>
    </header>
  );
}

function SiteFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 text-sm">
        <Link to="/privacy" className="rounded text-link underline underline-offset-2 focus-ring">
          Privacy Policy
        </Link>
        <Link to="/terms" className="rounded text-link underline underline-offset-2 focus-ring">
          Terms of Service
        </Link>
      </div>
    </footer>
  );
}

function SkipLink(): React.JSX.Element {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-link focus-ring"
    >
      Skip to main content
    </a>
  );
}

// The footer sits at the bottom on short pages: the frame is a full-height
// column and the main grows. The dynamic viewport unit keeps it there on
// mobile browsers whose toolbar shrinks the visible viewport.
function ShellFrame({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-canvas text-ink">
      <SkipLink />
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

export function RootLayout(): React.JSX.Element {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);

  // On a client-side navigation that changes the pathname, move focus to
  // the main so keyboard and screen-reader users land on the new page.
  // Search-param changes and the first load keep focus where it is.
  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <ShellFrame>
      <main id="main-content" ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <Outlet />
        </div>
      </main>
    </ShellFrame>
  );
}

export function NotFoundPage(): React.JSX.Element {
  return (
    <>
      <PageTitle name="Page not found" />
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon={<SearchIcon size={24} />}
        title="This page does not exist."
        description="Check that the address is right, or go back home."
        action={
          <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
            Back to home
          </Link>
        }
      />
    </>
  );
}

// A short human message only: never a stack or the raw server text.
export function ErrorContent({ reset }: ErrorComponentProps): React.JSX.Element {
  const router = useRouter();

  return (
    <>
      <PageTitle name="Something went wrong" />
      <h1 className="sr-only">Something went wrong</h1>
      <EmptyState
        icon={<AlertIcon size={24} />}
        title="This page could not be shown."
        description="Try again in a moment."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            Try again
          </Button>
        }
      />
    </>
  );
}

// An error in the root route itself renders instead of the layout, so it
// brings its own shell frame around the same content.
export function RootErrorPage(props: ErrorComponentProps): React.JSX.Element {
  return (
    <ShellFrame>
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <ErrorContent {...props} />
        </div>
      </main>
    </ShellFrame>
  );
}
