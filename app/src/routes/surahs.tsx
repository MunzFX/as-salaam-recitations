import { createFileRoute } from "@tanstack/react-router";
import { Library } from "../components/archive/library";
export const Route = createFileRoute("/surahs")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({
    meta: [{ title: "Surah Library | As-Salaam Institute" }],
    links: [{ rel: "canonical", href: "https://as-salaam-recitations.higgsfield.app/surahs" }],
  }),
  component: SurahLibrary,
});
function SurahLibrary() {
  const { q } = Route.useSearch();
  return <Library initialQuery={q} />;
}
