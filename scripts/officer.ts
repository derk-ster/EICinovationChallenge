/**
 * Manage officer accounts.
 *
 *   npm run officer -- add --email you@school.org --name "Alex Kim" --role admin [--password ...]
 *   npm run officer -- deactivate --email you@school.org
 *   npm run officer -- list
 *
 * Local backend: stores a scrypt hash in .data/dev-db.json.
 * Supabase backend: creates (or invites) the Supabase Auth user and the officers row.
 * Without --password, Supabase sends an invite email; locally a random password is generated
 * and written to .data/dev-credentials.txt (never printed).
 */
import { randomBytes } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const cmd = process.argv[2];
  const { backend } = await import("../src/lib/server/env");
  const mode = backend();

  if (cmd === "list") {
    const { getStore } = await import("../src/lib/server/store");
    const officers = await getStore().listOfficers();
    console.table(officers.map((o) => ({ name: o.displayName, email: o.email, role: o.role, active: o.active })));
    return;
  }

  const email = arg("email")?.toLowerCase();
  if (!email) throw new Error("--email is required");

  if (cmd === "add") {
    const name = arg("name") ?? email.split("@")[0];
    const role = arg("role") === "admin" ? "admin" : "judge";
    let password = arg("password");
    if (mode === "local") {
      const generated = !password;
      password ??= randomBytes(12).toString("base64url");
      const { hashPassword } = await import("../src/lib/server/crypto");
      const { upsertLocalOfficer } = await import("../src/lib/server/store/local");
      await upsertLocalOfficer({ email, displayName: name, role, active: true, passwordHash: await hashPassword(password) });
      if (generated) {
        const { localDataDir } = await import("../src/lib/server/env");
        const dir = path.resolve(process.cwd(), localDataDir());
        await mkdir(dir, { recursive: true });
        await appendFile(path.join(dir, "dev-credentials.txt"), `${email}\t${role}\t${password}\n`);
        console.log(`Added ${role} ${email}. Password written to ${path.join(localDataDir(), "dev-credentials.txt")}.`);
      } else console.log(`Added ${role} ${email}.`);
      return;
    }
    const { supabaseAdmin } = await import("../src/lib/server/store/supabase");
    const sb = supabaseAdmin();
    let userId: string | null = null;
    if (password) {
      const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
      if (error && !/already/i.test(error.message)) throw error;
      userId = data?.user?.id ?? null;
    } else {
      const { data, error } = await sb.auth.admin.inviteUserByEmail(email);
      if (error && !/already/i.test(error.message)) throw error;
      userId = data?.user?.id ?? null;
    }
    const { error } = await sb
      .from("officers")
      .upsert({ email, display_name: name, role, active: true, ...(userId ? { user_id: userId } : {}) }, { onConflict: "email" });
    if (error) throw error;
    console.log(`Added ${role} ${email}${password ? "" : " (invite email sent)"}.`);
    return;
  }

  if (cmd === "deactivate") {
    if (mode === "local") {
      const { findLocalOfficerByEmail, upsertLocalOfficer } = await import("../src/lib/server/store/local");
      const o = await findLocalOfficerByEmail(email);
      if (!o) throw new Error("No such officer");
      await upsertLocalOfficer({ ...o, active: false });
    } else {
      const { supabaseAdmin } = await import("../src/lib/server/store/supabase");
      const { error } = await supabaseAdmin().from("officers").update({ active: false }).eq("email", email);
      if (error) throw error;
    }
    console.log(`Deactivated ${email}.`);
    return;
  }

  throw new Error("Usage: officer add|deactivate|list");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
