const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { connectDB } = require("./config/database");

const app = express();

// IMPORTANT: Configurez trust proxy pour ngrok
app.set('trust proxy', 1); // Faites confiance au premier proxy (ngrok)

// Connexion à la base de données
connectDB();

// Middleware de sécurité
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Rate limiting - CORRIGEZ la configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre
  standardHeaders: true, // Retourne les infos de rate limit dans les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  validate: {
    trustProxy: false // Important: désactive la validation du proxy si vous utilisez ngrok
  }
});

app.use(limiter);

// Middleware pour parser le JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/livreurs", require("./routes/livreur/livreur"));
app.use("/api/auth/livreur", require("./routes/livreur/livreurAuth"));
app.use("/api/auth/user", require("./routes/userAuth"));
app.use('/api/commandes', require("./routes/commande"));
app.use('/api/livreur/commandes', require('./routes/livreur/commandeRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/paiements',require('./routes/adminPaiementRoutes'));

// Routes paiements
app.use('/api/paiements', require('./routes/paiementRoutes'));

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route non trouvée",
    path: req.originalUrl,
  });
});

// Gestion des erreurs
app.use((error, req, res, next) => {
  console.error("Erreur:", error);
  res.status(500).json({
    success: false,
    message: "Erreur interne du serveur",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});
// server.js - ajouter ce middleware au début
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl}`);
  console.log('📦 Body:', req.body);
  console.log('🔑 Headers:', req.headers.authorization ? 'Token présent' : 'Pas de token');
  console.log('---');
  next();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🎯 Serveur démarré sur le port ${PORT}`);
  console.log(`🗄️  Base de données: MySQL`);
  console.log(`🌐 Environnement: ${process.env.NODE_ENV}`);
});