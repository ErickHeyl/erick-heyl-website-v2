import type { APIRoute } from "astro";
import { deps, ipOf } from "../../../../lib/apiContext";
import { handleUpvote } from "../../../../lib/songRequestsApi";

export const prerender = false;

export const POST: APIRoute = async (ctx) => handleUpvote(ctx.params.id, ipOf(ctx), await deps());
