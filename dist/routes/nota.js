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
const notaSchema = zod_1.z.object({
    id: zod_1.z.number().optional(),
    gibiId: zod_1.z.number(),
    avaliacao: zod_1.z.number().min(1).max(5, { message: "Avaliação deve ser entre 1 e 5" }),
});
router.get("/:gibiId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { gibiId } = req.params;
    try {
        const notas = yield prisma.nota.findMany({
            where: { gibiId: Number(gibiId) }
        });
        res.status(200).json(notas);
    }
    catch (error) {
        console.error("Erro ao obter notas:", error);
        res.status(500).json({ erro: "Erro ao obter notas" });
    }
}));
router.post("/", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const valida = notaSchema.safeParse(req.body);
    if (!valida.success) {
        return res.status(400).json({ erro: valida.error });
    }
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!usuarioIdLogado) {
        return res.status(401).json({ erro: "Usuário não autenticado corretamente." });
    }
    const { gibiId, avaliacao } = valida.data;
    try {
        const novaNota = yield prisma.nota.create({
            data: {
                gibiId,
                avaliacao,
                usuarioId: Number(usuarioIdLogado)
            }
        });
        res.status(201).json(novaNota);
    }
    catch (error) {
        console.error("Erro ao criar nota:", error);
        res.status(500).json({ erro: "Erro ao criar nota" });
    }
}));
router.put("/:id", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const valida = notaSchema.safeParse(req.body);
    if (!valida.success) {
        return res.status(400).json({ erro: valida.error });
    }
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!usuarioIdLogado)
        return res.status(401).json({ erro: "Usuário não autenticado." });
    const { gibiId, avaliacao } = valida.data;
    try {
        const notaAtualizada = yield prisma.nota.update({
            where: { id: Number(id) },
            data: { gibiId, avaliacao }
        });
        res.status(200).json(notaAtualizada);
    }
    catch (error) {
        console.error("Erro ao atualizar nota:", error);
        res.status(500).json({ erro: "Erro ao atualizar nota" });
    }
}));
router.delete("/:id", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId))
        return res.status(400).json({ erro: "ID da nota inválido." });
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const roleUsuarioLogado = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!usuarioIdLogado) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }
    try {
        const notaExistente = yield prisma.nota.findUnique({
            where: { id: numericId },
            select: { usuarioId: true }
        });
        if (!notaExistente) {
            return res.status(404).json({ erro: "Nota não encontrada." });
        }
        const isOwner = notaExistente.usuarioId === usuarioIdLogado;
        const isAdmin = roleUsuarioLogado === client_1.Role.ADMIN;
        if (!isOwner && !isAdmin) {
            console.log(`Permissão negada: User ${usuarioIdLogado} (Role: ${roleUsuarioLogado}) tentando excluir nota ${numericId} do user ${notaExistente.usuarioId}`);
            return res.status(403).json({ erro: "Permissão negada para excluir esta nota." });
        }
        console.log(`Permissão concedida: User ${usuarioIdLogado} (Role: ${roleUsuarioLogado}) excluindo nota ${numericId}`);
        yield prisma.nota.delete({ where: { id: numericId } });
        res.status(204).send();
    }
    catch (error) {
        console.error(`Erro ao deletar nota ${id}:`, error);
        res.status(500).json({ erro: "Erro interno ao deletar nota" });
    }
}));
exports.default = router;
