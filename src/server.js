// =============================================================
// server.js — ponto de entrada do Apalavrado
// =============================================================

const express = require('express');
const path = require('node:path');
const rotasCombinados = require('./routes/combinados');

const app = express();
const PORTA = process.env.PORT || 3000;
const pastaPublica = path.join(__dirname, '..', 'public');

// -------------------------------------------------------------
// 1. Middlewares
// -------------------------------------------------------------
app.use(express.json({ limit: '20kb' }));      // lê o corpo das requisições em JSON
app.use(express.static(pastaPublica));          // serve o front-end (HTML, CSS, JS)

// -------------------------------------------------------------
// 2. Rotas da API
// -------------------------------------------------------------
app.use('/api/combinados', rotasCombinados);

// -------------------------------------------------------------
// 3. Páginas
// -------------------------------------------------------------

// Link de confirmação / acompanhamento: /c/kZ3x9QpL2aE
app.get('/c/:id', (req, res) => {
  res.sendFile(path.join(pastaPublica, 'combinado.html'));
});

// -------------------------------------------------------------
// 4. Tratamento de erros
// -------------------------------------------------------------

// Rota da API que não existe
app.use('/api', (req, res) => {
  res.status(404).json({ erros: ['Rota não encontrada.'] });
});

// Qualquer erro inesperado
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erros: ['JSON inválido.'] });
  }
  console.error(err);
  res.status(500).json({ erros: ['Erro interno. Tente de novo.'] });
});

// -------------------------------------------------------------
// 5. Sobe o servidor
// -------------------------------------------------------------
app.listen(PORTA, () => {
  console.log(`Apalavrado rodando em http://localhost:${PORTA}`);
});
