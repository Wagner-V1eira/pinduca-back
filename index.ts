import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'; 
import routesGibi from './routes/gibi';
import routesUsuario from './routes/usuario';
import routesLogin from './routes/login'; 
import authRouter from './routes/auth';
import routesReview from './routes/review';

dotenv.config();

const app = express();

app.use(express.json());

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; 
console.log(`[CORS] Configurando para permitir origem: ${frontendUrl}`);
app.use(cors({
    origin: frontendUrl, 
    credentials: true 
}));

app.use("/api/gibi", routesGibi);
app.use("/api/usuario", routesUsuario);
app.use("/api/review", routesReview);
app.use("/api/login", routesLogin);
app.use("/api/auth", authRouter);

app.get('/api', (req, res) => {
  res.status(200).json({ message: 'API Pinduca Reviews está operacional!' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001; 
  app.listen(PORT, () => {
    console.log(`[API Local Condicional] Servidor rodando na porta: ${PORT}`);
  });
}

export default app;