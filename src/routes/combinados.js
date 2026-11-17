// =============================================================
// routes/combinados.js — rotas da API de combinados
// =============================================================

const express = require('express');
const db = require('../db');
const {
  gerarId,
  gerarToken,
  gerarHashConteudo,
  conferirIntegridade,
  tokensIguais,
} = require('../utils/hash');

const router = express.Router();

// -------------------------------------------------------------
// 1. Funções auxiliares
// -------------------------------------------------------------

// Limpa espaços e garante que é texto
function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// Converte "1.250,50" ou "1250.50" ou 1250.5 em centavos (125050)
function paraCentavos(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor === 'number') return Math.round(valor * 100);

  let limpo = String(valor).replace(/[^\d,.-]/g, '');
  if (!/\d/.test(limpo)) return NaN; // ex: "abc" não tem número nenhum
  // Formato brasileiro: ponto é milhar e vírgula é decimal
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.');

  const numero = Number(limpo);
  return Number.isFinite(numero) ? Math.round(numero * 100) : NaN;
}

// Confere se a data está no formato AAAA-MM-DD e é válida
function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(valor + 'T00:00:00Z');
  return !Number.isNaN(data.getTime()) && data.toISOString().startsWith(valor);
}

// Monta o objeto que a API devolve (nunca inclui o token do criador)
function paraResposta(combinado, ehCriador) {
  return {
    id: combinado.id,
    titulo: combinado.titulo,
    descricao: combinado.descricao,
    valor_centavos: combinado.valor_centavos,
    prazo: combinado.prazo,
    criador_nome: combinado.criador_nome,
    outra_parte_nome: combinado.outra_parte_nome,
    status: combinado.status,
    criado_em: combinado.criado_em,
    respondido_em: combinado.respondido_em,
    respondido_nome: combinado.respondido_nome,
    hash_conteudo: combinado.hash_conteudo,
    integro: conferirIntegridade(combinado),
    eh_criador: ehCriador,
  };
}

// Busca o combinado pelo ID público
const buscarPorId = db.prepare('SELECT * FROM combinados WHERE id = ?');

// -------------------------------------------------------------
// 2. POST /api/combinados — cria um combinado
// -------------------------------------------------------------
router.post('/', (req, res) => {
  const titulo = texto(req.body.titulo);
  const descricao = texto(req.body.descricao);
  const criador_nome = texto(req.body.criador_nome);
  const outra_parte_nome = texto(req.body.outra_parte_nome);
  const prazo = texto(req.body.prazo) || null;
  const valor_centavos = paraCentavos(req.body.valor);

  // --- Validação ---
  const erros = [];
  if (!titulo) erros.push('Dê um título para o combinado.');
  if (titulo.length > 120) erros.push('O título pode ter no máximo 120 caracteres.');
  if (!descricao) erros.push('Descreva o que foi combinado.');
  if (descricao.length > 2000) erros.push('A descrição pode ter no máximo 2000 caracteres.');
  if (!criador_nome) erros.push('Informe o seu nome.');
  if (!outra_parte_nome) erros.push('Informe o nome da outra pessoa.');
  if (criador_nome.length > 80 || outra_parte_nome.length > 80) erros.push('Nomes podem ter no máximo 80 caracteres.');
  if (Number.isNaN(valor_centavos)) erros.push('Valor inválido.');
  if (valor_centavos !== null && valor_centavos < 0) erros.push('O valor não pode ser negativo.');
  if (prazo && !dataValida(prazo)) erros.push('Prazo inválido.');

  if (erros.length > 0) {
    return res.status(400).json({ erros });
  }

  // --- Monta e salva ---
  const combinado = {
    id: gerarId(),
    token_criador: gerarToken(),
    titulo,
    descricao,
    valor_centavos,
    prazo,
    criador_nome,
    outra_parte_nome,
    criado_em: new Date().toISOString(),
  };
  combinado.hash_conteudo = gerarHashConteudo(combinado);

  db.prepare(`
    INSERT INTO combinados
      (id, token_criador, titulo, descricao, valor_centavos, prazo,
       criador_nome, outra_parte_nome, hash_conteudo, criado_em)
    VALUES
      (:id, :token_criador, :titulo, :descricao, :valor_centavos, :prazo,
       :criador_nome, :outra_parte_nome, :hash_conteudo, :criado_em)
  `).run(combinado);

  // --- Devolve os dois links ---
  return res.status(201).json({
    id: combinado.id,
    link_confirmacao: `/c/${combinado.id}`,
    link_criador: `/c/${combinado.id}?t=${combinado.token_criador}`,
  });
});

// -------------------------------------------------------------
// 3. GET /api/combinados/:id — mostra um combinado
//    Com ?t=token, quem abre é identificado como o criador.
// -------------------------------------------------------------
router.get('/:id', (req, res) => {
  const combinado = buscarPorId.get(req.params.id);
  if (!combinado) {
    return res.status(404).json({ erros: ['Combinado não encontrado.'] });
  }

  const ehCriador = tokensIguais(req.query.t, combinado.token_criador);
  return res.json(paraResposta(combinado, ehCriador));
});

// -------------------------------------------------------------
// 4. POST /api/combinados/:id/confirmar  e  /recusar
//    A outra parte responde ao combinado (só uma vez).
// -------------------------------------------------------------
function responder(novoStatus) {
  return (req, res) => {
    const combinado = buscarPorId.get(req.params.id);
    if (!combinado) {
      return res.status(404).json({ erros: ['Combinado não encontrado.'] });
    }

    // O criador não pode responder o próprio combinado
    if (tokensIguais(req.body.t, combinado.token_criador)) {
      return res.status(403).json({ erros: ['Quem criou o combinado não pode confirmar nem recusar.'] });
    }

    if (combinado.status !== 'pendente') {
      return res.status(409).json({ erros: [`Este combinado já foi ${combinado.status}.`] });
    }

    const nome = texto(req.body.nome);
    if (!nome) {
      return res.status(400).json({ erros: ['Digite o seu nome para responder.'] });
    }
    if (nome.length > 80) {
      return res.status(400).json({ erros: ['O nome pode ter no máximo 80 caracteres.'] });
    }

    // "AND status = 'pendente'" evita que duas respostas ao mesmo tempo passem
    const resultado = db.prepare(`
      UPDATE combinados
         SET status = ?, respondido_em = ?, respondido_nome = ?
       WHERE id = ? AND status = 'pendente'
    `).run(novoStatus, new Date().toISOString(), nome, combinado.id);

    if (resultado.changes === 0) {
      return res.status(409).json({ erros: ['Este combinado já foi respondido.'] });
    }

    return res.json(paraResposta(buscarPorId.get(combinado.id), false));
  };
}

router.post('/:id/confirmar', responder('confirmado'));
router.post('/:id/recusar', responder('recusado'));

module.exports = router;
