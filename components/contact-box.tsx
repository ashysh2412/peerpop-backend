import type { Contacts } from "@/lib/profile/types";

/** Contact details, shown once two creators are connected or a collab interest is accepted. */
export function ContactBox({ name, contact }: { name: string; contact: Contacts }) {
  return (
    <section className="flex flex-col gap-1 rounded-xl bg-green-50 p-4 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
      <h2 className="font-medium">Contact {name}</h2>
      {contact.contact_email && (
        <a href={`mailto:${contact.contact_email}`} className="underline">
          {contact.contact_email}
        </a>
      )}
      {contact.contact_whatsapp && (
        <a href={`https://wa.me/${contact.contact_whatsapp.replace("+", "")}`} target="_blank" rel="noreferrer" className="underline">
          WhatsApp {contact.contact_whatsapp}
        </a>
      )}
      {contact.contact_note && <p>{contact.contact_note}</p>}
    </section>
  );
}
