/**
 * Which backend endpoint groups exist yet. Flip `available` to true in the
 * card that ships the endpoint: the real API then always wins, even when the
 * mock flag is on. While false, calls go to the dev mock (if enabled) or fail
 * with NotAvailableError, which pages show as "not available yet".
 */

export type EndpointGroup =
  | "leaveTypes"
  | "myBalances"
  | "myRequests"
  | "cancelRequest"
  | "adminSummary"
  | "adminEmployees"
  | "adminAllowances"
  | "adminRequests"
  | "adminDecisions";

export type EndpointInfo = { available: boolean; card: string; feature: string };

export const ENDPOINTS: Record<EndpointGroup, EndpointInfo> = {
  leaveTypes: { available: false, card: "ELM-003", feature: "Leave types" },
  adminEmployees: { available: false, card: "ELM-003", feature: "Employee management" },
  adminAllowances: { available: false, card: "ELM-003", feature: "Allowance management" },
  myBalances: { available: false, card: "ELM-006", feature: "Leave balances" },
  myRequests: { available: false, card: "ELM-005/006", feature: "Leave requests" },
  cancelRequest: { available: false, card: "ELM-008", feature: "Cancelling requests" },
  adminDecisions: { available: false, card: "ELM-007", feature: "Approvals" },
  adminRequests: { available: false, card: "ELM-009", feature: "All leave requests" },
  adminSummary: { available: false, card: "ELM-009", feature: "Admin dashboard" },
};
