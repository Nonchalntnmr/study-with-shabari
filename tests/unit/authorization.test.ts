import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Static authorization guard. Reads the source, so a new Server Action or route handler can't
// ship without someone deciding who may call it:
//   - every Server Action is an admin action unless it's listed in NOT_ADMIN below, and an admin
//     action's first statement must be `await requireAdmin()`;
//   - every route handler must be listed in ROUTES as public by design, behind the cron bearer
//     token, or checking the session (and, if it reads the database itself, only after that).

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");

/** Server Actions that are not admin actions, with the guard each must start with. */
const NOT_ADMIN: Record<string, { guard: "requireUser" | "public"; why: string }> = {
  "src/lib/auth/actions.ts#signUp": { guard: "public", why: "creates a student account; rate limited" },
  "src/lib/auth/actions.ts#signIn": { guard: "public", why: "rate limited" },
  "src/lib/auth/actions.ts#signOut": { guard: "public", why: "ends the caller's own session" },
  "src/lib/auth/actions.ts#updateProfile": { guard: "requireUser", why: "the caller's own profile" },
  "src/lib/auth/actions.ts#deleteAccount": { guard: "requireUser", why: "the caller's own account" },
  "src/lib/auth/actions.ts#clearGuestHistory": { guard: "public", why: "deletes only rows keyed to the caller's guest cookie" },
  "src/lib/auth/actions.ts#changePassword": { guard: "requireUser", why: "the caller's own password" },
  "src/lib/auth/actions.ts#requestPasswordReset": { guard: "public", why: "rate limited; never reveals whether an account exists" },
  "src/lib/auth/actions.ts#resetPassword": { guard: "public", why: "needs a valid single-use reset token" },
  "src/lib/dashboard-actions.ts#toggleSavedResource": { guard: "requireUser", why: "the caller's own saved list" },
  "src/lib/inquiries/actions.ts#submitInquiry": { guard: "public", why: "the contact form; rate limited" },
  "src/lib/lessons/actions.ts#startLesson": { guard: "public", why: "a guest or student attempt of a published lesson" },
  "src/lib/lessons/actions.ts#answerStep": { guard: "public", why: "the caller's own attempt, ownership checked in the service" },
  "src/lib/practice/actions.ts#startPractice": { guard: "public", why: "a guest or student attempt of a published set" },
  "src/lib/practice/actions.ts#retestMissed": { guard: "public", why: "the caller's own attempt, ownership checked in the service" },
};

type RoutePolicy = { kind: "public"; why: string } | { kind: "bearer"; why: string } | { kind: "session"; why: string };

/** Every route handler file under src/app, by path. */
const ROUTES: Record<string, RoutePolicy> = {
  "src/app/api/health/route.ts": { kind: "public", why: "liveness and a database round trip; returns no data" },
  "src/app/api/cron/retention/route.ts": { kind: "bearer", why: "Vercel Cron, Authorization: Bearer $CRON_SECRET" },
  "src/app/api/assets/[id]/route.ts": { kind: "public", why: "question figures stored locally in development; production serves them from Supabase Storage" },
  "src/app/api/account/export/route.ts": { kind: "session", why: "the signed-in user's own data" },
  "src/app/api/attempts/[id]/sync/route.ts": { kind: "session", why: "autosave of the caller's own attempt (guest key or account)" },
  "src/app/api/attempts/[id]/submit/route.ts": { kind: "session", why: "submit of the caller's own attempt (guest key or account)" },
};

const SESSION_CALLS = ["getCurrentUser", "requireUser", "requireAdmin", "getAdminOrNull", "getViewer"];
const HTTP_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "generated" ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join("/");
const parse = (file: string) => ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const isExported = (n: ts.Node) => ts.canHaveModifiers(n) && (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
const isAsync = (n: ts.Node) => ts.canHaveModifiers(n) && (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
const hasUseServer = (body: ts.Block | ts.SourceFile) =>
  body.statements.some((s, i) => i < 3 && ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression) && s.expression.text === "use server");

type Fn = { name: string; body: ts.Block | undefined; async: boolean };

/** Exported functions of a module: declarations and `export const x = async (...) => {}`. */
function exportedFunctions(sf: ts.SourceFile): { fns: Fn[]; problems: string[] } {
  const fns: Fn[] = [];
  const problems: string[] = [];
  for (const s of sf.statements) {
    if (ts.isFunctionDeclaration(s) && isExported(s) && s.name) {
      fns.push({ name: s.name.text, body: s.body, async: isAsync(s) });
    } else if (ts.isVariableStatement(s) && isExported(s)) {
      for (const d of s.declarationList.declarations) {
        const init = d.initializer;
        if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && ts.isIdentifier(d.name)) {
          fns.push({ name: d.name.text, body: ts.isBlock(init.body) ? init.body : undefined, async: isAsync(init) });
        } else {
          problems.push(`${d.name.getText(sf)}: exported value that isn't a function`);
        }
      }
    } else if (ts.isExportDeclaration(s) && !s.isTypeOnly) {
      problems.push(`re-export "${s.getText(sf)}": list the function here instead so it can be checked`);
    } else if (ts.isExportAssignment(s)) {
      problems.push("default export");
    }
  }
  return { fns, problems };
}

/** True when the statement is `await f()` or `const x = await f()` for one of `names`. */
function awaitsCall(s: ts.Statement | undefined, names: string[]): boolean {
  if (!s) return false;
  let expr: ts.Expression | undefined;
  if (ts.isExpressionStatement(s)) expr = s.expression;
  else if (ts.isVariableStatement(s) && s.declarationList.declarations.length === 1) expr = s.declarationList.declarations[0].initializer;
  if (!expr || !ts.isAwaitExpression(expr) || !ts.isCallExpression(expr.expression)) return false;
  const callee = expr.expression.expression;
  return ts.isIdentifier(callee) && names.includes(callee.text);
}

function serverActions() {
  const actions: { id: string; file: string; fn: Fn }[] = [];
  const problems: string[] = [];
  for (const file of walk(SRC)) {
    const sf = parse(file);
    if (hasUseServer(sf)) {
      const { fns, problems: p } = exportedFunctions(sf);
      problems.push(...p.map((x) => `${rel(file)}: ${x}`));
      for (const fn of fns) actions.push({ id: `${rel(file)}#${fn.name}`, file: rel(file), fn });
    }
    // Inline actions ("use server" inside a function body) aren't covered by the rules above.
    const visit = (n: ts.Node) => {
      if ((ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n)) && n.body && ts.isBlock(n.body) && hasUseServer(n.body)) {
        problems.push(`${rel(file)}: inline "use server" function; move it into a "use server" module`);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return { actions, problems };
}

describe("Server Action authorization (static)", () => {
  const { actions, problems } = serverActions();
  const admin = actions.filter((a) => !NOT_ADMIN[a.id]);

  it("finds every Server Action, and nothing it can't check", () => {
    expect(problems).toEqual([]);
    // 28 admin actions at the October 2026 audit, plus the lesson draft preview.
    expect(admin.length).toBeGreaterThanOrEqual(29);
    for (const a of actions) expect(a.fn.async, `${a.id} must be async`).toBe(true);
    // Every listed exception still exists, so the list can't go stale.
    const ids = new Set(actions.map((a) => a.id));
    expect(Object.keys(NOT_ADMIN).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("calls requireAdmin() before anything else in every admin action", () => {
    const missing = admin.filter((a) => !awaitsCall(a.fn.body?.statements[0], ["requireAdmin"])).map((a) => a.id);
    expect(missing).toEqual([]);
  });

  it("never exempts an action that lives in the admin modules", () => {
    const exempt = Object.keys(NOT_ADMIN).filter((id) => id.startsWith("src/lib/admin/") || id.startsWith("src/app/admin/"));
    expect(exempt).toEqual([]);
    expect(admin.filter((a) => a.file.startsWith("src/lib/admin/")).length).toBeGreaterThanOrEqual(28);
  });

  it("starts signed-in-only actions with requireUser()", () => {
    const missing = actions
      .filter((a) => NOT_ADMIN[a.id]?.guard === "requireUser")
      .filter((a) => !awaitsCall(a.fn.body?.statements[0], ["requireUser"]))
      .map((a) => a.id);
    expect(missing).toEqual([]);
  });
});

describe("route handler authorization (static)", () => {
  const files = walk(path.join(SRC, "app")).filter((f) => /\/route\.tsx?$/.test(f));

  it("lists every route handler with who may call it", () => {
    expect(files.map(rel).filter((f) => !ROUTES[f])).toEqual([]);
    expect(Object.keys(ROUTES).filter((f) => !files.map(rel).includes(f))).toEqual([]);
  });

  for (const [file, policy] of Object.entries(ROUTES)) {
    it(`${file}: ${policy.kind} (${policy.why})`, () => {
      const sf = parse(path.join(ROOT, file));
      const { fns, problems } = exportedFunctions(sf);
      const handlers = fns.filter((f) => HTTP_METHODS.has(f.name));
      expect(problems.filter((p) => !/exported value/.test(p))).toEqual([]);
      expect(handlers.length, "exports at least one HTTP method").toBeGreaterThan(0);
      for (const h of handlers) {
        const statements = h.body?.statements ?? [];
        const text = (s: ts.Statement) => s.getText(sf);
        if (policy.kind === "bearer") {
          // The secret is compared, and a 401 returned, before the first await.
          const firstAwait = statements.findIndex((s) => /\bawait\b/.test(text(s)));
          const before = statements.slice(0, firstAwait === -1 ? statements.length : firstAwait).map(text).join("\n");
          expect(before, h.name).toMatch(/process\.env\.CRON_SECRET/);
          expect(before, h.name).toMatch(/authorization/i);
          expect(before, h.name).toMatch(/status:\s*401/);
        } else if (policy.kind === "session") {
          const body = statements.map(text).join("\n");
          const auth = Math.min(...SESSION_CALLS.map((c) => body.search(new RegExp(`\\b${c}\\(`))).filter((i) => i >= 0));
          expect(Number.isFinite(auth), `${h.name} reads the session`).toBe(true);
          const dbUse = body.search(/\bdb\./);
          if (dbUse >= 0) expect(dbUse, `${h.name} reads the database only after the session`).toBeGreaterThan(auth);
        }
      }
    });
  }
});
