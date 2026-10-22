import { isConfirmedAdmin } from "@/lib/admin/access";
import { getAdminOverview } from "@/lib/admin/data";
import { createClient } from "@/lib/supabase/server";

function cell(v: string | number | boolean | null) {
  const s = v === null ? "" : String(v);
  // Quote everything, and stop spreadsheet apps treating a value as a formula.
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  if (!(await isConfirmedAdmin(supabase))) return new Response("Not found", { status: 404 });
  const { users } = await getAdminOverview(Date.now());
  const header = ["Name", "Email", "Profile link", "City", "Joined", "Last login", "Signs in with", "Listed", "Has photo", "Posts", "Connections"];
  const rows = users.map((u) =>
    [u.name, u.email, u.handle ? `/${u.handle}` : null, u.city, u.joined, u.lastSeen, u.method, u.listed, u.hasPhoto, u.posts, u.connections]
      .map(cell)
      .join(","),
  );
  return new Response([header.map(cell).join(","), ...rows].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="peerpop-users.csv"',
      "cache-control": "no-store",
    },
  });
}
