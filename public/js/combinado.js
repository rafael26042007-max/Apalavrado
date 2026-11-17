// =============================================================
// combinado.js — tela de ver / confirmar combinado (combinado.html)
// =============================================================

// -------------------------------------------------------------
// 1. Dados da URL: /c/:id?t=token
// -------------------------------------------------------------
const id = decodeURIComponent(window.location.pathname.split('/').pop());
const token = new URLSearchParams(window.location.search).get('t') || '';

// Atalho para pegar elementos pelo id
const $ = (idElemento) => document.getElementById(idElemento);

// -------------------------------------------------------------
// 2. Formatação (dinheiro, datas)
// -------------------------------------------------------------
const formatoReal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatoDataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

function formatarValor(centavos) {
  return centavos === null || centavos === undefined ? '—' : formatoReal.format(centavos / 100);
}

// "2026-12-20" → "20/12/2026" (sem passar por Date, para não mudar o dia por fuso)
function formatarPrazo(prazo) {
  if (!prazo) return '—';
  const [ano, mes, dia] = prazo.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(iso) {
  return formatoDataHora.format(new Date(iso));
}

const nomesStatus = {
  pendente: 'Aguardando confirmação',
  confirmado: 'Confirmado',
  recusado: 'Recusado',
};

// -------------------------------------------------------------
// 3. Desenha o combinado na tela
// -------------------------------------------------------------
function mostrar(combinado) {
  $('carregando').classList.add('escondido');
  $('tela-combinado').classList.remove('escondido');
  document.title = `${combinado.titulo}: Apalavrado`;

  // --- Conteúdo ---
  $('status').textContent = nomesStatus[combinado.status];
  $('status').className = `status ${combinado.status}`;
  $('titulo').textContent = combinado.titulo;
  $('criador-nome').textContent = combinado.criador_nome;
  $('outra-parte-nome').textContent = combinado.outra_parte_nome;
  $('descricao').textContent = combinado.descricao;
  $('valor').textContent = formatarValor(combinado.valor_centavos);
  $('prazo').textContent = formatarPrazo(combinado.prazo);

  // --- Registro ---
  $('linha-criado').textContent =
    `Criado por ${combinado.criador_nome} em ${formatarDataHora(combinado.criado_em)}.`;

  if (combinado.respondido_em) {
    const verbo = combinado.status === 'confirmado' ? 'Confirmado' : 'Recusado';
    $('linha-respondido').textContent =
      `${verbo} por ${combinado.respondido_nome} em ${formatarDataHora(combinado.respondido_em)}.`;
    $('linha-respondido').classList.remove('escondido');
  }

  $('linha-integridade').textContent = combinado.integro
    ? '✔ O conteúdo não foi alterado desde a criação.'
    : '⚠ Atenção: o conteúdo não bate com o registro original.';
  $('hash').textContent = combinado.hash_conteudo;

  // --- O que mostrar para cada pessoa ---
  $('selo').classList.toggle('escondido', combinado.status !== 'confirmado');
  $('aviso-criador').classList.toggle('escondido', !combinado.eh_criador);

  const pendente = combinado.status === 'pendente';
  $('area-resposta').classList.toggle('escondido', !pendente || combinado.eh_criador);
  $('area-compartilhar').classList.toggle('escondido', !pendente || !combinado.eh_criador);

  if (pendente && combinado.eh_criador) prepararCompartilhar(combinado);
}

// -------------------------------------------------------------
// 4. Criador: compartilhar o link de confirmação
// -------------------------------------------------------------
function prepararCompartilhar(combinado) {
  const link = new URL(`/c/${combinado.id}`, window.location.origin).href;
  $('link-confirmacao').value = link;

  const texto =
    `Oi, ${combinado.outra_parte_nome}! Registrei nosso combinado "${combinado.titulo}" no Apalavrado. ` +
    `Dá uma olhada e confirma aqui: ${link}`;
  $('botao-whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent(texto);
}

$('botao-copiar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('link-confirmacao').value);
  } catch {
    $('link-confirmacao').select();
    document.execCommand('copy');
  }
  $('botao-copiar').textContent = 'Copiado!';
  setTimeout(() => ($('botao-copiar').textContent = 'Copiar'), 1800);
});

// -------------------------------------------------------------
// 5. Outra parte: confirmar ou recusar
// -------------------------------------------------------------
async function responder(acao) {
  const nome = $('nome-resposta').value.trim();
  const caixaErro = $('erro-resposta');
  caixaErro.classList.add('escondido');

  if (!nome) {
    caixaErro.textContent = 'Digite o seu nome para responder.';
    caixaErro.classList.remove('escondido');
    $('nome-resposta').focus();
    return;
  }

  if (acao === 'recusar' && !confirm('Tem certeza que quer recusar este combinado?')) return;

  $('botao-confirmar').disabled = true;
  $('botao-recusar').disabled = true;

  try {
    const resposta = await fetch(`/api/combinados/${encodeURIComponent(id)}/${acao}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, t: token }),
    });
    const corpo = await resposta.json();

    if (!resposta.ok) {
      caixaErro.textContent = (corpo.erros || ['Não foi possível responder.']).join(' ');
      caixaErro.classList.remove('escondido');
      return;
    }

    mostrar(corpo);
  } catch {
    caixaErro.textContent = 'Sem conexão com o servidor. Tente de novo.';
    caixaErro.classList.remove('escondido');
  } finally {
    $('botao-confirmar').disabled = false;
    $('botao-recusar').disabled = false;
  }
}

$('botao-confirmar').addEventListener('click', () => responder('confirmar'));
$('botao-recusar').addEventListener('click', () => responder('recusar'));

// -------------------------------------------------------------
// 6. Carrega o combinado ao abrir a página
// -------------------------------------------------------------
async function carregar() {
  try {
    const url = `/api/combinados/${encodeURIComponent(id)}` + (token ? `?t=${encodeURIComponent(token)}` : '');
    const resposta = await fetch(url);
    const corpo = await resposta.json();

    if (!resposta.ok) throw new Error((corpo.erros || ['Combinado não encontrado.']).join(' '));
    mostrar(corpo);
  } catch (erro) {
    $('carregando').classList.add('escondido');
    $('erro-geral').textContent = erro.message || 'Não foi possível carregar o combinado.';
    $('erro-geral').classList.remove('escondido');
  }
}

carregar();
