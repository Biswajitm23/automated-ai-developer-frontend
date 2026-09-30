import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * Every unmatched URL. Renders inside the root layout only (not the protected
 * shell), so it is a standalone card.
 */
export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="not-found-title" data-testid="page-not-found">
        <span className={styles.icon}>
          <Icon name="file-question" size={24} />
        </span>
        <p className={styles.code}>Error 404</p>
        <h1 id="not-found-title" className={styles.title}>
          Page not found
        </h1>
        <p className={styles.text}>
          The page you are looking for doesn&apos;t exist or has moved. Check the address, or
          go back to your dashboard.
        </p>
        <div className={styles.actions}>
          <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
          <Link href="/" className={styles.homeLink}>
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
