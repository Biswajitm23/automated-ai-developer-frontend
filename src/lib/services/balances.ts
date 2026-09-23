import { request } from "./http";
import { toQueryString } from "./query";
import type { MyBalances } from "./types";

/** GET /api/me/balances/?year= (employee). Omit `year` for the current Kolkata year. */
export function getMyBalances(year?: number, signal?: AbortSignal): Promise<MyBalances> {
  return request<MyBalances>("myBalances", `/api/me/balances/${toQueryString({ year })}`, { signal });
}
