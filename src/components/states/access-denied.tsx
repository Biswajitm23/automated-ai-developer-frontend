import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Shown in place (the URL stays) when the signed-in user's role may not see a
 * page, or when the API answers 403. Text, role and test ID are unchanged from
 * ELM-002.
 */
export function AccessDenied() {
  return (
    <EmptyState
      role="alert"
      data-testid="access-denied"
      tone="danger"
      icon="lock"
      title="Access denied"
      description="You do not have permission to view this page."
      action={
        <ButtonLink href="/dashboard" variant="secondary">
          Back to dashboard
        </ButtonLink>
      }
    />
  );
}
