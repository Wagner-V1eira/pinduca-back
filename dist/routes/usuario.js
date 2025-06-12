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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const createUsuarioSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3, { message: "Nome deve possuir, no mínimo, 3 caracteres" }),
    email: zod_1.z.string().email({ message: "Email inválido" }),
    senha: zod_1.z.string().min(6, { message: "Senha deve possuir, no mínimo, 6 caracteres" }),
});
const updateUsuarioSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3, { message: "Nome deve possuir, no mínimo, 3 caracteres" }).optional(),
    email: zod_1.z.string().email({ message: "Email inválido" }).optional(),
    senha: zod_1.z.string().min(6, { message: "Senha deve possuir, no mínimo, 6 caracteres" }).optional(),
});
router.get("/", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.warn("API GET /usuario está ativa e retornando todos os usuários para usuários logados. Considere restringir ou remover.");
    try {
        const usuarios = yield prisma.usuario.findMany({
            select: {
                id: true,
                nome: true,
                email: true,
            }
        });
        res.status(200).json(usuarios);
    }
    catch (error) {
        console.error("Erro ao listar usuários:", error);
        res.status(500).json({ erro: "Erro ao listar usuários" });
    }
}));
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const valida = createUsuarioSchema.safeParse(req.body);
    if (!valida.success) {
        return res.status(400).json({ erro: "Dados inválidos", detalhes: valida.error.flatten().fieldErrors });
    }
    const { nome, email, senha } = valida.data;
    try {
        const hashedPassword = yield bcrypt_1.default.hash(senha, 10);
        const usuario = yield prisma.usuario.create({
            data: { nome, email, senha: hashedPassword }
        });
        const { senha: _ } = usuario, usuarioCriado = __rest(usuario, ["senha"]);
        res.status(201).json({ message: "Usuário cadastrado com sucesso", usuario: usuarioCriado });
    }
    catch (error) {
        console.error("Erro ao criar usuário:", error);
        if ((error === null || error === void 0 ? void 0 : error.code) === 'P2002' && ((_b = (_a = error === null || error === void 0 ? void 0 : error.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.includes('email'))) {
            return res.status(409).json({ erro: "Este email já está cadastrado." });
        }
        res.status(500).json({ erro: "Erro interno ao cadastrar usuário." });
    }
}));
router.get("/:id", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId))
        return res.status(400).json({ erro: "ID inválido." });
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!usuarioIdLogado)
        return res.status(401).json({ erro: "Usuário não autenticado." });
    if (usuarioIdLogado !== numericId) {
        console.log(`Tentativa não autorizada: User ${usuarioIdLogado} tentando acessar perfil ${numericId}`);
        return res.status(403).json({ erro: "Você só pode visualizar seu próprio perfil." });
    }
    try {
        const usuario = yield prisma.usuario.findUnique({
            where: { id: numericId },
            select: {
                id: true,
                nome: true,
                email: true,
            }
        });
        if (!usuario) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }
        res.status(200).json(usuario);
    }
    catch (error) {
        console.error("Erro ao obter usuário por ID:", error);
        res.status(500).json({ erro: "Erro interno ao obter usuário" });
    }
}));
router.get("/me/avaliacoes", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!usuarioIdLogado) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }
    try {
        const gibisDoUsuario = yield prisma.gibi.findMany({
            where: {
                excluido: false,
                OR: [
                    { notas: { some: { usuarioId: usuarioIdLogado } } },
                    { comentarios: { some: { usuarioId: usuarioIdLogado } } }
                ]
            },
            select: {
                id: true,
                titulo: true,
                ano: true,
                sinopse: true,
                capaUrl: true,
            },
            orderBy: {
                titulo: 'asc'
            }
        });
        console.log(`API: Retornando ${gibisDoUsuario.length} gibis avaliados/comentados para usuário ${usuarioIdLogado}`);
        res.status(200).json(gibisDoUsuario);
    }
    catch (error) {
        console.error(`API: Erro ao buscar gibis do usuário ${usuarioIdLogado}:`, error);
        res.status(500).json({ erro: "Erro ao buscar suas avaliações e comentários." });
    }
}));
router.put("/:id", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId))
        return res.status(400).json({ erro: "ID inválido." });
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!usuarioIdLogado)
        return res.status(401).json({ erro: "Usuário não autenticado." });
    if (usuarioIdLogado !== numericId) {
        return res.status(403).json({ erro: "Você só pode editar seu próprio perfil." });
    }
    const valida = updateUsuarioSchema.safeParse(req.body);
    if (!valida.success) {
        return res.status(400).json({ erro: "Dados inválidos", detalhes: valida.error.flatten().fieldErrors });
    }
    const { nome, email, senha } = valida.data;
    try {
        const dadosParaAtualizar = {};
        if (nome !== undefined)
            dadosParaAtualizar.nome = nome;
        if (email !== undefined)
            dadosParaAtualizar.email = email;
        if (senha !== undefined) {
            dadosParaAtualizar.senha = yield bcrypt_1.default.hash(senha, 10);
        }
        if (Object.keys(dadosParaAtualizar).length === 0) {
            return res.status(400).json({ erro: "Nenhum dado fornecido para atualização." });
        }
        const usuarioAtualizado = yield prisma.usuario.update({
            where: { id: numericId },
            data: dadosParaAtualizar
        });
        const { senha: _ } = usuarioAtualizado, usuarioRetorno = __rest(usuarioAtualizado, ["senha"]);
        res.status(200).json(usuarioRetorno);
    }
    catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        if ((error === null || error === void 0 ? void 0 : error.code) === 'P2002' && ((_c = (_b = error === null || error === void 0 ? void 0 : error.meta) === null || _b === void 0 ? void 0 : _b.target) === null || _c === void 0 ? void 0 : _c.includes('email'))) {
            return res.status(409).json({ erro: "Este email já está em uso por outra conta." });
        }
        res.status(500).json({ erro: "Erro interno ao atualizar usuário" });
    }
}));
router.delete("/:id", authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const numericId = Number(id);
    if (isNaN(numericId))
        return res.status(400).json({ erro: "ID inválido." });
    const usuarioIdLogado = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!usuarioIdLogado)
        return res.status(401).json({ erro: "Usuário não autenticado." });
    if (usuarioIdLogado !== numericId) {
        return res.status(403).json({ erro: "Você só pode excluir seu próprio perfil." });
    }
    try {
        yield prisma.usuario.delete({
            where: { id: numericId },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error("Erro ao excluir usuário:", error);
        if ((error === null || error === void 0 ? void 0 : error.code) === 'P2003') {
            return res.status(409).json({ erro: "Não é possível excluir usuário pois ele possui registros associados (comentários, notas, etc.)." });
        }
        res.status(500).json({ erro: "Erro interno ao excluir usuário" });
    }
}));
exports.default = router;
