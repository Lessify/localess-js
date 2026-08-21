import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/catch-all.tsx", { id: "catch-all-index" }),
  route("*", "routes/catch-all.tsx", { id: "catch-all-splat" }),
] satisfies RouteConfig;
