/**
 * Role-based access control. Checked on the server for every admin page,
 * server action and route handler — hiding UI is never the control.
 */
export type Role = "customer" | "staff" | "admin";

export type Permission =
  | "admin:access"
  | "catalog:read"
  | "catalog:write"
  | "inventory:write"
  | "orders:read"
  | "orders:fulfil"
  | "orders:cancel"
  | "orders:refund"
  | "customers:read"
  | "discounts:write"
  | "content:write"
  | "settings:write"
  | "users:manage"
  | "audit:read"
  | "reports:export"
  | "messages:read";

const staff: Permission[] = [
  "admin:access",
  "catalog:read",
  "catalog:write",
  "inventory:write",
  "orders:read",
  "orders:fulfil",
  "customers:read",
  "content:write",
  "messages:read",
];

const grants: Record<Role, ReadonlySet<Permission>> = {
  customer: new Set(),
  staff: new Set(staff),
  admin: new Set<Permission>([
    ...staff,
    "orders:cancel",
    "orders:refund",
    "discounts:write",
    "settings:write",
    "users:manage",
    "audit:read",
    "reports:export",
  ]),
};

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return grants[role]?.has(permission) ?? false;
}

export function isRole(value: unknown): value is Role {
  return value === "customer" || value === "staff" || value === "admin";
}
