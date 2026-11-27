import type { SubmissionWindow } from "@/lib/domain/status";

export function windowLabel(w: SubmissionWindow): { short: string; long: string; open: boolean } {
  switch (w.state) {
    case "open":
      return { short: "Open", long: w.extended ? "Submissions are open (extended)" : "Submissions are open", open: true };
    case "not-yet-open":
      return { short: "Opening soon", long: "Submissions open soon", open: false };
    case "closed":
      return { short: "Closed", long: "Submissions are closed", open: false };
    default:
      return { short: "Not open yet", long: "Submissions are not open yet", open: false };
  }
}
