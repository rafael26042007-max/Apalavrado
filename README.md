# Apalavrado

> **Combinado é combinado.**

Apalavrado registra acordos informais, os "combinados" do dia a dia: o dinheiro emprestado pro amigo, o orçamento do pedreiro, a venda parcelada pro vizinho.

Quem cria o combinado manda um link pela outra pessoa (pelo WhatsApp, por exemplo). Ela abre, lê e clica em **Confirmo**, sem precisar instalar nada. A partir daí, o acordo fica registrado com data, hora, a confirmação das duas partes e uma "impressão digital" (hash SHA-256) que mostra se alguém alterou o conteúdo depois.

## O problema

No Brasil quase tudo é resolvido no "fio do bigode". Ninguém faz contrato pra emprestar R$ 300, mas depois ninguém lembra direito do que foi combinado, e a única prova é um áudio perdido no WhatsApp.

O Apalavrado fica no meio do caminho: **leve como uma mensagem, confiável como um registro.**

## Como funciona (MVP)

1. **Criar**: você preenche quem, o quê, quanto e até quando.
2. **Compartilhar**: o app gera dois links:
   - o **link de confirmação**, que você manda pra outra pessoa;
   - o **seu link de criador**, que você guarda pra acompanhar o combinado.
3. **Confirmar**: a outra pessoa abre o link e confirma (ou recusa).
4. **Registro**: o combinado fica com status, datas e hash de integridade.

## Rodando localmente

Precisa de **Node.js 22.13 ou mais novo**, porque o projeto usa o SQLite que já vem embutido no Node (`node:sqlite`).

```bash
npm install
npm run dev     # reinicia sozinho quando você salva um arquivo
# ou
npm start
```

Depois é só abrir http://localhost:3000.

O banco fica em `data/apalavrado.db` e é criado automaticamente na primeira execução.

## Estrutura

```
apalavrado/
├── public/              # front-end (HTML, CSS e JS puros)
│   ├── index.html       # tela de criar combinado
│   ├── combinado.html   # tela de ver / confirmar combinado
│   ├── css/style.css
│   └── js/
│       ├── criar.js
│       └── combinado.js
├── src/                 # back-end (Node + Express)
│   ├── server.js        # sobe o servidor
│   ├── db.js            # conexão e tabelas do SQLite
│   ├── routes/
│   │   └── combinados.js  # rotas da API
│   └── utils/
│       └── hash.js      # gera o hash de integridade e os IDs
└── data/                # banco SQLite (ignorado no git)
```

## API

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/api/combinados` | Cria um combinado e devolve os links |
| `GET` | `/api/combinados/:id` | Mostra um combinado (com `?t=token` mostra a visão do criador) |
| `POST` | `/api/combinados/:id/confirmar` | A outra parte confirma |
| `POST` | `/api/combinados/:id/recusar` | A outra parte recusa |

## Próximos passos

- [ ] Login simples (ou verificação por telefone) pra garantir quem confirmou
- [ ] Impedir que o próprio criador confirme o combinado
- [ ] Parcelas e lembretes de pagamento
- [ ] Gerar PDF do combinado
- [ ] Mandar o link direto pro WhatsApp
- [ ] Trocar o SQLite por PostgreSQL quando for pro ar
- [ ] Pesquisar o valor jurídico do registro (juizado de pequenas causas / Procon)
