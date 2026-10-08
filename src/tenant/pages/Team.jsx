import { useState } from "react";
import { Plus, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { Button, PageHeader, TabPanel, Tabs } from "../../shared/ui/index.js";
import { PermissionGate } from "../../shared/components/PermissionGate.jsx";
import { MembersTab } from "./team/MembersTab.jsx";
import { RolesTab } from "./team/RolesTab.jsx";
import { useTeamRoles } from "./team/useTeamRoles.js";

export default function Team() {
  const can = useCan();
  const [params] = useSearchParams();
  const tab = params.get("tab") || "members";
  const roles = useTeamRoles();
  const [createOpen, setCreateOpen] = useState(false);

  const primaryAction =
    tab === "roles" ? (
      <PermissionGate perm="roles.create">
        <Button variant="primary" leftIcon={Plus} to="/tenant/team/roles/new">
          New role
        </Button>
      </PermissionGate>
    ) : (
      <PermissionGate
        allowed={can("users.create") && roles.enabled}
        reason={can("users.create") ? "Adding members also requires roles.view (to choose their role)" : "Requires users.create"}
      >
        <Button variant="primary" leftIcon={UserPlus} onClick={() => setCreateOpen(true)}>
          Add member
        </Button>
      </PermissionGate>
    );

  const tabs = [{ value: "members", label: "Members", icon: Users }];
  if (can("roles.view")) tabs.push({ value: "roles", label: "Roles", icon: ShieldCheck, count: roles.query.data ? roles.roles.length : undefined });

  return (
    <>
      <PageHeader
        title="Team"
        description="Staff accounts for your store and the roles that decide what each person can do."
        breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Team" }]}
        primaryAction={primaryAction}
      />
      <Tabs urlParam="tab" tabs={tabs} aria-label="Team sections">
        <TabPanel value="members">
          <MembersTab roles={roles} createOpen={createOpen} setCreateOpen={setCreateOpen} />
        </TabPanel>
        {can("roles.view") ? (
          <TabPanel value="roles">
            <RolesTab roles={roles} />
          </TabPanel>
        ) : null}
      </Tabs>
    </>
  );
}
