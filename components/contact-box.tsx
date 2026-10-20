import { Mail, MessageCircle, StickyNote } from "lucide-react";
import type { Contacts } from "@/lib/profile/types";

/** Contact details, shown once two creators are connected or a collab interest is accepted. */
export function ContactBox({ name, contact }: { name: string; contact: Contacts }) {
  return (
    <section className="card flex flex-col gap-3 border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
      <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Contact {name}</h2>
      <div className="flex flex-wrap gap-2">
        {contact.contact_whatsapp && (
          <a
            href={`https://wa.me/${contact.contact_whatsapp.replace("+", "")}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <MessageCircle size={15} /> WhatsApp {contact.contact_whatsapp}
          </a>
        )}
        {contact.contact_email && (
          <a href={`mailto:${contact.contact_email}`} className="btn-secondary btn-sm">
            <Mail size={15} /> {contact.contact_email}
          </a>
        )}
      </div>
      {contact.contact_note && (
        <p className="flex gap-2 text-sm text-emerald-900 dark:text-emerald-100">
          <StickyNote size={15} className="mt-0.5 shrink-0" /> {contact.contact_note}
        </p>
      )}
    </section>
  );
}
