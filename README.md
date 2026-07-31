# NutriGestor — versão JavaScript para o repositório nutricao

Este projeto adapta o repositório `DouglasleoAmaral/nutricao` para um MVP funcional usando somente HTML, CSS e JavaScript. O servidor é Node.js/Express, que também é JavaScript. Não há Python no projeto.

## O que já funciona

- Administrador geral.
- Cadastro de várias nutricionistas.
- Ativação, soma, redefinição e pausa de dias de licença.
- Bloqueio automático quando a licença vence.
- Cadastro de pacientes pela nutricionista.
- Login individual para cada paciente.
- Prontuário básico.
- Avaliação antropométrica.
- IMC para adulto e idoso.
- Peso ideal, adequação, peso ajustado e perda de peso.
- Classificação de risco pela circunferência da cintura.
- TMB e GET usando fórmulas FAO/OMS 1985 e DRI 2002 incluídas no Manual RealClin 2026.
- Plano alimentar liberado para o paciente.
- Agenda básica.
- Diário alimentar preenchido pelo paciente.
- Registro de auditoria das principais ações.

## Como instalar no Codespace

1. Faça backup dos arquivos antigos.
2. Copie todos os arquivos deste projeto para a raiz do repositório.
3. No terminal:

```bash
cp .env.example .env
npm install
npm run dev
```

4. Abra a aba **PORTS** e acesse a porta `3000`.
5. Entre com o e-mail e a senha definidos no `.env`.

## Credenciais iniciais

Edite o arquivo `.env`:

```env
PORT=3000
SESSION_SECRET=coloque-uma-chave-longa-e-aleatoria
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@nutriplataforma.com
ADMIN_PASSWORD=TroqueEstaSenha123!
```

O administrador é criado apenas na primeira execução. Se você alterar a senha no `.env` depois que `data/database.json` já existir, a senha antiga continuará válida. Para reiniciar totalmente o ambiente de teste, apague `data/database.json` e execute novamente.

## Banco de dados

O MVP usa `data/database.json` para rodar sem instalar banco externo. Isso facilita testes no Codespaces, mas **não é apropriado para publicar prontuários reais em produção**.

Antes de vender o sistema, migre para PostgreSQL ou Supabase e implemente:

- sessão persistente;
- backups;
- criptografia e gestão de segredos;
- recuperação de senha;
- confirmação de e-mail;
- controle detalhado de permissões;
- logs imutáveis;
- consentimentos e política de retenção;
- exportação e exclusão de dados;
- revisão jurídica e técnica para LGPD;
- revisão clínica de todas as fórmulas.

## Estrutura

```text
.
├── .devcontainer/devcontainer.json
├── data/database.example.json
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

## Publicar as alterações

```bash
git add .
git commit -m "Transforma projeto em SaaS para nutricionistas"
git push
```

## Aviso clínico

As calculadoras são ferramentas de apoio. Diagnóstico, conduta, prescrição e interpretação permanecem sob responsabilidade da nutricionista. Revise as referências do Manual RealClin 2026 antes de uso clínico comercial.
