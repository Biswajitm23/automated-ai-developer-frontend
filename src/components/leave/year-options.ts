import type { SelectOption } from "@/components/ui/select";
import { currentYearInAppZone } from "@/lib/dates";

/** Years offered in year filters: current − 3 … current + 1 (docs/ui-design.md §8 Phase B). */
export const YEARS_BACK = 3;
export const YEARS_FORWARD = 1;

/** Newest first: [current + 1, current, …, current − 3]. */
export function yearList(current: number = currentYearInAppZone()): number[] {
  const years: number[] = [];
  for (let year = current + YEARS_FORWARD; year >= current - YEARS_BACK; year--) years.push(year);
  return years;
}

/**
 * Select options for a year filter. A `selected` year outside the default
 * range (e.g. from a shared URL) is added so the select can show it.
 */
export function yearSelectOptions(selected?: number, current: number = currentYearInAppZone()): SelectOption[] {
  const years = yearList(current);
  if (selected !== undefined && !years.includes(selected)) {
    years.push(selected);
    years.sort((a, b) => b - a);
  }
  return years.map((year) => ({ value: String(year), label: String(year) }));
}
