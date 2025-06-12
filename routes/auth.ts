import { PrismaClient } from '@prisma/client'; 
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendEmail } from '../utils/enviaEmai'; 

const prisma = new PrismaClient();
const router = Router();

const requestPasswordResetSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
});

router.post("/request-password-reset", async (req: Request, res: Response) => {
  const validation = requestPasswordResetSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ erro: "Email inválido.", detalhes: validation.error.flatten().fieldErrors });
  }
  const { email } = validation.data;

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (usuario) {
      const codigoSeisDigitos = crypto.randomInt(100000, 999999).toString();
      const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); 

      await prisma.usuario.update({
        where: { email },
        data: {
          codRecuperaSenha: codigoSeisDigitos, 
          codRecuperaSenhaExpiracao: resetTokenExpires,
        },
      });

      const frontendResetUrl = `${process.env.FRONTEND_URL}/redefinir-senha?email=${encodeURIComponent(email)}`;
      const nomeUsuario = usuario.nome || 'Usuário';
      const subject = 'Código de Redefinição de Senha - Pinduca Reviews';
      const text = `Prezado ${nomeUsuario}, seu código de recuperação de senha é: ${codigoSeisDigitos}. Use este código e o link a seguir para redefinir sua senha: ${frontendResetUrl}. O código expira em 10 minutos.`;
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Recuperação de Senha</h2>
          <p>Olá ${nomeUsuario},</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta em Pinduca Reviews.</p>
          <p>Anote ou copie o seu <strong>código de recuperação</strong> abaixo. Você precisará dele na próxima tela:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #D97706; margin: 20px 0; padding: 10px; background-color: #f3f4f6; text-align: center; border-radius: 5px;">
            ${codigoSeisDigitos}
          </p>
          <p>Este código é válido por 10 minutos.</p>
          <p>Para prosseguir com a redefinição de senha, clique no link abaixo:</p>
          <p><a href="${frontendResetUrl}" style="color: #D97706; text-decoration: none; font-weight: bold;">Redefinir Minha Senha Agora</a></p>
          <p>Se o link não funcionar, copie e cole a seguinte URL no seu navegador:</p>
          <p>${frontendResetUrl}</p>
          <p>Se você não solicitou uma redefinição de senha, por favor, ignore este e-mail.</p>
          <p>Atenciosamente,<br>Equipe Pinduca Reviews</p>
        </div>
      `;

      await sendEmail({
        to: usuario.email,
        subject,
        text,
        html,
      });
      console.log(`Email com código de 6 dígitos enviado para ${usuario.email}`);
    } else {
      console.log(`Solicitação de reset para email não encontrado (ou encontrado, não revelamos): ${email}`);
    }
    
    return res.status(200).json({ message: "Se um usuário com este email existir, um código de redefinição de senha foi enviado." });

  } catch (error) {
    console.error("Erro ao solicitar redefinição de senha:", error);
    return res.status(500).json({ erro: "Erro interno ao processar sua solicitação." });
  }
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  codigoRecuperacao: z.string().length(6, { message: "O código de recuperação deve ter 6 dígitos." }), 
  novaSenha: z.string().min(6, { message: "A nova senha deve ter pelo menos 6 caracteres" }),
  confirmacaoNovaSenha: z.string(),
}).refine(data => data.novaSenha === data.confirmacaoNovaSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarNovaSenha"],
});

router.post("/reset-password", async (req: Request, res: Response) => {
     console.log("Backend /reset-password - Corpo da Requisição Recebido:", req.body);
  const validation = resetPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ erro: "Dados inválidos.", detalhes: validation.error.flatten().fieldErrors });
  }

  const { email, codigoRecuperacao, novaSenha } = validation.data;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario || !usuario.codRecuperaSenha || !usuario.codRecuperaSenhaExpiracao) {
      
      return res.status(400).json({ erro: "Solicitação inválida ou código expirado. Por favor, tente novamente." });
    }

    if (new Date() > usuario.codRecuperaSenhaExpiracao) {
      
      await prisma.usuario.update({
          where: {id: usuario.id},
          data: {codRecuperaSenha: null, codRecuperaSenhaExpiracao: null}
      });
      return res.status(400).json({ erro: "Código de recuperação expirado. Por favor, solicite um novo." });
    }

    if (usuario.codRecuperaSenha !== codigoRecuperacao) {
      return res.status(400).json({ erro: "Código de recuperação inválido." });
    }

    const hashedNovaSenha = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({
      where: { email }, 
      data: {
        senha: hashedNovaSenha,
        codRecuperaSenha: null, 
        codRecuperaSenhaExpiracao: null, 
      },
    });

    return res.status(200).json({ message: "Senha redefinida com sucesso!" });

  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return res.status(500).json({ erro: "Erro interno ao redefinir sua senha." });
  }
});

export default router;