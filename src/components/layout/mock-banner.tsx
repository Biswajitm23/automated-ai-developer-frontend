import { MOCK_API_ENABLED } from "@/lib/services/mock-flag";
import { Icon } from "@/components/ui/icons";
import styles from "./app-shell.module.css";

/** Dev-only notice that some screens show fictional mock data. */
export function MockBanner() {
  if (!MOCK_API_ENABLED) return null;
  return (
    <div className={styles.mockBanner} role="note" data-testid="mock-banner">
      <Icon name="info" size={16} />
      <p>
        Development data: some screens use the mock API (NEXT_PUBLIC_USE_MOCK_API=true).
      </p>
    </div>
  );
}
