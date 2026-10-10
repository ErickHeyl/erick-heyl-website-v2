import type { APIRoute } from "astro";
import { handleSearch } from "../../../lib/songRequestsApi";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => handleSearch(request, {});
