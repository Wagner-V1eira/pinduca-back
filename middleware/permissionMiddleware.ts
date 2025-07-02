import { Response, NextFunction } from "express";
import { RequestWithAuth } from "./authMiddleware";
import { Permission, hasPermission, isAdmin } from "../utils/permissions";

export function requirePermission(permission: Permission) {
  return (req: RequestWithAuth, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ erro: "Token de acesso não fornecido" });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        erro: "Acesso negado. Você não tem permissão para acessar este recurso",
        permissaoNecessaria: permission,
      });
    }

    next();
  };
}

export function requireAdmin(
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ erro: "Token de acesso não fornecido" });
  }

  if (!isAdmin(req.user.role)) {
    return res.status(403).json({
      erro: "Acesso negado. Apenas administradores podem acessar este recurso",
    });
  }

  next();
}

export function requireMainAdmin(
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ erro: "Token de acesso não fornecido" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      erro: "Acesso negado. Apenas administradores principais podem acessar este recurso",
    });
  }

  next();
}
