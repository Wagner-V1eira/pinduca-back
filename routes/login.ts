import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const router = Router()

const loginSchema = z.object({
    email: z.string().email({ message: "Email inválido" }),
    senha: z.string().min(6, { message: "Senha deve possuir, no mínimo, 6 caracteres" }),
})

router.post("/", async (req, res) => {
    const valida = loginSchema.safeParse(req.body)
    if (!valida.success) {
        const primeiraMensagem = valida.error.errors[0]?.message || "Erro de validação";
        return res.status(400).json({ erro: primeiraMensagem });
    }

    const { email, senha } = valida.data

    try {
        const usuario = await prisma.usuario.findUnique({
            where: { email },
            select: {
                id: true,
                nome: true,
                email: true,
                senha: true,
                role: true, 
            }
        })

        if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
            return res.status(401).json({ erro: "Credenciais inválidas" })
        }

        const { senha: _, ...usuarioSemSenha } = usuario;

        const token = jwt.sign(
           { userId: usuario.id, role: usuario.role }, 
            process.env.JWT_SECRET || 'SECRET_KEY',
           { expiresIn: '1h' }
        )

        res.status(200).json({ token, user: usuarioSemSenha }) 

    } catch (error) {
        console.error("Erro no login:", error);
        let errorMessage = 'Erro no servidor';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        res.status(500).json({ erro: errorMessage });
    }
})


export default router