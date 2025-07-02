import { Role } from "@prisma/client";

export enum Permission {
  DASHBOARD_ACCESS = "dashboard_access",
  DELETE_REVIEWS = "delete_reviews",
  MANAGE_USERS = "manage_users",
  MANAGE_GIBIS = "manage_gibis",
  SYSTEM_SETTINGS = "system_settings",
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.USER]: [],
  [Role.ADMIN_AUX]: [Permission.DASHBOARD_ACCESS, Permission.DELETE_REVIEWS],
  [Role.ADMIN]: [
    Permission.DASHBOARD_ACCESS,
    Permission.DELETE_REVIEWS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_GIBIS,
    Permission.SYSTEM_SETTINGS,
  ],
};

export function hasPermission(userRole: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.includes(permission);
}

export function isAdmin(userRole: Role): boolean {
  return userRole === Role.ADMIN || userRole === Role.ADMIN_AUX;
}

export function isMainAdmin(userRole: Role): boolean {
  return userRole === Role.ADMIN;
}

export function isAuxAdmin(userRole: Role): boolean {
  return userRole === Role.ADMIN_AUX;
}

export function getRolePermissions(userRole: Role): Permission[] {
  return ROLE_PERMISSIONS[userRole];
}

export function canDeleteReview(
  userRole: Role,
  reviewOwnerId: number,
  currentUserId: number
): boolean {
  
  if (reviewOwnerId === currentUserId) {
    return true;
  }

  return hasPermission(userRole, Permission.DELETE_REVIEWS);
}

export function canManageGibi(
  userRole: Role,
  gibiOwnerId: number,
  currentUserId: number
): boolean {
  
  if (gibiOwnerId === currentUserId) {
    return true;
  } 
  return userRole === Role.ADMIN;
}
