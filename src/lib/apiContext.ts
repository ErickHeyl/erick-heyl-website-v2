import type { APIContext } from "astro";
import { party } from "../data/party";
import { getAdminToken } from "./env";
import { getRequestStore } from "./requestStore";
import { clientIp, type ApiDeps } from "./songRequestsApi";

export async function deps(): Promise<ApiDeps> {
  return { store: await getRequestStore(), adminToken: getAdminToken(), requestsOpen: party.requestsOpen };
}

export function ipOf(ctx: APIContext): string {
  let fallback: string | undefined;
  try {
    fallback = ctx.clientAddress;
  } catch {
    fallback = undefined;
  }
  return clientIp(ctx.request, fallback);
}
