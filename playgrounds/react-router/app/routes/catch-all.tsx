import { getLocalessClient, LocalessApiError, LocalessDocument } from "@localess/react";
import type { Content } from "@localess/react";
import { resolveLocaleAndSlug } from "~/shared/utils/route";
import type { Page } from "~/shared/models/localess";
import type { Route } from "./+types/catch-all";

export async function loader({ params }: Route.LoaderArgs) {
  console.log('loader', params)
  const { locale, slug } = resolveLocaleAndSlug(params["*"]);
  let document: Content<Page> | null;
  try {
    document = await getLocalessClient().getContentBySlug<Page>(slug, { locale });
  } catch (error) {
    if (error instanceof LocalessApiError && error.status === 404) {
      document = null;
    } else {
      throw error;
    }
  }
  if (!document) {
    throw new Response("Not Found", { status: 404 });
  }
  return { document };
}

export default function CatchAllPage({ loaderData }: Route.ComponentProps) {
  return <LocalessDocument document={loaderData.document} />;
}
