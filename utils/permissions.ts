import { Role } from "@prisma/client";

// Tipos de permissões disponíveis no sistema
export enum Permission {
  DASHBOARD_ACCESS = "dashboard_access",
  DELETE_REVIEWS = "delete_reviews",
  MANAGE_USERS = "manage_users",
  MANAGE_GIBIS = "manage_gibis",
  SYSTEM_SETTINGS = "system_settings",
}

// Mapeamento de roles para suas permissões
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

/**
 * Verifica se um usuário com determinado role tem uma permissão específica
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.includes(permission);
}

/**
 * Verifica se um usuário tem qualquer tipo de acesso administrativo
 */
export function isAdmin(userRole: Role): boolean {
  return userRole === Role.ADMIN || userRole === Role.ADMIN_AUX;
}

/**
 * Verifica se um usuário é administrador principal
 */
export function isMainAdmin(userRole: Role): boolean {
  return userRole === Role.ADMIN;
}

/**
 * Verifica se um usuário é administrador auxiliar
 */
export function isAuxAdmin(userRole: Role): boolean {
  return userRole === Role.ADMIN_AUX;
}

/**
 * Retorna todas as permissões de um role
 */
export function getRolePermissions(userRole: Role): Permission[] {
  return ROLE_PERMISSIONS[userRole];
}

/**
 * Verifica se um usuário pode excluir um review
 * (próprio review ou se tem permissão DELETE_REVIEWS)
 */
export function canDeleteReview(
  userRole: Role,
  reviewOwnerId: number,
  currentUserId: number
): boolean {
  // Pode excluir se é o próprio review
  if (reviewOwnerId === currentUserId) {
    return true;
  }

  // Ou se tem permissão para excluir reviews de outros usuários
  return hasPermission(userRole, Permission.DELETE_REVIEWS);
}

/**
 * Verifica se um usuário pode editar/excluir um gibi
 * (próprio gibi ou se é admin principal)
 */
export function canManageGibi(
  userRole: Role,
  gibiOwnerId: number,
  currentUserId: number
): boolean {
  // Pode gerenciar se é o próprio gibi
  if (gibiOwnerId === currentUserId) {
    return true;
  }

  // Ou se é admin principal (ADMIN_AUX não pode gerenciar gibis de outros)
  return userRole === Role.ADMIN;
}
