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
const gibiBaseSchema = zod_1.z.object({
    titulo: zod_1.z.string().min(3, { message: "Título deve possuir, no mínimo, 3 caracteres" }),
    ano: zod_1.z.number().int().min(1900, { message: "Ano inválido" }).max(new Date().getFullYear() + 5, { message: "Ano inválido" }),
    sinopse: zod_1.z.string().optional().nullable(),
    capaUrl: zod_1.z.string().url({ message: "URL da capa inválida" }).optional().nullable(),
    autor: zod_1.z.string().min(2, { message: "Nome do autor muito curto" }).optional().nullable(),
});
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const searchTerm = req.query.q;
    const whereClause = {
        excluido: false
    };
    if (searchTerm && searchTerm.trim() !== '') {
        const termoBusca = searchTerm.trim();
        const anoBusca = Number(termoBusca);
        if (!isNaN(anoBusca) && anoBusca >= 1900 && anoBusca <= new Date().getFullYear() + 5 && /^\d{4}$/.test(termoBusca)) {
            console.log(`API Search: Filtrando por ANO = ${anoBusca}`);
            whereClause.ano = anoBusca;
        }
        else {
            console.log(`API Search: Filtrando por TÍTULO ou AUTOR contendo "${termoBusca}"`);
            whereClause.OR = [
                { titulo: { contains: termoBusca, mode: 'insensitive' } },
                { autor: { contains: termoBusca, mode: 'insensitive' } }
            ];
        }
    }
    else {
        console.log("API Search: Listando todos (sem termo de busca)");
    }
    try {
        const gibis = yield prisma.gibi.findMany({
            where: whereClause,
            select: {
                id: true,
                titulo: true,
                ano: true,
                capaUrl: true,
                autor: true,
            },
            orderBy: { titulo: 'asc' }
        });
        console.log(`API Search: Encontrados ${gibis.length} gibis.`);
        res.status(200).json(gibis);
    }
    catch (error) {
        console.error("Erro ao listar/buscar gibis:", error);
        res.status(500).json({ erro: "Erro interno ao listar/buscar gibis" });
    }
}));
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId))
        return res.status(400).json({ erro: "ID inválido." });
    try {
        const gibi = yield prisma.gibi.findUnique({
            where: {
                id: numericId,
                excluido: false
            },
            include: { usuario: { select: { id: true, nome: true } } }
        });
        if (!gibi) {
            return res.status(404).json({ erro: "Gibi não encontrado" });
        }
        res.status(200).json(gibi);
    }
    catch (error) {
        console.error(`Erro ao buscar gibi ${id}:`, error);
        res.status(500).json({ erro: "Erro interno ao buscar o gibi" });
    }
}));
router.post("/", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const valida = gibiBaseSchema.safeParse(req.body);
    if (!valida.success) {
        return res.status(400).json({ erro: "Dados inválidos", detalhes: valida.error.flatten().fieldErrors });
    }
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!usuarioIdLogado) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }
    const { titulo, ano, sinopse, capaUrl, autor } = valida.data;
    try {
        const gibiExistente = yield prisma.gibi.findFirst({
            where: {
                titulo: { equals: titulo, mode: 'insensitive' },
                excluido: false
            },
            select: { id: true }
        });
        if (gibiExistente) {
            return res.status(409).json({ erro: "Um gibi com este título já está cadastrado." });
        }
        const gibi = yield prisma.gibi.create({
            data: {
                titulo, ano,
                sinopse: sinopse !== null && sinopse !== void 0 ? sinopse : null,
                capaUrl: capaUrl !== null && capaUrl !== void 0 ? capaUrl : null,
                autor: autor !== null && autor !== void 0 ? autor : null,
                usuarioId: usuarioIdLogado
            }
        });
        res.status(201).json(gibi);
    }
    catch (error) {
        console.error("Erro ao criar gibi:", error);
        if ((error === null || error === void 0 ? void 0 : error.code) === 'P2002' && ((_c = (_b = error === null || error === void 0 ? void 0 : error.meta) === null || _b === void 0 ? void 0 : _b.target) === null || _c === void 0 ? void 0 : _c.includes('titulo'))) {
            return res.status(409).json({ erro: "Um gibi com este título já está cadastrado (DB)." });
        }
        res.status(500).json({ erro: "Erro interno ao criar gibi" });
    }
}));
router.put("/:id", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId))
        return res.status(400).json({ erro: "ID inválido." });
    const valida = gibiBaseSchema.safeParse(req.body);
    if (!valida.success) {
        return res.status(400).json({ erro: "Dados inválidos", detalhes: valida.error.flatten().fieldErrors });
    }
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const roleUsuarioLogado = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!usuarioIdLogado)
        return res.status(401).json({ erro: "Usuário não autenticado." });
    const { titulo, ano, sinopse, capaUrl, autor } = valida.data;
    try {
        const gibiExistente = yield prisma.gibi.findUnique({
            where: { id: numericId },
            select: { usuarioId: true, excluido: true }
        });
        if (!gibiExistente)
            return res.status(404).json({ erro: "Gibi não encontrado." });
        if (gibiExistente.excluido)
            return res.status(403).json({ erro: "Não é possível editar um gibi excluído." });
        const isOwner = gibiExistente.usuarioId === usuarioIdLogado;
        const isAdmin = roleUsuarioLogado === client_1.Role.ADMIN;
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ erro: "Permissão negada para editar este gibi." });
        }
        const dataToUpdate = {
            titulo, ano,
            sinopse: sinopse !== null && sinopse !== void 0 ? sinopse : null,
            capaUrl: capaUrl !== null && capaUrl !== void 0 ? capaUrl : null,
            autor: autor !== null && autor !== void 0 ? autor : null,
        };
        const gibiAtualizado = yield prisma.gibi.update({
            where: { id: numericId },
            data: dataToUpdate
        });
        res.status(200).json(gibiAtualizado);
    }
    catch (error) {
        console.error(`Erro ao atualizar gibi ${id}:`, error);
        if ((error === null || error === void 0 ? void 0 : error.code) === 'P2002' && ((_d = (_c = error === null || error === void 0 ? void 0 : error.meta) === null || _c === void 0 ? void 0 : _c.target) === null || _d === void 0 ? void 0 : _d.includes('titulo'))) {
            return res.status(409).json({ erro: "Este título já pertence a outro gibi." });
        }
        res.status(500).json({ erro: "Erro interno ao atualizar gibi" });
    }
}));
router.delete("/:id", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId))
        return res.status(400).json({ erro: "ID inválido." });
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const roleUsuarioLogado = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    if (!usuarioIdLogado)
        return res.status(401).json({ erro: "Usuário não autenticado." });
    try {
        const gibiExistente = yield prisma.gibi.findUnique({
            where: { id: numericId },
            select: { usuarioId: true, excluido: true }
        });
        if (!gibiExistente)
            return res.status(404).json({ erro: "Gibi não encontrado." });
        if (gibiExistente.excluido)
            return res.status(204).send();
        const isOwner = gibiExistente.usuarioId === usuarioIdLogado;
        const isAdmin = roleUsuarioLogado === client_1.Role.ADMIN;
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ erro: "Permissão negada para excluir este gibi." });
        }
        yield prisma.gibi.update({
            where: { id: numericId },
            data: { excluido: true }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error(`Erro ao marcar gibi ${id} como excluído:`, error);
        res.status(500).json({ erro: "Erro interno ao excluir gibi" });
    }
}));
exports.default = router;
