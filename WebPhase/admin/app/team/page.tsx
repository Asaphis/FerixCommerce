import { Plus, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listStaff } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { deleteStaffAction, saveStaffAction } from "@/lib/ops-actions";
import { dateLong, titleCase } from "@/lib/format";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ error, saved }, { session, admin }] = await Promise.all([searchParams, requireAdmin()]);
  const { staff, roles } = await listStaff(session);
  const permissionOptions = [...new Set(roles.flatMap((role) => role.permissions))];
  const customPermissionIds = new Set(staff.filter((member) => {
    const defaults = roles.find((role) => role.role === member.role)?.permissions ?? [];
    return [...member.permissions].sort().join("\0") !== [...defaults].sort().join("\0");
  }).map((member) => member.id));

  return (
    <div className="grid min-w-0 gap-5">
      {error ? <p role="alert" className="rounded-[8px] border border-rose/30 bg-rose/10 px-3 py-2 text-[12px] text-rose">{error}</p> : null}
      {saved ? <p role="status" className="rounded-[8px] border border-signal/30 bg-signal/10 px-3 py-2 text-[12px] text-signal">Team changes saved.</p> : null}
      <header>
        <Eyebrow>Control</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Team and roles</h1>
        
      </header>

      <Panel>
        <PanelHead
          title="Console users"
          hint={`Signed in as ${admin.email}`}
          action={<Pill tone="violet">{staff.length} accounts</Pill>}
        />
        {staff.length === 0 ? (
          <Empty title="No accounts listed" body="Add the first team member below." />
        ) : (
          <div className="min-w-0 md:overflow-x-auto">
            <table className="w-full min-w-0 border-collapse text-left md:min-w-[720px]">
              <thead>
                <tr className="hidden border-b border-hairline md:table-row">
                  {["Name", "Email", "Role", "Permissions", "Added", ""].map((head) => (
                    <th key={head} className="px-4 py-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-chalk-dim">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr
                    key={member.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-3 last:border-0 hover:bg-panel-2 md:table-row md:px-0 md:py-0"
                  >
                    <td className="w-full min-w-0 px-0 py-0 md:w-auto md:px-4 md:py-3">
                      <p className="text-[12.5px] text-chalk">{member.name}</p>
                      <p className="font-mono text-[11px] text-chalk-dim">{member.email}</p>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-[12px] text-chalk-dim md:table-cell">{member.email}</td>
                    <td className="px-0 py-0 md:px-4 md:py-3">
                      <Pill tone={member.role === "owner" ? "violet" : member.role === "admin" ? "signal" : "neutral"}>
                        {member.role}
                      </Pill>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-[11.5px] text-chalk-dim md:table-cell">
                      {member.permissions.includes("*") ? "All access" : member.permissions.length ? `${member.permissions.length} granted` : "none"}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-[11.5px] text-chalk-dim md:table-cell">{dateLong(member.createdAt)}</td>
                    <td className="ml-auto px-0 py-0 md:ml-0 md:px-4 md:py-3">
                      {member.email === admin.email ? (
                        <span className="font-mono text-[10.5px] text-chalk-dim">you</span>
                      ) : member.role === "owner" && admin.role !== "owner" ? (
                        <Pill tone="violet">Owner protected</Pill>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <form action={saveStaffAction} className="flex items-center gap-1.5">
                            <input type="hidden" name="id" value={member.id} />
                            <input type="hidden" name="name" value={member.name} />
                            <select name="role" defaultValue={member.role} aria-label={`Role for ${member.name}`} className={selectClass}>
                              {roles.map((role) => <option key={role.role} value={role.role}>{titleCase(role.role)}</option>)}
                            </select>
                            <SubmitButton variant="outline" pendingLabel="Saving">Save role</SubmitButton>
                            <details className="basis-full rounded-[6px] border border-hairline p-2 md:basis-auto">
                              <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.1em] text-chalk-dim">Permissions ({member.permissions.includes("*") ? "all" : member.permissions.length})</summary>
                              <div className="mt-2 grid max-h-48 gap-1.5 overflow-y-auto sm:grid-cols-2">
                                {permissionOptions.map((permission) => (
                                  <label key={permission} className="flex items-center gap-1.5 text-[10px] text-chalk-dim">
                                    <input type="checkbox" name="permissions" value={permission} defaultChecked={member.permissions.includes(permission)} className="size-3 accent-[#c8ff3d]" />
                                    {permission === "*" ? "Full platform access (*)" : permission}
                                  </label>
                                ))}
                              </div>
                              <label className="mt-2 flex items-start gap-1.5 border-t border-hairline pt-2 text-[10px] text-chalk-dim">
                                <input type="checkbox" name="customPermissions" defaultChecked={customPermissionIds.has(member.id)} className="mt-0.5 size-3 accent-[#c8ff3d]" />
                                Use this explicit permission set; otherwise the selected role's defaults are used.
                              </label>
                            </details>
                          </form>
                          <form action={deleteStaffAction}>
                            <input type="hidden" name="id" value={member.id} />
                            <SubmitButton variant="danger" pendingLabel="Removing">Remove</SubmitButton>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelHead title="What each role can do" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <div key={role.role} className="rounded-[2px] border border-hairline bg-panel-2 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck width={14} height={14} className="text-signal" />
                <p className="font-display text-[13.5px] font-semibold text-chalk">{titleCase(role.role)}</p>
              </div>
              <ul className="mt-3 grid gap-1.5">
                {role.permissions.map((permission) => (
                  <li key={permission} className="font-mono text-[10.5px] text-chalk-dim">
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Add a team member" />
        <form action={saveStaffAction} className="grid gap-3">
          <div className="grid grid-cols-2 gap-2.5 md:gap-3 xl:grid-cols-4">
            <Field title="Name">
              <input name="name" placeholder="Amara Bello" className={inputClass} />
            </Field>
            <Field title="Email">
              <input name="email" type="email" placeholder="name@ferixas.com" className={inputClass} />
            </Field>
            <Field title="Role">
              <select name="role" defaultValue="content" className={selectClass}>
                {roles.map((role) => (
                  <option key={role.role} value={role.role}>
                    {titleCase(role.role)}
                  </option>
                ))}
              </select>
            </Field>
            <Field title="Password">
              <input name="password" type="password" minLength={12} required placeholder="At least 12 characters" className={inputClass} />
            </Field>
          </div>
          <div>
            <SubmitButton pendingLabel="Adding">
              <Plus width={14} height={14} />
              Add member
            </SubmitButton>
          </div>
        </form>
      </Panel>
    </div>
  );
}
