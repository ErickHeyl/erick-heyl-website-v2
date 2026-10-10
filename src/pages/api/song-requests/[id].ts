import type { APIRoute } from "astro";
import { deps } from "../../../lib/apiContext";
import { handleDelete, handlePatch } from "../../../lib/songRequestsApi";

export const prerender = false;

export const PATCH: APIRoute = async ({ request, params }) => handlePatch(request, params.id, await deps());

export const DELETE: APIRoute = async ({ request, params }) => handleDelete(request, params.id, await deps());
