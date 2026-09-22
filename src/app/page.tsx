import BackendStatus from "./backend-status";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Employee Leave Management</h1>
      <p className={styles.muted}>Development scaffold</p>
      <BackendStatus />
    </main>
  );
}
