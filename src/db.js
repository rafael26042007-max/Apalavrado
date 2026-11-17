// =============================================================
// db.js — conexão com o banco SQLite e criação das tabelas
// Usa o SQLite que já vem no Node (node:sqlite), sem dependência extra.
// =============================================================

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// -------------------------------------------------------------
// 1. Caminho do arquivo do banco
// -------------------------------------------------------------
const pastaDados = path.join(__dirname, '..', 'data');
fs.mkdirSync(pastaDados, { recursive: true });

const caminhoBanco = process.env.DB_PATH || path.join(pastaDados, 'apalavrado.db');

// -------------------------------------------------------------
// 2. Abre a conexão
// -------------------------------------------------------------
const db = new DatabaseSync(caminhoBanco);

// Deixa o SQLite mais seguro para gravações simultâneas
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// -------------------------------------------------------------
// 3. Criação das tabelas (só cria se ainda não existirem)
// -------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS combinados (
    id                TEXT PRIMARY KEY,      -- ID público, vai no link
    token_criador     TEXT NOT NULL,         -- segredo do criador (link de acompanhamento)

    titulo            TEXT NOT NULL,         -- ex: "Empréstimo pra moto"
    descricao         TEXT NOT NULL,         -- o que foi combinado, em detalhes
    valor_centavos    INTEGER,               -- valor em centavos (evita erro de arredondamento)
    prazo             TEXT,                  -- data limite, formato AAAA-MM-DD

    criador_nome      TEXT NOT NULL,
    outra_parte_nome  TEXT NOT NULL,

    status            TEXT NOT NULL DEFAULT 'pendente'
                      CHECK (status IN ('pendente', 'confirmado', 'recusado')),

    hash_conteudo     TEXT NOT NULL,         -- SHA-256 do conteúdo, gerado na criação
    criado_em         TEXT NOT NULL,         -- data/hora ISO da criação
    respondido_em     TEXT,                  -- data/hora ISO da confirmação/recusa
    respondido_nome   TEXT                   -- nome digitado por quem confirmou/recusou
  );
`);

module.exports = db;
