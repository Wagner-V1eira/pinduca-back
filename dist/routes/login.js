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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// import cors from 'cors'
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: "Email inválido" }),
    senha: zod_1.z.string().min(6, { message: "Senha deve possuir, no mínimo, 6 caracteres" }),
});
// router.use(cors({
//     origin: 'http://localhost:3000', 
//     methods: 'POST',              
//     credentials: true,            
// }));
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const valida = loginSchema.safeParse(req.body);
    if (!valida.success) {
        const primeiraMensagem = ((_a = valida.error.errors[0]) === null || _a === void 0 ? void 0 : _a.message) || "Erro de validação";
        return res.status(400).json({ erro: primeiraMensagem });
    }
    const { email, senha } = valida.data;
    try {
        const usuario = yield prisma.usuario.findUnique({
            where: { email },
            select: {
                id: true,
                nome: true,
                email: true,
                senha: true,
                role: true,
            }
        });
        if (!usuario || !(yield bcrypt_1.default.compare(senha, usuario.senha))) {
            return res.status(401).json({ erro: "Credenciais inválidas" });
        }
        const { senha: _ } = usuario, usuarioSemSenha = __rest(usuario, ["senha"]);
        const token = jsonwebtoken_1.default.sign({ userId: usuario.id, role: usuario.role }, process.env.JWT_SECRET || 'SECRET_KEY', { expiresIn: '1h' });
        res.status(200).json({ token, user: usuarioSemSenha });
    }
    catch (error) {
        console.error("Erro no login:", error);
        let errorMessage = 'Erro no servidor';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        res.status(500).json({ erro: errorMessage });
    }
}));
exports.default = router;
