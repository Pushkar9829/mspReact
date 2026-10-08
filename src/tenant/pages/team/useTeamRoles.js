import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { useAuth, useCan } from "../../../shared/context/AuthContext.jsx";
import { isStaffRole, missingPermissions, roleId } from "./permissions.js";

export const ROLES_QUERY = { limit: 100 };

/** Every role visible to this store (system tenant roles + custom roles), staff roles only. */
export function useTeamRoles() {
  const can = useCan();
  const { user } = useAuth();
  const enabled = can("roles.view");
  const q = useQuery({
    queryKey: keys.roles.list(ROLES_QUERY),
    queryFn: () => api.listRoles(ROLES_QUERY),
    enabled,
  });
  const roles = useMemo(() => (q.data?.data || []).filter(isStaffRole), [q.data]);
  const myPerms = user?.permissions || [];
  /** Options for a role picker; roles with permissions the actor lacks are disabled (backend 403s). */
  const options = useMemo(
    () =>
      roles.map((r) => {
        const missing = missingPermissions(myPerms, r);
        return {
          value: roleId(r),
          label: missing.length ? `${r.name} (has permissions you don't hold)` : `${r.name}${r.isSystem ? " · system" : ""}`,
          disabled: missing.length > 0,
          role: r,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roles, myPerms.join(",")]
  );
  return { query: q, roles, options, enabled };
}
