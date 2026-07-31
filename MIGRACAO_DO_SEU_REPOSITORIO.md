# Migração do repositório DouglasleoAmaral/nutricao

Este pacote foi preparado para o repositório correto:

- https://github.com/DouglasleoAmaral/nutricao

## Linguagem utilizada

O projeto usa somente JavaScript no código da aplicação:

- Front-end: HTML, CSS e JavaScript puro.
- Back-end: Node.js com Express, também JavaScript.
- Não existe Python e não há arquivo `.py`.

## Por que adicionar Node.js

O projeto original funciona apenas no navegador. Isso é suficiente para cálculos locais, mas não permite com segurança:

- administrador cadastrar várias nutricionistas;
- ativar ou pausar licença por quantidade de dias;
- separar os dados de cada nutricionista;
- criar login próprio para cada paciente;
- bloquear automaticamente contas vencidas;
- manter prontuários fora do `localStorage` do navegador.

O Node.js executa o servidor e continua sendo JavaScript.

## O que foi preservado

A base TACO existente foi copiada para:

```text
public/dados/tabela_taco.js
```

Os arquivos JavaScript e CSS originais foram guardados para consulta em:

```text
legacy-do-repositorio/script-original.js
legacy-do-repositorio/style-original.css
```

## Instalação no Codespaces

Na raiz do repositório:

```bash
cp .env.example .env
npm install
npm run dev
```

Abra a porta 3000 na aba PORTS do Codespaces.

## Administrador inicial

Edite `.env` antes da primeira execução:

```env
PORT=3000
SESSION_SECRET=crie-uma-chave-longa-e-aleatoria
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@seudominio.com
ADMIN_PASSWORD=TroqueEstaSenha123!
```

## Substituir o conteúdo atual com segurança

```bash
mkdir -p backup-versao-antiga
cp -r index.html style.css script.js tabela_taco.js dados backup-versao-antiga/ 2>/dev/null || true
```

Depois copie o conteúdo deste pacote para a raiz e execute `npm install`.

## Observação para produção

O MVP usa JSON para facilitar o teste no Codespaces. Antes de atender clientes reais, troque por PostgreSQL ou Supabase e faça uma revisão completa de segurança e LGPD.
