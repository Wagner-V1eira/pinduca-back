"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const comentarioBodySchema = zod_1.z.object({
    conteudo: zod_1.z.string().min(3, { message: "Comentário deve ter no mínimo 3 caracteres" }),
    gibiId: zod_1.z.number(),
});
const updateComentarioSchema = zod_1.z.object({
    conteudo: zod_1.z.string().min(3, { message: "Comentário deve ter no mínimo 3 caracteres" }),
});
router.get("/:gibiId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { gibiId } = req.params;
    const numericGibiId = Number(gibiId);
    if (isNaN(numericGibiId)) {
        return res.status(400).json({ erro: "ID do gibi inválido." });
    }
    try {
        const comentarios = yield prisma.comentario.findMany({
            where: { gibiId: numericGibiId },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nome: true,
                        notas: {
                            where: { gibiId: numericGibiId },
                            select: { avaliacao: true },
                            take: 1
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(comentarios);
    }
    catch (error) {
        console.error("Erro ao obter comentários com notas:", error);
        res.status(500).json({ erro: "Erro ao obter comentários" });
    }
}));
router.post("/", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const valida = comentarioBodySchema.safeParse(req.body);
    if (!valida.success) {
        return res.status(400).json({ erro: "Dados inválidos", detalhes: valida.error.flatten().fieldErrors });
    }
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!usuarioIdLogado) {
        return res.status(401).json({ erro: "Usuário não autenticado corretamente." });
    }
    const { conteudo, gibiId } = valida.data;
    try {
        const comentario = yield prisma.comentario.create({
            data: {
                conteudo,
                gibiId,
                usuarioId: usuarioIdLogado
            }
        });
        const comentarioCriado = yield prisma.comentario.findUnique({
            where: { id: comentario.id },
            include: {
                usuario: {
                    select: {
                        id: true, nome: true,
                        notas: { where: { gibiId }, select: { avaliacao: true }, take: 1 }
                    }
                }
            }
        });
        res.status(201).json(comentarioCriado);
    }
    catch (error) {
        console.error("Erro ao criar comentário:", error);
        res.status(500).json({ erro: "Erro ao criar comentário" });
    }
}));
router.put("/:id", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId))
        return res.status(400).json({ erro: "ID do comentário inválido." });
    const valida = updateComentarioSchema.safeParse(req.body);
    if (!valida.success) {
        return res.status(400).json({ erro: "Dados inválidos", detalhes: valida.error.flatten().fieldErrors });
    }
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const roleUsuarioLogado = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!usuarioIdLogado)
        return res.status(401).json({ erro: "Usuário não autenticado." });
    const { conteudo } = valida.data;
    try {
        const comentarioExistente = yield prisma.comentario.findUnique({
            where: { id: numericId },
            select: { usuarioId: true }
        });
        if (!comentarioExistente)
            return res.status(404).json({ erro: "Comentário não encontrado." });
        const isOwner = comentarioExistente.usuarioId === usuarioIdLogado;
        const isAdmin = roleUsuarioLogado === client_1.Role.ADMIN;
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ erro: "Permissão negada para editar este comentário." });
        }
        const comentarioAtualizado = yield prisma.comentario.update({
            where: { id: numericId },
            data: { conteudo }
        });
        res.status(200).json(comentarioAtualizado);
    }
    catch (error) {
        console.error("Erro ao atualizar comentário:", error);
        res.status(500).json({ erro: "Erro ao atualizar comentário" });
    }
}));
router.delete("/:id", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId))
        return res.status(400).json({ erro: "ID do comentário inválido." });
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const roleUsuarioLogado = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!usuarioIdLogado)
        return res.status(401).json({ erro: "Usuário não autenticado." });
    try {
        const comentarioExistente = yield prisma.comentario.findUnique({
            where: { id: numericId },
            select: { usuarioId: true }
        });
        if (!comentarioExistente)
            return res.status(404).json({ erro: "Comentário não encontrado." });
        const isOwner = comentarioExistente.usuarioId === usuarioIdLogado;
        const isAdmin = roleUsuarioLogado === client_1.Role.ADMIN;
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ erro: "Permissão negada para excluir este comentário." });
        }
        yield prisma.comentario.delete({ where: { id: numericId } });
        res.status(204).send();
    }
    catch (error) {
        console.error("Erro ao deletar comentário:", error);
        res.status(500).json({ erro: "Erro ao deletar comentário" });
    }
}));
exports.default = router;
