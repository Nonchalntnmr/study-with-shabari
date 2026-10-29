import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";
import { revokeUserSessions, setUserRole } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionForm } from "../_components/action-form";
import { Empty, PageHeader, formatDate, selectClass } from "../_components/ui";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireAdmin();
  const q = ((await searchParams).q ?? "").trim().slice(0, 100).toLowerCase();
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q } }, { name: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { attempts: true, sessions: true } },
    },
  });

  return (
    <>
      <PageHeader title="Users" description="Role changes sign the person out of other devices. You can't remove your own admin access, and there is always at least one admin." />
      <form className="mb-4 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search users</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search by name or email" className="h-8 w-72 max-w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
        <Button type="submit" size="sm" variant="outline">Search</Button>
      </form>

      {users.length === 0 ? (
        <Empty>No users match.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">{u.name ?? "—"} {u.id === me.id && <Badge variant="secondary">you</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-sm">{formatDate(u.lastLoginAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{u._count.attempts}</TableCell>
                  <TableCell>
                    <ActionForm action={setUserRole}>
                      <input type="hidden" name="id" value={u.id} />
                      <label className="sr-only" htmlFor={`r-${u.id}`}>Role</label>
                      <select id={`r-${u.id}`} name="role" defaultValue={u.role} className={selectClass}>
                        <option value="STUDENT">student</option>
                        <option value="ADMIN">admin</option>
                      </select>
                      <Button type="submit" size="sm" variant="outline">Set</Button>
                    </ActionForm>
                  </TableCell>
                  <TableCell>
                    <ActionForm action={revokeUserSessions}>
                      <input type="hidden" name="id" value={u.id} />
                      <span className="text-xs text-muted-foreground">{u._count.sessions} active</span>
                      <Button type="submit" size="sm" variant="ghost">Sign out</Button>
                    </ActionForm>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
