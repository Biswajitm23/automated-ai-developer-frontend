import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type NotFoundPanelProps = {
  /** Noun for the missing record, e.g. "leave request". */
  what: string;
  backHref: string;
  backLabel: string;
  /** Overrides the default "It may not exist, or it isn't yours." text. */
  description?: string;
};

/**
 * In-shell 404 for a missing record (or one the caller may not see: the API
 * answers 404 for other people's requests, so existence does not leak).
 */
export function NotFoundPanel({ what, backHref, backLabel, description }: NotFoundPanelProps) {
  return (
    <EmptyState
      data-testid="not-found"
      icon="file-question"
      title={`${what.charAt(0).toUpperCase()}${what.slice(1)} not found`}
      description={description ?? `We couldn't find this ${what}. It may not exist, or it isn't yours.`}
      action={
        <ButtonLink href={backHref} variant="secondary">
          {backLabel}
        </ButtonLink>
      }
    />
  );
}
