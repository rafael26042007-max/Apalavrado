// =============================================================
// criar.js — tela de criar combinado (index.html)
// =============================================================

// -------------------------------------------------------------
// 1. Elementos da página
// -------------------------------------------------------------
const form = document.getElementById('form-criar');
const caixaErros = document.getElementById('erros-criar');
const botaoCriar = document.getElementById('botao-criar');
const telaCriar = document.getElementById('tela-criar');
const telaCriado = document.getElementById('tela-criado');

// -------------------------------------------------------------
// 2. Funções auxiliares
// -------------------------------------------------------------

// Mostra a lista de erros (usa textContent para evitar injeção de HTML)
function mostrarErros(erros) {
  caixaErros.replaceChildren();
  const lista = document.createElement('ul');
  for (const erro of erros) {
    const item = document.createElement('li');
    item.textContent = erro;
    lista.appendChild(item);
  }
  caixaErros.appendChild(lista);
  caixaErros.classList.remove('escondido');
  caixaErros.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function esconderErros() {
  caixaErros.classList.add('escondido');
  caixaErros.replaceChildren();
}

// Transforma "/c/abc" em "http://site.com/c/abc"
function linkCompleto(caminho) {
  return new URL(caminho, window.location.origin).href;
}

// -------------------------------------------------------------
// 3. Envio do formulário
// -------------------------------------------------------------
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  esconderErros();

  const dados = Object.fromEntries(new FormData(form));

  botaoCriar.disabled = true;
  botaoCriar.textContent = 'Criando...';

  try {
    const resposta = await fetch('/api/combinados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const corpo = await resposta.json();

    if (!resposta.ok) {
      mostrarErros(corpo.erros || ['Não foi possível criar o combinado.']);
      return;
    }

    mostrarCriado(corpo, dados);
  } catch {
    mostrarErros(['Sem conexão com o servidor. Tente de novo.']);
  } finally {
    botaoCriar.disabled = false;
    botaoCriar.textContent = 'Criar combinado';
  }
});

// -------------------------------------------------------------
// 4. Tela de "combinado criado"
// -------------------------------------------------------------
function mostrarCriado(corpo, dados) {
  const linkConfirmacao = linkCompleto(corpo.link_confirmacao);
  const linkCriador = linkCompleto(corpo.link_criador);

  document.getElementById('nome-outra-parte').textContent = dados.outra_parte_nome;
  document.getElementById('link-confirmacao').value = linkConfirmacao;
  document.getElementById('link-criador').value = linkCriador;
  document.getElementById('botao-acompanhar').href = linkCriador;

  // Mensagem pronta para o WhatsApp
  const texto =
    `Oi, ${dados.outra_parte_nome}! Registrei nosso combinado "${dados.titulo}" no Apalavrado. ` +
    `Dá uma olhada e confirma aqui: ${linkConfirmacao}`;
  document.getElementById('botao-whatsapp').href =
    'https://wa.me/?text=' + encodeURIComponent(texto);

  telaCriar.classList.add('escondido');
  telaCriado.classList.remove('escondido');
  window.scrollTo({ top: 0 });
}

// -------------------------------------------------------------
// 5. Botões de copiar
// -------------------------------------------------------------
document.querySelectorAll('[data-copiar]').forEach((botao) => {
  botao.addEventListener('click', async () => {
    const campo = document.getElementById(botao.dataset.copiar);
    try {
      await navigator.clipboard.writeText(campo.value);
    } catch {
      campo.select(); // se o navegador bloquear, pelo menos seleciona o texto
      document.execCommand('copy');
    }
    botao.textContent = 'Copiado!';
    setTimeout(() => (botao.textContent = 'Copiar'), 1800);
  });
});
