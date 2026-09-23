import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./page-header.module.css";

export type Breadcrumb = { href: string; label: string };

export type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Buttons or links, right-aligned (wrap below on mobile). */
  actions?: ReactNode;
  /** Shown before the title on detail pages; the last crumb is the current page. */
  breadcrumbs?: Breadcrumb[];
  /** Extra line under the description (e.g. "Signed in as … · role"). */
  meta?: ReactNode;
};

/**
 * The page's only h1. The browser tab title comes from each page.tsx's
 * `metadata.title`, not from here.
 */
export function PageHeader({ title, description, actions, breadcrumbs, meta }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
          <ol role="list">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={crumb.href}>
                  {isLast ? (
                    <span aria-current="page">{crumb.label}</span>
                  ) : (
                    <>
                      <Link href={crumb.href}>{crumb.label}</Link>
                      <span className={styles.separator} aria-hidden="true">
                        /
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className={styles.row}>
        <div className={styles.text}>
          <h1 className={styles.title}>{title}</h1>
          {description && <div className={styles.description}>{description}</div>}
          {meta && <div className={styles.meta}>{meta}</div>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
