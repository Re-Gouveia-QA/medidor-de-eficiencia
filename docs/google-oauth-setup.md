# Configurando credenciais do Google OAuth 2.0

Este guia explica como obter as credenciais necessárias para o "Login com Google" (Fase 5 do roadmap, `GET /auth/google` / `GET /auth/google/callback`, implementado em `src/services/GoogleAuthService.ts`).

Sem essas credenciais configuradas, o botão "Entrar com Google" continua visível, mas exibe um erro amigável ao ser usado — `GoogleAuthService.isConfigured()` retorna `false` quando qualquer uma das três variáveis abaixo está ausente.

## Variáveis necessárias

Definidas em `.env` (ver `.env.example`):

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

## Passo a passo no Google Cloud Console

1. **Acesse o Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com/)

2. **Crie ou selecione um projeto**
   - Menu superior → seletor de projetos → "Novo projeto"
   - Dê um nome (ex.: `medidor-de-eficiencia`) e confirme.

3. **Configure a tela de consentimento OAuth**
   - Menu lateral → **APIs e serviços** → **Tela de consentimento OAuth**
   - Tipo de usuário: **Externo** (a menos que sua conta seja Google Workspace e só usuários da organização vão logar — nesse caso, **Interno**)
   - Preencha os campos obrigatórios: nome do app, e-mail de suporte, e-mail de contato do desenvolvedor
   - Em **Escopos**, os padrões (`openid`, `email`, `profile`) já são suficientes — é só o que `GoogleAuthService` usa para obter nome/e-mail/`google_id` do usuário
   - Se o app ficar em modo "Teste" (comum para desenvolvimento), adicione os e-mails que vão testar o login em **Usuários de teste** — contas fora dessa lista são bloqueadas no consentimento

4. **Crie as credenciais OAuth Client ID**
   - Menu lateral → **APIs e serviços** → **Credenciais**
   - **+ Criar credenciais** → **ID do cliente OAuth**
   - Tipo de aplicativo: **Aplicativo da Web**
   - Nome: algo identificável (ex.: `Medidor de Eficiência - Web`)
   - **Origens JavaScript autorizadas**: URL base da aplicação, sem path
     - Dev: `http://localhost:3000`
     - Produção: `https://seu-dominio.com`
   - **URIs de redirecionamento autorizados**: precisa bater **exatamente** com `GOOGLE_CALLBACK_URL` (protocolo, host, porta e path idênticos — o Google rejeita qualquer diferença)
     - Dev: `http://localhost:3000/auth/google/callback`
     - Produção: `https://seu-dominio.com/auth/google/callback`
   - Clique em **Criar**

5. **Copie as credenciais geradas**
   - Um modal mostra **Client ID** e **Client Secret** — copie os dois
   - Também ficam disponíveis a qualquer momento na lista de Credenciais, clicando no ID do cliente criado

## Preenchendo o `.env`

```
GOOGLE_CLIENT_ID=<client-id-copiado>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<client-secret-copiado>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

Reinicie o servidor (`npm run dev`) após alterar o `.env` — as variáveis são lidas uma vez no boot (`src/config/env.ts`).

## Ambientes diferentes (dev / produção)

Origens e URIs de redirecionamento são amarradas ao domínio exato. Para ter dev e produção funcionando ao mesmo tempo, adicione **ambas** as combinações no mesmo Client ID (Origens JavaScript e URIs de redirecionamento aceitam múltiplas entradas), ou crie dois Client IDs separados (um por ambiente) e configure `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_CALLBACK_URL` diferentes em cada `.env`.

## Publicando o app (sair do modo "Teste")

Enquanto a tela de consentimento estiver em modo **Teste**, só os e-mails cadastrados como usuários de teste conseguem logar — qualquer outra conta Google recebe "Acesso bloqueado". Para permitir qualquer conta Google, em **Tela de consentimento OAuth** clique em **Publicar app**. Se os escopos solicitados forem só os básicos (`openid`/`email`/`profile`, como é o caso aqui), a publicação não exige verificação manual do Google.

## Erros comuns

- **`redirect_uri_mismatch`**: o `GOOGLE_CALLBACK_URL` do `.env` não bate caractere a caractere com um dos URIs cadastrados no Client ID (barra final, `http` vs `https`, porta faltando etc.).
- **"Acesso bloqueado: app não verificado"** com a conta que você está testando: adicione essa conta em **Usuários de teste**, ou publique o app (seção acima).
- **Botão "Entrar com Google" mostra erro no app**: uma das três variáveis (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_CALLBACK_URL`) está vazia ou ausente no `.env` — confira `GoogleAuthService.isConfigured()`.
