import type { ReactNode } from "react";
import { BrandLogo } from "./brand-logo";
import styles from "./auth-page.module.css";

export type AuthPageProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Shown under the card, e.g. a "Back to sign in" link. */
  footer?: ReactNode;
  /** Extra class on the page, e.g. to recolour one page. */
  className?: string;
};

/** Centred brand + card layout shared by the sign-in and forgot-password pages. */
export function AuthPage({ title, description, children, footer, className }: AuthPageProps) {
  return (
    <main className={className ? `${styles.page} ${className}` : styles.page}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <BrandLogo product="Employee Leave Management" />
        </div>
        <section className={styles.card} aria-labelledby="auth-title">
          <div className={styles.intro}>
            <h1 id="auth-title" className={styles.title}>
              {title}
            </h1>
            {description && <p className={styles.muted}>{description}</p>}
          </div>
          {children}
        </section>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </main>
  );
}
