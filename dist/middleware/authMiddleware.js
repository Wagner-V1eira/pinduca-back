"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Auth Middleware: Token ausente ou mal formatado.');
        return res.status(401).json({ erro: 'Acesso não autorizado. Token não fornecido ou inválido.' });
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('Auth Middleware: JWT_SECRET não está definida no .env!');
        return res.status(500).json({ erro: 'Erro interno do servidor [Auth Config].' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        console.log(`Auth Middleware: Token válido para userId: ${decoded.userId}`);
        next();
    }
    catch (error) {
        console.warn('Auth Middleware: Erro na verificação do token:', error);
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ erro: 'Token inválido.' });
        }
        return res.status(401).json({ erro: 'Falha na autenticação.' });
    }
};
exports.default = authMiddleware;
