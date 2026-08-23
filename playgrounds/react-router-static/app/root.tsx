import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { LOCALES } from "~/shared/utils/locales";
import { ThemeToggle } from "~/components/theme-toggle";
import "./app.css";
import "virtual:localess-init";

export const links: Route.LinksFunction = () => [];

export function meta() {
  return [{ title: "React Router Playground" }];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="flex flex-col w-full gap-8 mx-auto max-w-5xl">
          <header className="flex items-center justify-center gap-4 py-8">
            <nav className="flex justify-center">
              <ul className="flex rounded-full bg-white/90 px-3 text-sm font-medium text-zinc-800 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10">
                {LOCALES.map(item => (
                  <li key={item.id}>
                    <a
                      className="relative block px-3 py-2 transition hover:text-teal-500 dark:hover:text-teal-400"
                      href={item.id ? "/" + item.id : "/"}
                      hrefLang={item.id}
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <ThemeToggle />
          </header>
          {children}
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
