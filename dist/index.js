"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const gibi_1 = __importDefault(require("./routes/gibi"));
const nota_1 = __importDefault(require("./routes/nota"));
const usuario_1 = __importDefault(require("./routes/usuario"));
const comentario_1 = __importDefault(require("./routes/comentario"));
const login_1 = __importDefault(require("./routes/login"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
console.log(`[CORS] Configurando para permitir origem: ${frontendUrl}`);
app.use((0, cors_1.default)({
    origin: frontendUrl,
    credentials: true
}));
app.use("/api/gibi", gibi_1.default);
app.use("/api/nota", nota_1.default);
app.use("/api/usuario", usuario_1.default);
app.use("/api/comentario", comentario_1.default);
app.use("/api/login", login_1.default);
app.get('/api', (req, res) => {
    res.status(200).json({ message: 'API Pinduca Reviews está operacional!' });
});
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`[API Local Condicional] Servidor rodando na porta: ${PORT}`);
    });
}
exports.default = app;
