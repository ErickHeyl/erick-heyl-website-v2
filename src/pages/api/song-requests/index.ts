import type { APIRoute } from "astro";
import { deps, ipOf } from "../../../lib/apiContext";
import { handleCreate, handleList } from "../../../lib/songRequestsApi";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => handleList(request, await deps());

export const POST: APIRoute = async (ctx) => handleCreate(ctx.request, ipOf(ctx), await deps());
