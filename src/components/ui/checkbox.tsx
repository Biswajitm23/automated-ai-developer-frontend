import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import styles from "./checkbox.module.css";

export type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "type" | "id"> & {
  id?: string;
  label: ReactNode;
};

/** Native checkbox with a brand-styled box and a clickable label. */
export function Checkbox({ id, label, className, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={[styles.checkbox, className].filter(Boolean).join(" ")}>
      <input {...props} id={inputId} type="checkbox" className={styles.input} />
      <span className={styles.label}>{label}</span>
    </label>
  );
}
