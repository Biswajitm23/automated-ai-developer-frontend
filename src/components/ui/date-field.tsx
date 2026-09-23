"use client";

import type { ISODate } from "@/lib/services/types";
import { TextField, type TextFieldProps } from "./text-field";

export type DateFieldProps = Omit<TextFieldProps, "type" | "min" | "max"> & {
  min?: ISODate;
  max?: ISODate;
};

/**
 * Native <input type="date">. The value is always ISO "YYYY-MM-DD". Without a
 * custom hint, the hint names the format for browsers that fall back to text.
 */
export function DateField({ hint, ...props }: DateFieldProps) {
  return <TextField {...props} type="date" hint={hint ?? "Format: YYYY-MM-DD"} />;
}
