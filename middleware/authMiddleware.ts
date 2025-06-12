import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { Request } from 'express';

interface JwtPayload {
  userId: number;
  role: Role; 
}

export interface RequestWithAuth extends Request {
  user?: JwtPayload; 
}

const authMiddleware = (req: RequestWithAuth, res: Response, next: NextFunction) => {
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

    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    console.log(`Auth Middleware: Token válido para userId: ${decoded.userId}`);
    next();
  } catch (error) {
    console.warn('Auth Middleware: Erro na verificação do token:', error);
    if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ erro: 'Token inválido.' });
    }
    return res.status(401).json({ erro: 'Falha na autenticação.' });
  }
};

export default authMiddleware;