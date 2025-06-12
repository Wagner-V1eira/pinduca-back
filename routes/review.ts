import { PrismaClient, Role } from '@prisma/client';
import { Router, Response } from 'express';
import { z } from 'zod';
import authMiddleware, { RequestWithAuth } from '../middleware/authMiddleware'; 

const prisma = new PrismaClient();
const router = Router();

const reviewCreateSchema = z.object({
  gibiId: z.number().int().positive({ message: "ID do Gibi inválido." }),
  avaliacao: z.number().min(1, { message: "Avaliação mínima é 1 estrela." }).max(5, { message: "Avaliação máxima é 5 estrelas." }),
  conteudo: z.string().trim().min(1, { message: "O conteúdo do review não pode estar vazio." }),
});

const reviewUpdateSchema = z.object({
  avaliacao: z.number().min(1).max(5).optional(),
  conteudo: z.string().trim().min(1, { message: "O conteúdo do review não pode estar vazio." }).optional(),
}).refine(data => data.avaliacao !== undefined || data.conteudo !== undefined, {
  message: "Pelo menos um campo (avaliação ou conteúdo) deve ser fornecido para atualização.",
});

router.post("/", authMiddleware, async (req: RequestWithAuth, res: Response) => {
  try {
    const result = reviewCreateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ erro: "Dados inválidos para o review.", detalhes: result.error.flatten().fieldErrors });
    }

    const { gibiId, avaliacao, conteudo } = result.data;
    const usuarioId = req.user!.userId; 

    const existingReview = await prisma.review.findUnique({
      where: {
        gibiId_usuarioId: { 
          gibiId,
          usuarioId,
        },
      },
    });

    if (existingReview) {
      return res.status(409).json({ erro: "Você já fez um review para este gibi. Você pode editá-lo." });
    }

    const gibiExists = await prisma.gibi.findUnique({ where: { id: gibiId } });
    if (!gibiExists || gibiExists.excluido) {
        return res.status(404).json({ erro: "Gibi não encontrado ou indisponível." });
    }

    const novoReview = await prisma.review.create({
      data: {
        gibiId,
        usuarioId,
        avaliacao,
        conteudo,
      },
      include: { 
        usuario: {
            select: { id: true, nome: true }
        }
      }
    });

    res.status(201).json(novoReview);
  } catch (error) {
    console.error("Erro ao criar review:", error);
    res.status(500).json({ erro: "Erro interno ao criar review." });
  }
});

router.get("/gibi/:gibiId", async (req: RequestWithAuth, res: Response) => {
  try {
    const gibiId = parseInt(req.params.gibiId, 10);
    if (isNaN(gibiId)) {
      return res.status(400).json({ erro: "ID do Gibi inválido." });
    }

    const reviews = await prisma.review.findMany({
      where: { gibiId },
      include: {
        usuario: {
          select: { id: true, nome: true }, 
        },
      },
      orderBy: {
        createdAt: 'desc', 
      },
    });

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Erro ao listar reviews:", error);
    res.status(500).json({ erro: "Erro interno ao listar reviews." });
  }
});

router.get("/gibi/:gibiId/meu", authMiddleware, async (req: RequestWithAuth, res: Response) => {
  try {
    const gibiId = parseInt(req.params.gibiId, 10);
    if (isNaN(gibiId)) {
      return res.status(400).json({ erro: "ID do Gibi inválido." });
    }
    const usuarioId = req.user!.userId;

    const review = await prisma.review.findUnique({
      where: {
        gibiId_usuarioId: {
          gibiId,
          usuarioId,
        },
      },
    });

    if (!review) {
      return res.status(404).json({ message: "Nenhum review seu encontrado para este gibi." });
    }

    res.status(200).json(review);
  } catch (error) {
    console.error("Erro ao buscar review do usuário:", error);
    res.status(500).json({ erro: "Erro interno ao buscar review do usuário." });
  }
});

router.put("/:reviewId", authMiddleware, async (req: RequestWithAuth, res: Response) => {
  try {
    const reviewId = parseInt(req.params.reviewId, 10);
    if (isNaN(reviewId)) {
      return res.status(400).json({ erro: "ID do Review inválido." });
    }

    const result = reviewUpdateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ erro: "Dados inválidos para atualização.", detalhes: result.error.flatten().fieldErrors });
    }

    const { avaliacao, conteudo } = result.data;
    const usuarioId = req.user!.userId;

    const reviewExistente = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!reviewExistente) {
      return res.status(404).json({ erro: "Review não encontrado." });
    }

    if (reviewExistente.usuarioId !== usuarioId) {
      return res.status(403).json({ erro: "Você não tem permissão para editar este review." });
    }

    const reviewAtualizado = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(avaliacao !== undefined && { avaliacao }), 
        ...(conteudo !== undefined && { conteudo }),  
      },
      include: {
        usuario: {
            select: { id: true, nome: true }
        }
      }
    });

    res.status(200).json(reviewAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar review:", error);
    res.status(500).json({ erro: "Erro interno ao atualizar review." });
  }
});

router.delete("/:reviewId", authMiddleware, async (req: RequestWithAuth, res: Response) => {
  try {
    const reviewId = parseInt(req.params.reviewId, 10);
    if (isNaN(reviewId)) {
      return res.status(400).json({ erro: "ID do Review inválido." });
    }

    const usuarioId = req.user!.userId;
    const role = req.user!.role;

    const reviewExistente = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!reviewExistente) {
      return res.status(404).json({ erro: "Review não encontrado." });
    }

    if (reviewExistente.usuarioId !== usuarioId && role !== Role.ADMIN) {
      return res.status(403).json({ erro: "Você não tem permissão para deletar este review." });
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    res.status(204).send(); 
  } catch (error) {
    console.error("Erro ao deletar review:", error);
    res.status(500).json({ erro: "Erro interno ao deletar review." });
  }
});

export default router;