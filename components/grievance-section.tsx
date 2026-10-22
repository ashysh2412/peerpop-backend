import { GRIEVANCE_OFFICER } from "@/lib/legal/grievance";

/** Contact for complaints, as India's IT Rules 2021 require. Shown on the Terms and Privacy pages. */
export function GrievanceSection() {
  return (
    <>
      <h2>Complaints and Grievance Officer</h2>
      <p>
        To report content or a creator, use &quot;Report or block&quot; on their profile or in your chat. For any other
        complaint, including about your data, write to our Grievance Officer, {GRIEVANCE_OFFICER.name}, at{" "}
        <a className="text-brand-ink" href={`mailto:${GRIEVANCE_OFFICER.email}`}>
          {GRIEVANCE_OFFICER.email}
        </a>
        . We acknowledge complaints within 24 hours and resolve them within 15 days. Content that is clearly illegal is
        removed within 36 hours of a valid order, and intimate images shared without consent within 24 hours of a report.
      </p>
    </>
  );
}
