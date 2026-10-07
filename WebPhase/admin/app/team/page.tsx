import { Plus, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/data";
import { listStaff } from "@/lib/api";
import { Field, SubmitButton } from "@/components/ops/controls";
import { inputClass, selectClass } from "@/components/ops/table";
import { Empty, Eyebrow, Panel, PanelHead, Pill } from "@/components/ops/bits";
import { deleteStaffAction, saveStaffAction } from "@/lib/ops-actions";
import { dateLong, titleCase } from "@/lib/format";

export default async function TeamPage() {
  const { session, admin } = await requireAdmin();
  const { staff, roles } = await listStaff(session);

  return (
    <div className="grid min-w-0 gap-5">
      <header>
        <Eyebrow>Control</Eyebrow>
        <h1 className="mt-1.5 font-display text-[23px] font-semibold text-chalk">Team and roles</h1>
        <p className="mt-1.5 max-w-[74ch] text-[13px] leading-relaxed text-chalk-dim">
          Everyone who can sign into this console. A role decides what a person may change; the owner role has
          every permission.
        </p>
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
                      {member.permissions.length ? `${member.permissions.length} granted` : "none"}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-[11.5px] text-chalk-dim md:table-cell">{dateLong(member.createdAt)}</td>
                    <td className="ml-auto px-0 py-0 md:ml-0 md:px-4 md:py-3">
                      {member.email === admin.email ? (
                        <span className="font-mono text-[10.5px] text-chalk-dim">you</span>
                      ) : (
                        <form action={deleteStaffAction}>
                          <input type="hidden" name="id" value={member.id} />
                          <SubmitButton variant="danger" pendingLabel="Removing">
                            Remove
                          </SubmitButton>
                        </form>
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
        <PanelHead title="What each role can do" hint="Permissions are applied on the backend, not only in the console." />
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
        <PanelHead title="Add a team member" hint="They sign in with this email and password." />
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
              <input name="password" type="password" placeholder="At least 8 characters" className={inputClass} />
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
