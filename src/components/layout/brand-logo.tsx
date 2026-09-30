import Image from "next/image";
import styles from "./brand-logo.module.css";

type BrandLogoProps = {
  /** Product name shown after the company logo. */
  product?: string;
  size?: "sm" | "md";
  /** "stacked" puts the product name under the logo (narrow sidebar). */
  layout?: "inline" | "stacked";
};

/** Bitpastel logo, a divider, and the product name (docs/ui-design.md §3). */
export function BrandLogo({
  product = "Leave Management",
  size = "md",
  layout = "inline",
}: BrandLogoProps) {
  const height = size === "sm" ? 22 : 28;
  return (
    <span className={`${styles.lockup} ${styles[size]} ${styles[layout]}`}>
      <Image
        src="/brand/bitpastel-logo.svg"
        alt="Bitpastel"
        width={Math.round((101 / 28) * height)}
        height={height}
        className={styles.logo}
        unoptimized
        priority
      />
      <span className={styles.divider} aria-hidden="true" />
      <span className={styles.product}>{product}</span>
    </span>
  );
}
