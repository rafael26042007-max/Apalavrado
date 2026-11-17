// =============================================================
// hash.js — "impressão digital" dos combinados e geração de IDs
// =============================================================

const crypto = require('node:crypto');

// -------------------------------------------------------------
// 1. Geração de IDs
// -------------------------------------------------------------

// ID curto e público, que vai no link de confirmação (ex: "kZ3x9QpL2aE")
function gerarId() {
  return crypto.randomBytes(8).toString('base64url');
}

// Token longo e secreto, que só o criador recebe
function gerarToken() {
  return crypto.randomBytes(24).toString('base64url');
}

// -------------------------------------------------------------
// 2. Hash de integridade
// -------------------------------------------------------------

// Junta os campos do acordo SEMPRE na mesma ordem e gera um SHA-256.
// Se qualquer letra do combinado mudar depois, o hash muda junto,
// e dá pra provar que o conteúdo foi alterado.
function gerarHashConteudo(combinado) {
  const conteudo = {
    id: combinado.id,
    titulo: combinado.titulo,
    descricao: combinado.descricao,
    valor_centavos: combinado.valor_centavos ?? null,
    prazo: combinado.prazo ?? null,
    criador_nome: combinado.criador_nome,
    outra_parte_nome: combinado.outra_parte_nome,
    criado_em: combinado.criado_em,
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(conteudo))
    .digest('hex');
}

// Confere se o combinado guardado ainda bate com o hash original
function conferirIntegridade(combinado) {
  return gerarHashConteudo(combinado) === combinado.hash_conteudo;
}

// -------------------------------------------------------------
// 3. Comparação segura de tokens
// -------------------------------------------------------------

// Compara em tempo constante para não vazar informação pelo tempo de resposta
function tokensIguais(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  gerarId,
  gerarToken,
  gerarHashConteudo,
  conferirIntegridade,
  tokensIguais,
};
