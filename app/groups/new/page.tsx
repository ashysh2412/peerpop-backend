import type { Metadata } from "next";
import { GroupForm } from "./group-form";

export const metadata: Metadata = { title: "Start a group · Peerpop" };

export default function NewGroupPage() {
  return (
    <main className="page-narrow flex flex-col gap-6">
      <div>
        <h1 className="page-title">Start a group</h1>
        <p className="mt-1 text-muted">A place for creators to share work, ask questions and find collabs together.</p>
      </div>
      <div className="card p-5 sm:p-7">
        <GroupForm />
      </div>
    </main>
  );
}
