import { Router, Response } from "express";
import authMiddleware, { RequestWithAuth } from "../middleware/authMiddleware";
import {
  Permission,
  getRolePermissions,
  isAdmin,
  isMainAdmin,
  isAuxAdmin,
} from "../utils/permissions";

const router = Router();

router.get(
  "/me/permissions",
  authMiddleware,
  async (req: RequestWithAuth, res: Response) => {
    try {
      const userRole = req.user!.role;
      const permissions = getRolePermissions(userRole);

      const userInfo = {
        role: userRole,
        permissions: permissions,
        capabilities: {
          isAdmin: isAdmin(userRole),
          isMainAdmin: isMainAdmin(userRole),
          isAuxAdmin: isAuxAdmin(userRole),
          canAccessDashboard: permissions.includes(Permission.DASHBOARD_ACCESS),
          canDeleteReviews: permissions.includes(Permission.DELETE_REVIEWS),
          canManageUsers: permissions.includes(Permission.MANAGE_USERS),
          canManageGibis: permissions.includes(Permission.MANAGE_GIBIS),
          canAccessSystemSettings: permissions.includes(
            Permission.SYSTEM_SETTINGS
          ),
        },
      };

      res.status(200).json(userInfo);
    } catch (error) {
      console.error("Erro ao buscar permissões do usuário:", error);
      res.status(500).json({ erro: "Erro interno ao buscar permissões" });
    }
  }
);

router.get("/roles/info", async (req, res) => {
  try {
    const rolesInfo = {
      USER: {
        name: "Usuário Regular",
        description:
          "Acesso básico para gerenciar seus próprios gibis e reviews",
        permissions: getRolePermissions("USER"),
        color: "blue",
      },
      ADMIN_AUX: {
        name: "Administrador Auxiliar",
        description: "Acesso ao dashboard e moderação de reviews",
        permissions: getRolePermissions("ADMIN_AUX"),
        color: "orange",
      },
      ADMIN: {
        name: "Administrador Principal",
        description: "Acesso completo a todas as funcionalidades do sistema",
        permissions: getRolePermissions("ADMIN"),
        color: "red",
      },
    };

    res.status(200).json(rolesInfo);
  } catch (error) {
    console.error("Erro ao buscar informações de roles:", error);
    res
      .status(500)
      .json({ erro: "Erro interno ao buscar informações de roles" });
  }
});

export default router;
