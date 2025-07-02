import express from "express";
import cors from "cors";
import routesGibi from "./routes/gibi";
import routesUsuario from "./routes/usuario";
import routesLogin from "./routes/login";
import authRouter from "./routes/auth";
import routesReview from "./routes/review";
import routesDashboard from "./routes/dashboard";

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

app.use("/api/gibi", routesGibi);
app.use("/api/usuario", routesUsuario);
app.use("/api/review", routesReview);
app.use("/api/login", routesLogin);
app.use("/api/auth", authRouter);
app.use("/api", routesDashboard);

app.get("/api", (req, res) => {
  res.status(200).json({ message: "API Pinduca Reviews está operacional!" });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`);
});

export default app;
