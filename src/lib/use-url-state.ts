"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * Typed URL query state for filters and pagination (docs/ui-design.md §5.2).
 * Components using this must sit inside a <Suspense> boundary, because
 * useSearchParams() opts the tree below it out of prerendering.
 */

export type UrlParam<T> = {
  /** Turns the raw value (null when absent) into a valid value; invalid input gives the default. */
  parse: (raw: string | null) => T;
  /** Returns null to remove the key (e.g. for the default value). */
  serialize: (value: T) => string | null;
};

export type UrlSchema = Record<string, UrlParam<unknown>>;
export type UrlValues<S extends UrlSchema> = { [K in keyof S]: S[K] extends UrlParam<infer T> ? T : never };

export const urlParam = {
  /** Free text, trimmed. Empty means absent. */
  string(defaultValue = ""): UrlParam<string> {
    return {
      parse: (raw) => (raw ?? "").trim() || defaultValue,
      serialize: (value) => (value && value !== defaultValue ? value : null),
    };
  },

  /** One of `values`; anything else is ignored (gives the default). */
  enum<const V extends string, D extends V | undefined = undefined>(
    values: readonly V[],
    defaultValue?: D,
  ): UrlParam<V | D> {
    return {
      parse: (raw) => (raw !== null && (values as readonly string[]).includes(raw) ? (raw as V) : (defaultValue as D)),
      serialize: (value) => (value === undefined || value === defaultValue ? null : value),
    };
  },

  /** Integer clamped to [min, max]; non-numbers give the default. */
  int(options: { min?: number; max?: number; defaultValue: number }): UrlParam<number> {
    const { min = -Infinity, max = Infinity, defaultValue } = options;
    return {
      parse: (raw) => {
        if (raw === null || !/^-?\d+$/.test(raw)) return defaultValue;
        return Math.min(max, Math.max(min, Number(raw)));
      },
      serialize: (value) => (value === defaultValue ? null : String(value)),
    };
  },

  /** Optional positive integer id (e.g. ?employee=12); invalid gives undefined. */
  id(): UrlParam<number | undefined> {
    return {
      parse: (raw) => (raw !== null && /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : undefined),
      serialize: (value) => (value === undefined ? null : String(value)),
    };
  },

  /** Page number, ≥ 1, default 1. */
  page(): UrlParam<number> {
    return urlParam.int({ min: 1, defaultValue: 1 });
  },

  /** Year in 2000–2100 (out-of-range values are clamped). */
  year(defaultValue: number): UrlParam<number> {
    return urlParam.int({ min: 2000, max: 2100, defaultValue });
  },

  /** Optional "YYYY-MM-DD"; anything else gives undefined. */
  isoDate(): UrlParam<string | undefined> {
    return {
      parse: (raw) => (raw !== null && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined),
      serialize: (value) => value ?? null,
    };
  },
};

export type SetUrlState<S extends UrlSchema> = (patch: Partial<UrlValues<S>>) => void;

/**
 * Reads typed values from the URL and writes changes with router.replace
 * (no scroll). Changing any key other than `page` resets `page` to 1 (the key
 * is removed), so a filter change never lands on an empty page.
 */
export function useUrlState<S extends UrlSchema>(schema: S): [UrlValues<S>, SetUrlState<S>] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const [key, param] of Object.entries(schema)) result[key] = param.parse(searchParams.get(key));
    return result as UrlValues<S>;
  }, [schema, searchParams]);

  const setValues = useCallback<SetUrlState<S>>(
    (patch) => {
      const next = new URLSearchParams(searchParams.toString());
      const keys = Object.keys(patch);
      for (const key of keys) {
        const param = schema[key];
        if (!param) continue;
        const serialized = param.serialize((patch as Record<string, unknown>)[key]);
        if (serialized === null || serialized === "") next.delete(key);
        else next.set(key, serialized);
      }
      if (keys.some((key) => key !== "page") && !keys.includes("page")) next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, schema],
  );

  return [values, setValues];
}
