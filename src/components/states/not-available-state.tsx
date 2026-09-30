import { EmptyState } from "@/components/ui/empty-state";

type NotAvailableStateProps = {
  /** e.g. "Leave balances" (from ENDPOINTS[group].feature). Not shown to users. */
  feature: string;
  /** e.g. "ELM-006" (from ENDPOINTS[group].card). Not shown to users. */
  card?: string;
  headingLevel?: 2 | 3;
};

/**
 * The backend does not provide this endpoint yet and the dev mock is off.
 * Shown as a plain empty state: the owner asked for no "not released yet",
 * server or card-number wording in the product (2026-09-23).
 */
export function NotAvailableState({ feature, card, headingLevel = 2 }: NotAvailableStateProps) {
  return (
    <EmptyState
      data-testid="not-available"
      data-feature={feature}
      data-card={card}
      headingLevel={headingLevel}
      title="Nothing to show yet"
    />
  );
}
