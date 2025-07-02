import express, { Response } from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware, { RequestWithAuth } from "../middleware/authMiddleware";
import { requirePermission } from "../middleware/permissionMiddleware";
import { Permission, getRolePermissions } from "../utils/permissions";

const router = express.Router();
const prisma = new PrismaClient();

// Função para obter gibis por ano
async function getGibisPorAno() {
  const result = await prisma.gibi.groupBy({
    by: ["ano"],
    where: {
      excluido: false,
    },
    _count: {
      _all: true,
    },
    orderBy: {
      ano: "desc",
    },
  });

  return result.map((item) => ({
    ano: item.ano,
    quantidade: item._count._all,
  }));
}

async function getTopGibis() {
  const result = await prisma.gibi.findMany({
    where: {
      excluido: false,
      reviews: {
        some: {
          avaliacao: {
            gte: 4,
          },
        },
      },
    },
    include: {
      reviews: true,
    },
    orderBy: {
      reviews: {
        _count: "desc", // Ordena pelo número de reviews
      },
    },
    take: 5,
  });

  const gibisComEstatisticas = result.map((gibi) => {
    const totalReviews = gibi.reviews.length;
    const mediaAvaliacao =
      totalReviews > 0
        ? gibi.reviews.reduce((acc, review) => acc + review.avaliacao, 0) /
          totalReviews
        : 0;

    return {
      titulo: gibi.titulo,
      mediaAvaliacao: Number(mediaAvaliacao.toFixed(1)),
      totalReviews,
    };
  });
  return gibisComEstatisticas;
}

// Função para obter usuários mais ativos
async function getUsuariosAtivos() {
  const result = await prisma.usuario.findMany({
    include: {
      reviews: true,
    },
  });

  const usuariosComReviews = result
    .map((usuario) => ({
      nome: usuario.nome,
      totalReviews: usuario.reviews.length,
    }))
    .filter((usuario) => usuario.totalReviews > 0)
    .sort((a, b) => b.totalReviews - a.totalReviews)
    .slice(0, 10);

  return usuariosComReviews;
}

// Função para obter avaliações por mês (últimos 12 meses)
async function getAvaliacoesPorMes() {
  const dozesMesesAtras = new Date();
  dozesMesesAtras.setMonth(dozesMesesAtras.getMonth() - 12);

  const reviews = await prisma.review.findMany({
    where: {
      createdAt: {
        gte: dozesMesesAtras,
      },
    },
    select: {
      createdAt: true,
    },
  });

  const meses = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  const avaliacoesPorMes = new Array(12).fill(0).map((_, index) => {
    const mesAtual = new Date();
    mesAtual.setMonth(mesAtual.getMonth() - (11 - index));
    return {
      mes: meses[mesAtual.getMonth()],
      quantidade: 0,
    };
  });

  reviews.forEach((review) => {
    const mesReview = review.createdAt.getMonth();
    const mesIndex = avaliacoesPorMes.findIndex(
      (item) => item.mes === meses[mesReview]
    );
    if (mesIndex !== -1) {
      avaliacoesPorMes[mesIndex].quantidade++;
    }
  });

  return avaliacoesPorMes;
}

// Função para obter distribuição de avaliações
async function getDistribuicaoAvaliacoes() {
  const result = await prisma.review.groupBy({
    by: ["avaliacao"],
    _count: {
      _all: true,
    },
    orderBy: {
      avaliacao: "asc",
    },
  });

  return result.map((item) => ({
    estrelas: item.avaliacao,
    quantidade: item._count._all,
  }));
}

// Função principal para obter todas as estatísticas do dashboard
async function getDashboardStats() {
  try {
    const [
      totalGibis,
      totalUsuarios,
      totalReviews,
      mediaAvaliacaoResult,
      gibisPorAno,
      topGibis,
      usuariosAtivos,
      avaliacoesPorMes,
      distribuicaoAvaliacoes,
    ] = await Promise.all([
      prisma.gibi.count({
        where: { excluido: false },
      }),
      prisma.usuario.count(),
      prisma.review.count(),
      prisma.review.aggregate({
        _avg: {
          avaliacao: true,
        },
      }),
      getGibisPorAno(),
      getTopGibis(),
      getUsuariosAtivos(),
      getAvaliacoesPorMes(),
      getDistribuicaoAvaliacoes(),
    ]);

    const mediaAvaliacao = mediaAvaliacaoResult._avg.avaliacao || 0;

    return {
      totalGibis,
      totalUsuarios,
      totalReviews,
      mediaAvaliacao: Number(mediaAvaliacao.toFixed(1)),
      gibisPorAno,
      topGibis,
      usuariosAtivos,
      avaliacoesPorMes,
      distribuicaoAvaliacoes,
    };
  } catch (error) {
    console.error("Erro ao gerar estatísticas do dashboard:", error);
    throw error;
  }
}

// Rota GET /admin/dashboard
router.get(
  "/admin/dashboard",
  authMiddleware,
  requirePermission(Permission.DASHBOARD_ACCESS),
  async (req: RequestWithAuth, res: Response) => {
    try {
      console.log(
        `Dashboard Admin: Usuário ${req.user?.userId} (${req.user?.role}) acessou o dashboard`
      );

      const stats = await getDashboardStats();

      // Adicionar informações sobre as permissões do usuário
      const userPermissions = getRolePermissions(req.user!.role);

      res.status(200).json({
        ...stats,
        userInfo: {
          userId: req.user!.userId,
          role: req.user!.role,
          permissions: userPermissions,
        },
      });
    } catch (error) {
      console.error("Erro ao gerar estatísticas do dashboard:", error);
      res.status(500).json({
        erro: "Erro interno do servidor ao gerar estatísticas",
      });
    }
  }
);

export default router;
