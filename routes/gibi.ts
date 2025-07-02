import { PrismaClient, Role } from "@prisma/client";
import { Router, Response } from "express";
import { z } from "zod";
import authMiddleware, { RequestWithAuth } from "../middleware/authMiddleware";
import { canManageGibi } from "../utils/permissions";

const prisma = new PrismaClient();
const router = Router();

const gibiBaseSchema = z.object({
  titulo: z
    .string()
    .min(3, { message: "Título deve possuir, no mínimo, 3 caracteres" }),
  ano: z
    .number()
    .int()
    .min(1900, { message: "Ano inválido" })
    .max(new Date().getFullYear() + 5, { message: "Ano inválido" }),
  sinopse: z.string().optional().nullable(),
  capaUrl: z
    .string()
    .url({ message: "URL da capa inválida" })
    .optional()
    .nullable(),
  autor: z
    .string()
    .min(2, { message: "Nome do autor muito curto" })
    .optional()
    .nullable(),
});

router.get("/", async (req, res) => {
  const searchTerm = req.query.q as string | undefined;
  const whereClause: any = {
    excluido: false,
  };

  if (searchTerm && searchTerm.trim() !== "") {
    const termoBusca = searchTerm.trim();
    const anoBusca = Number(termoBusca);

    if (
      !isNaN(anoBusca) &&
      anoBusca >= 1900 &&
      anoBusca <= new Date().getFullYear() + 5 &&
      /^\d{4}$/.test(termoBusca)
    ) {
      console.log(`API Search: Filtrando por ANO = ${anoBusca}`);
      whereClause.ano = anoBusca;
    } else {
      console.log(
        `API Search: Filtrando por TÍTULO ou AUTOR contendo "${termoBusca}"`
      );
      whereClause.OR = [
        { titulo: { contains: termoBusca, mode: "insensitive" } },
        { autor: { contains: termoBusca, mode: "insensitive" } },
      ];
    }
  } else {
    console.log("API Search: Listando todos (sem termo de busca)");
  }

  try {
    const gibis = await prisma.gibi.findMany({
      where: whereClause,
      select: {
        id: true,
        titulo: true,
        ano: true,
        capaUrl: true,
        autor: true,
      },
      orderBy: { titulo: "asc" },
    });
    console.log(`API Search: Encontrados ${gibis.length} gibis.`);
    res.status(200).json(gibis);
  } catch (error) {
    console.error("Erro ao listar/buscar gibis:", error);
    res.status(500).json({ erro: "Erro interno ao listar/buscar gibis" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const numericId = Number(id);
  if (isNaN(numericId)) return res.status(400).json({ erro: "ID inválido." });
  try {
    const gibi = await prisma.gibi.findUnique({
      where: {
        id: numericId,
        excluido: false,
      },
      include: { usuario: { select: { id: true, nome: true } } },
    });
    if (!gibi) {
      return res.status(404).json({ erro: "Gibi não encontrado" });
    }
    res.status(200).json(gibi);
  } catch (error) {
    console.error(`Erro ao buscar gibi ${id}:`, error);
    res.status(500).json({ erro: "Erro interno ao buscar o gibi" });
  }
});

router.post(
  "/",
  authMiddleware,
  async (req: RequestWithAuth, res: Response) => {
    const valida = gibiBaseSchema.safeParse(req.body);
    if (!valida.success) {
      return res.status(400).json({
        erro: "Dados inválidos",
        detalhes: valida.error.flatten().fieldErrors,
      });
    }

    const usuarioIdLogado = req.user?.userId;
    if (!usuarioIdLogado) {
      return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    const { titulo, ano, sinopse, capaUrl, autor } = valida.data;

    try {
      const gibiExistente = await prisma.gibi.findFirst({
        where: {
          titulo: { equals: titulo, mode: "insensitive" },
          excluido: false,
        },
        select: { id: true },
      });

      if (gibiExistente) {
        return res
          .status(409)
          .json({ erro: "Um gibi com este título já está cadastrado." });
      }

      const gibi = await prisma.gibi.create({
        data: {
          titulo,
          ano,
          sinopse: sinopse ?? null,
          capaUrl: capaUrl ?? null,
          autor: autor ?? null,
          usuarioId: usuarioIdLogado,
        },
      });
      res.status(201).json(gibi);
    } catch (error: any) {
      console.error("Erro ao criar gibi:", error);
      if (error?.code === "P2002" && error?.meta?.target?.includes("titulo")) {
        return res
          .status(409)
          .json({ erro: "Um gibi com este título já está cadastrado (DB)." });
      }
      res.status(500).json({ erro: "Erro interno ao criar gibi" });
    }
  }
);

router.put(
  "/:id",
  authMiddleware,
  async (req: RequestWithAuth, res: Response) => {
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId)) return res.status(400).json({ erro: "ID inválido." });

    const valida = gibiBaseSchema.safeParse(req.body);
    if (!valida.success) {
      return res.status(400).json({
        erro: "Dados inválidos",
        detalhes: valida.error.flatten().fieldErrors,
      });
    }

    const usuarioIdLogado = req.user?.userId;
    const roleUsuarioLogado = req.user?.role;
    if (!usuarioIdLogado)
      return res.status(401).json({ erro: "Usuário não autenticado." });

    const { titulo, ano, sinopse, capaUrl, autor } = valida.data;

    try {
      const gibiExistente = await prisma.gibi.findUnique({
        where: { id: numericId },
        select: { usuarioId: true, excluido: true },
      });

      if (!gibiExistente)
        return res.status(404).json({ erro: "Gibi não encontrado." });
      if (gibiExistente.excluido)
        return res
          .status(403)
          .json({ erro: "Não é possível editar um gibi excluído." });

      const isOwner = gibiExistente.usuarioId === usuarioIdLogado;
      const canManage = canManageGibi(
        roleUsuarioLogado!,
        gibiExistente.usuarioId,
        usuarioIdLogado
      );

      if (!canManage) {
        return res
          .status(403)
          .json({ erro: "Permissão negada para editar este gibi." });
      }

      const dataToUpdate = {
        titulo,
        ano,
        sinopse: sinopse ?? null,
        capaUrl: capaUrl ?? null,
        autor: autor ?? null,
      };

      const gibiAtualizado = await prisma.gibi.update({
        where: { id: numericId },
        data: dataToUpdate,
      });
      res.status(200).json(gibiAtualizado);
    } catch (error: any) {
      console.error(`Erro ao atualizar gibi ${id}:`, error);
      if (error?.code === "P2002" && error?.meta?.target?.includes("titulo")) {
        return res
          .status(409)
          .json({ erro: "Este título já pertence a outro gibi." });
      }
      res.status(500).json({ erro: "Erro interno ao atualizar gibi" });
    }
  }
);

router.delete(
  "/:id",
  authMiddleware,
  async (req: RequestWithAuth, res: Response) => {
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId)) return res.status(400).json({ erro: "ID inválido." });

    const usuarioIdLogado = req.user?.userId;
    const roleUsuarioLogado = req.user?.role;
    if (!usuarioIdLogado)
      return res.status(401).json({ erro: "Usuário não autenticado." });

    try {
      const gibiExistente = await prisma.gibi.findUnique({
        where: { id: numericId },
        select: { usuarioId: true, excluido: true },
      });

      if (!gibiExistente)
        return res.status(404).json({ erro: "Gibi não encontrado." });
      if (gibiExistente.excluido) return res.status(204).send();

      const isOwner = gibiExistente.usuarioId === usuarioIdLogado;
      const canManage = canManageGibi(
        roleUsuarioLogado!,
        gibiExistente.usuarioId,
        usuarioIdLogado
      );

      if (!canManage) {
        return res
          .status(403)
          .json({ erro: "Permissão negada para excluir este gibi." });
      }

      await prisma.gibi.update({
        where: { id: numericId },
        data: { excluido: true },
      });
      res.status(204).send();
    } catch (error: any) {
      console.error(`Erro ao marcar gibi ${id} como excluído:`, error);
      res.status(500).json({ erro: "Erro interno ao excluir gibi" });
    }
  }
);

router.get("/usuario/:usuarioId", authMiddleware, async (req, res) => {
  const { usuarioId } = req.params;
  const numericUsuarioId = Number(usuarioId);
  if (isNaN(numericUsuarioId))
    return res.status(400).json({ erro: "ID de usuário inválido." });

  try {
    const gibis = await prisma.gibi.findMany({
      where: {
        usuarioId: numericUsuarioId,
        excluido: false,
      },
      select: {
        id: true,
        titulo: true,
        ano: true,
        capaUrl: true,
        autor: true,
      },
      orderBy: { titulo: "asc" },
    });
    res.status(200).json(gibis);
  } catch (error) {
    console.error(`Erro ao listar gibis do usuário ${usuarioId}:`, error);
    res.status(500).json({ erro: "Erro interno ao listar gibis do usuário" });
  }
});

export default router;
