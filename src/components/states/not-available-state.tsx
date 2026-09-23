import { EmptyState } from "@/components/ui/empty-state";

type NotAvailableStateProps = {
  /** e.g. "Leave balances" (from ENDPOINTS[group].feature). */
  feature: string;
  /** e.g. "ELM-006" (from ENDPOINTS[group].card). */
  card?: string;
  headingLevel?: 2 | 3;
};

/** The backend does not provide this endpoint yet and the dev mock is off. */
export function NotAvailableState({ feature, card, headingLevel = 2 }: NotAvailableStateProps) {
  return (
    <EmptyState
      data-testid="not-available"
      tone="info"
      icon="info"
      headingLevel={headingLevel}
      title={`${feature} isn't available yet`}
      description={
        <>
          The server doesn&apos;t provide this yet{card ? ` (${card})` : ""}. It will appear here
          once the backend is released.
        </>
      }
    />
  );
}
