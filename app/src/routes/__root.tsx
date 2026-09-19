import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import archiveCss from "../archive.css?url";
import cinematicCss from "../cinematic.css?url";
import meta from "../app-meta.json";
import { PlayerProvider } from "../components/archive/player";
import { Header, Footer } from "../components/archive/shell";
declare const __HF_DESIGN_INSPECTOR__: boolean;
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "As-Salaam Institute — Qur'an Recitations" },
      {
        name: "description",
        content:
          "A dedicated space for Qur'an recitations. Discover all 114 Surahs and listen at your own pace.",
      },
      { property: "og:title", content: meta.og_title || "As-Salaam Institute" },
      { property: "og:image", content: meta.og_image_url || "" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: archiveCss },
      { rel: "stylesheet", href: cinematicCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&family=Noto+Naskh+Arabic:wght@400;500&display=swap",
      },
      ...(meta.favicon_url ? [{ rel: "icon", href: meta.favicon_url }] : []),
    ],
  }),
  shellComponent: ({ children }: { children: ReactNode }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  ),
  component: Root,
  notFoundComponent: () => (
    <main id="main" className="page empty">
      <h1>Page not found.</h1>
      <a href="/surahs">Explore all Surahs →</a>
    </main>
  ),
  errorComponent: () => (
    <main id="main" className="page empty">
      <h1>This page couldn’t load.</h1>
      <p>Please try refreshing the page.</p>
      <a href="/">Return home →</a>
    </main>
  ),
});
function Root() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if (__HF_DESIGN_INSPECTOR__)
      void import("../module/design-inspector/runtime")
        .then((m) => m.installHiggsfieldDesignInspector())
        .catch(() => {});
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        <Header />
        <Outlet />
        <Footer />
      </PlayerProvider>
    </QueryClientProvider>
  );
}
