import { createFileRoute } from "@tanstack/react-router";
import { Journey } from "../components/archive/journey";
export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://as-salaam-recitations.higgsfield.app/" }],
  }),
  component: Journey,
});
