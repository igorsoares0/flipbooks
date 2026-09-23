# Flipbook SaaS — Spec-Driven Development

## 1. Visão do Produto

Webapp SaaS para criação, edição, publicação e compartilhamento de flipbooks digitais.

O produto terá dois fluxos principais:

1. **From PDF** — usuário envia um PDF existente e o sistema o transforma em um flipbook.
2. **From Scratch** — usuário cria um flipbook do zero em um editor visual inspirado em ferramentas como Canva.

O produto será inicialmente lançado com um **Lifetime Deal (LTD)** para validar o mercado com os primeiros usuários. Posteriormente, poderá evoluir para planos mensais/anuais.

### Proposta de valor

> Transforme PDFs em experiências digitais interativas ou crie publicações profissionais do zero.

---

# 2. Objetivos do MVP

O MVP deve permitir que um usuário:

- crie uma conta;
- faça login com Google;
- faça login com email e senha;
- recupere a senha;
- crie um flipbook a partir de PDF;
- crie um flipbook em branco;
- edite páginas visualmente;
- adicione texto, imagens e formas;
- reorganize páginas;
- use templates;
- faça upload de imagens;
- tenha autosave;
- use undo/redo;
- visualize o flipbook;
- publique o flipbook;
- tenha uma URL pública;
- incorpore o flipbook via iframe;
- compartilhe o flipbook;
- controle algumas opções de branding e viewer;
- compre o LTD;
- tenha seus recursos controlados por entitlements;
- receba emails transacionais;
- veja analytics básicos.

---

# 3. Stack Tecnológica

## Frontend / Backend

- Next.js
- React
- TypeScript
- Tailwind CSS

O Next.js será responsável tanto pelo frontend quanto pela camada principal de backend/API.

Não utilizar FastAPI no MVP.

## Autenticação

- Better Auth
- Google OAuth
- Email + senha

> Decisão (fase 2): Better Auth no lugar de Auth.js, com o adapter do Prisma.

## Database

- PostgreSQL
- Neon
- Prisma ORM

## Storage

- Cloudflare R2

O banco nunca armazenará PDFs ou imagens diretamente.

## Email

- Resend

Responsável por:

- verificação de email;
- recuperação de senha;
- emails transacionais;
- notificações de processamento;
- notificações relacionadas à conta.

## Billing

- Paddle

O primeiro plano será um Lifetime Deal.

A arquitetura deve permitir posteriormente:

- LTD;
- mensal;
- anual.

## Infraestrutura

- Hetzner

Responsável principalmente por:

- processamento de PDFs;
- geração de páginas;
- geração de thumbnails;
- processamento de imagens;
- background jobs.

## Editor

- React
- Renderização HTML, com o mesmo componente de página do viewer (`PageCanvas`)
- Zustand para estado do editor

> Decisão (fase 4): o editor não usa Konva. Ele renderiza as páginas com o mesmo componente HTML do viewer, do embed e das thumbnails, então o que se vê no editor é exatamente o que o leitor vê, inclusive a quebra de linha do texto. Com Konva o texto seria desenhado num canvas, com quebra de linha própria, diferente do viewer. A edição de texto inline usa `contentEditable`.

---

# 4. Arquitetura Geral

```text
                    ┌───────────────────┐
                    │      Next.js      │
                    │                   │
                    │ Marketing         │
                    │ Dashboard         │
                    │ Editor            │
                    │ Viewer            │
                    │ API               │
                    └─────────┬─────────┘
                              │
             ┌────────────────┼─────────────────┐
             │                │                 │
             ▼                ▼                 ▼
        Better Auth         Prisma            Resend
                              │
                              ▼
                           Neon DB

                              │
                              ▼
                     ┌─────────────────┐
                     │   Cloudflare R2 │
                     │                 │
                     │ PDFs            │
                     │ Images          │
                     │ Assets          │
                     │ Thumbnails      │
                     └────────┬────────┘
                              │
                              │ Jobs
                              ▼
                     ┌─────────────────┐
                     │     Hetzner     │
                     │                 │
                     │ PDF Worker      │
                     │ Image Processing│
                     │ Background Jobs │
                     └─────────────────┘

                         Paddle
                            │
                            ▼
                         Billing
```

---

# 5. Princípios Arquiteturais

## 5.1 Monólito modular

O MVP será um monólito Next.js bem organizado.

Não utilizar microservices inicialmente.

## 5.2 Storage separado do banco

PostgreSQL armazena metadados.

R2 armazena arquivos.

## 5.3 Viewer unificado

PDF e Canvas devem utilizar o mesmo mecanismo de publicação e visualização.

## 5.4 Editor orientado a dados

O editor não deve salvar HTML arbitrário como fonte principal.

O documento será representado como:

```text
Flipbook
  └── Pages
       └── Elements
```

## 5.5 Evolução incremental

Redis, filas sofisticadas, múltiplos workers e outras ferramentas de infraestrutura só devem ser adicionados quando o volume justificar.

---

# 6. Tipos de Flipbook

O modelo `Flipbook` terá um campo `type`.

Valores:

```text
PDF
CANVAS
```

## PDF

Fluxo:

```text
Upload PDF
    ↓
Create Flipbook
    ↓
Background Processing
    ↓
PDF → Pages
    ↓
Generate thumbnails
    ↓
Ready
    ↓
Viewer / Editor
```

## Canvas

Fluxo:

```text
Create from Scratch
    ↓
Create document
    ↓
Create initial page
    ↓
Open Editor
    ↓
Design
    ↓
Autosave
    ↓
Publish
```

---

# 7. Dashboard

## 7.1 Dashboard principal

Deve apresentar:

- total de flipbooks;
- flipbooks recentes;
- views;
- storage utilizado;
- status de processamento;
- CTA para criar flipbook.

## 7.2 Lista de flipbooks

Cada item deve apresentar:

- thumbnail;
- título;
- tipo;
- número de páginas;
- status;
- views;
- data de atualização;
- ações.

Ações:

- Edit;
- Preview;
- Publish;
- Duplicate;
- Analytics;
- Settings;
- Delete.

---

# 8. Criação de Flipbook

Ao clicar em `Create Flipbook`, apresentar:

```text
From PDF
From Scratch
```

## From PDF

Permitir:

- drag & drop;
- seleção de arquivo;
- validação de extensão;
- validação de tamanho;
- upload para R2;
- criação do job de processamento.

Status:

```text
Uploading
Processing
Ready
Failed
```

## From Scratch

Criar:

- Flipbook;
- primeira Page;
- estado inicial do documento;
- abrir editor.

---

# 9. Processamento de PDF

## Pipeline

```text
PDF
 ↓
Upload
 ↓
R2
 ↓
Create processing job
 ↓
Hetzner Worker
 ↓
Render pages
 ↓
Generate WebP/JPEG
 ↓
Generate thumbnails
 ↓
Upload results to R2
 ↓
Update Page records
 ↓
Flipbook = READY
```

## Requisitos

O processamento deve:

- ser executado fora do request principal do Next.js;
- ser idempotente;
- atualizar status;
- registrar erros;
- permitir retry;
- não perder o PDF original.

## MVP

Não utilizar Redis/Celery obrigatoriamente.

Um worker simples consultando jobs pendentes no PostgreSQL é suficiente.

Quando houver volume significativo, poderá ser introduzido:

```text
Redis
+
Queue
+
Multiple Workers
```

---

# 10. Cloudflare R2

Estrutura recomendada:

```text
/flipbooks/{flipbookId}/original.pdf

/flipbooks/{flipbookId}/pages/001.webp
/flipbooks/{flipbookId}/pages/002.webp
/flipbooks/{flipbookId}/pages/003.webp

/flipbooks/{flipbookId}/thumbnails/001.webp
/flipbooks/{flipbookId}/thumbnails/002.webp

/assets/{userId}/{assetId}.{ext}
```

## Regras

- arquivos privados devem utilizar URLs assinadas quando necessário;
- assets públicos publicados podem utilizar URLs CDN;
- o banco armazena apenas keys/metadados;
- arquivos órfãos devem ser limpos periodicamente.

> Decisão (fase 7): o navegador envia os arquivos para `/incoming/{key}`, nunca direto para a key final. Depois de conferir tamanho e tipo, o servidor copia exatamente a versão conferida (pelo ETag) para `{key}`. A URL de upload continua válida por alguns minutos, e sem essa etapa daria para trocar um arquivo já verificado por outro, maior ou de outro tipo. O worker apaga os arquivos que ficam em `/incoming/`.

---

# 11. Modelo de Documento Canvas

A estrutura lógica será:

```text
Flipbook
 ├── Page 1
 │    ├── Text
 │    ├── Image
 │    └── Shape
 │
 ├── Page 2
 │    ├── Text
 │    └── Image
 │
 └── Page 3
      └── Shape
```

Cada página possuirá:

- dimensões;
- background;
- background image opcional;
- lista de elementos.

---

# 12. Editor Visual

## Layout

```text
┌─────────────────────────────────────────────────────────┐
│ Logo   File Edit   Undo Redo        Preview   Publish  │
├────────────┬──────────────────────────────┬─────────────┤
│            │                              │             │
│ Templates  │                              │ Properties  │
│ Elements   │           Canvas             │             │
│ Text       │                              │ Position    │
│ Images     │                              │ Size        │
│ Shapes     │                              │ Rotation    │
│ Uploads    │                              │ Opacity     │
│            │                              │             │
├────────────┴──────────────────────────────┴─────────────┤
│ Pages: [1] [2] [3] [+]                                  │
└─────────────────────────────────────────────────────────┘
```

## Elementos do MVP

### Text

- conteúdo;
- font family;
- font size;
- weight;
- color;
- alignment;
- line height;
- letter spacing.

### Image

- upload;
- position;
- size;
- crop;
- fit;
- opacity;
- rotation.

### Shape

- rectangle;
- circle;
- line;
- background;
- border;
- opacity.

### Futuramente

- video;
- audio;
- buttons;
- links;
- embeds;
- animations.

---

# 13. Canvas Engine

Utilizar:

```text
React
+
HTML (PageCanvas, o mesmo renderer do viewer)
+
Zustand
```

O estado do editor será separado do estado persistido no servidor.

```text
User interaction
      ↓
Zustand
      ↓
HTML rendering (PageCanvas + camada de transformação)
      ↓
Debounced autosave
      ↓
Server Action
      ↓
Prisma
```

A geometria dos elementos é guardada em unidades da página; o `PageCanvas` converte para porcentagens e unidades de container query, então o mesmo documento renderiza igual em qualquer tamanho. Seleção, alças de redimensionar/girar e guias de alinhamento ficam numa camada separada, desenhada por cima da página.

---

# 14. Undo / Redo

O editor deve implementar:

```text
past[]
present
future[]
```

Operações importantes:

- add element;
- delete element;
- move;
- resize;
- rotate;
- edit text;
- change style;
- reorder;
- duplicate;
- page creation;
- page deletion.

Undo/redo deve funcionar sem necessidade de comunicação com o servidor.

---

# 15. Autosave

O editor deve salvar automaticamente.

Fluxo:

```text
Change
 ↓
Debounce ~500–1000ms
 ↓
Persist document
 ↓
Saved
```

Indicador:

```text
Saving...
Saved ✓
```

O cliente deve manter uma cópia local temporária para recuperação após falhas de rede ou fechamento inesperado.

---

# 16. Pages

O usuário poderá:

- criar página;
- duplicar página;
- excluir página;
- reordenar página;
- selecionar página;
- navegar entre páginas.

Cada página terá:

```text
id
flipbookId
pageNumber
width
height
background
backgroundImageKey
```

A ordenação deve ser baseada em `pageNumber` ou mecanismo equivalente.

---

# 17. Templates

Templates serão documentos pré-configurados.

Categorias iniciais:

```text
Magazines
Catalogs
Business
Brochures
Portfolios
Reports
Marketing
```

Um template contém:

```text
Template
 ├── Pages
 │    └── Elements
```

Ao selecionar um template:

```text
Template
 ↓
Clone
 ↓
User Flipbook
```

O usuário deve receber uma cópia editável.

---

# 18. Assets

O usuário poderá fazer upload de:

- JPG;
- PNG;
- WebP.

SVG fica fora por enquanto: pode conter scripts e exigiria sanitização. O servidor confere o tipo real pelos primeiros bytes do arquivo, o tamanho (até 15 MB) e as dimensões, e o autosave recusa imagens que não sejam da biblioteca do próprio usuário.

Fluxo:

```text
Upload
 ↓
R2
 ↓
Asset record
 ↓
Asset Library
```

O banco deverá armazenar:

```text
id
userId
flipbookId
type
key
filename
mimeType
size
width
height
createdAt
```

---

# 19. Viewer

O viewer será compartilhado entre documentos PDF e Canvas.

URL pública:

```text
/f/{slug}
```

Embed:

```text
/embed/{id}
```

## Recursos

- page turning;
- previous/next;
- thumbnails;
- zoom;
- fullscreen;
- responsive layout;
- keyboard navigation;
- page counter;
- loading state;
- share;
- deep linking por página.

---

# 20. Modelo do Viewer

O viewer deverá consumir uma representação normalizada:

```text
Flipbook
 ↓
Pages
 ↓
Page background
 ↓
Page elements
```

PDF:

```text
Page
 └── backgroundImage
```

Canvas:

```text
Page
 ├── background
 ├── Text
 ├── Image
 └── Shape
```

Dessa forma, o viewer não precisa saber como o documento foi criado.

---

# 21. PDF como base editável

A arquitetura deve permitir uma futura funcionalidade:

```text
PDF
 ↓
Pages
 ↓
Background image
 ↓
Add Canvas Elements
```

Isso permitirá que um usuário faça upload de um PDF e posteriormente adicione:

- textos;
- imagens;
- botões;
- links;
- vídeos;
- outros elementos.

Essa funcionalidade pode ficar fora do MVP, mas o schema deve permitir sua implementação futura.

---

# 22. Publicação

Estados:

```text
DRAFT
PROCESSING
READY
PUBLISHED
FAILED
ARCHIVED
```

Fluxo:

```text
Draft
 ↓
Validate
 ↓
Publish
 ↓
PUBLISHED
```

Ao publicar:

- garantir slug;
- validar páginas;
- validar assets;
- registrar `publishedAt`;
- tornar conteúdo disponível no viewer público.

---

# 23. Slugs

Formato:

```text
/f/{slug}
```

Exemplo:

```text
/f/summer-catalog
```

Regras:

- slug único;
- URL-safe;
- editável;
- mudanças de slug devem invalidar ou redirecionar URLs antigas conforme política futura.

---

# 24. Embed

Gerar código:

```html
<iframe
  src="https://app.example.com/embed/FLIPBOOK_ID"
  width="100%"
  height="600"
  frameborder="0"
  loading="lazy">
</iframe>
```

O embed deve possuir interface mínima e não exibir elementos desnecessários do dashboard.

---

# 25. Branding

Configurações do flipbook:

```text
backgroundColor
accentColor
showBranding
showLogo
showShare
showDownload
showFullscreen
showThumbnails
```

Planos pagos poderão remover o branding da plataforma.

---

# 26. Analytics

Analytics básico no MVP.

Eventos:

```text
VIEW
PAGE_VIEW
PAGE_CHANGE
DOWNLOAD
SHARE
```

Métricas:

- total views;
- unique visitors aproximados;
- page views;
- average reading time;
- downloads;
- shares;
- views por página;
- dispositivo;
- país, quando apropriado e legalmente aplicável.

Não coletar dados pessoais desnecessários.

---

# 27. Autenticação

Utilizar Better Auth.

Métodos:

```text
Google
Email + Password
```

Funcionalidades:

- registro;
- login;
- logout;
- email verification;
- forgot password;
- reset password;
- sessão persistente.

O usuário autenticado será associado aos seus flipbooks.

---

# 28. Multi-tenancy

O MVP não terá um sistema complexo de Organizations/Teams.

Modelo inicial:

```text
User
 └── Flipbooks
```

A arquitetura deve permitir evolução futura:

```text
Organization
 ├── Members
 └── Flipbooks
```

Não implementar colaboração em equipe no MVP.

---

# 29. Billing — LTD

O lançamento inicial utilizará:

> Lifetime Deal para early adopters.

Fluxo:

```text
User
 ↓
Paddle Checkout
 ↓
Transaction
 ↓
Paddle Webhook
 ↓
Next.js
 ↓
Database
 ↓
LIFETIME entitlement
```

O LTD deve ser tratado como um entitlement permanente enquanto a conta permanecer válida.

Não prometer recursos com custos variáveis ilimitados sem uma política de uso razoável.

Exemplos de limites que podem existir:

- storage;
- páginas processadas;
- processamento mensal;
- bandwidth;
- views.

---

# 30. Billing Abstraction

O código não deve depender diretamente de verificações como:

```text
if user.paid
```

Deve utilizar uma camada de entitlements.

Exemplo conceitual:

```text
canCreateFlipbook(user)
canUseCanvasEditor(user)
canRemoveBranding(user)
canUseAnalytics(user)
maxStorage(user)
maxPages(user)
maxViews(user)
```

Isso permitirá futuramente:

```text
LIFETIME
MONTHLY
YEARLY
FREE
BUSINESS
```

sem reescrever o produto.

---

# 31. Database Schema

## User

```text
User
- id
- name
- email
- emailVerified
- image
- createdAt
- updatedAt
```

O Better Auth adiciona os modelos necessários de account/session/verification conforme configuração.

## Flipbook

```text
Flipbook
- id
- userId
- title
- slug
- type
- status
- visibility
- description
- settings JSONB
- thumbnailKey
- originalPdfKey
- pageCount
- createdAt
- updatedAt
- publishedAt
```

## Page

```text
Page
- id
- flipbookId
- pageNumber
- width
- height
- background JSONB
- backgroundImageKey
- createdAt
- updatedAt
```

## Element

```text
Element
- id
- pageId
- type
- x
- y
- width
- height
- rotation
- opacity
- zIndex
- locked
- visible
- properties JSONB
- createdAt
- updatedAt
```

## Asset

```text
Asset
- id
- userId
- flipbookId
- type
- key
- filename
- mimeType
- size
- width
- height
- createdAt
```

## AnalyticsEvent

```text
AnalyticsEvent
- id
- flipbookId
- pageId
- type
- sessionId
- country
- device
- createdAt
```

## Subscription

```text
Subscription
- id
- userId
- paddleCustomerId
- paddleTransactionId
- status
- plan
- expiresAt
- createdAt
- updatedAt
```

Para LTD:

```text
plan = LIFETIME
expiresAt = null
```

## ProcessingJob

```text
ProcessingJob
- id
- flipbookId
- type
- status
- attempts
- payload JSONB
- error
- createdAt
- startedAt
- completedAt
```

---

# 32. API / Server Actions

A implementação pode utilizar Server Actions e Route Handlers conforme o caso.

> Implementação atual: as operações do app são Server Actions (`src/lib/actions`). Route Handlers existem só onde é preciso uma URL HTTP: auth (`/api/auth/*`), download do PDF original (`/api/flipbooks/:id/download`), webhook do Paddle (`/api/paddle/webhook`), coleta de analytics (`/api/analytics/events`) e health check (`/api/health`).

Operações de referência:

```text
POST   /api/flipbooks
GET    /api/flipbooks
GET    /api/flipbooks/:id
PATCH  /api/flipbooks/:id
DELETE /api/flipbooks/:id

POST   /api/flipbooks/:id/publish
POST   /api/flipbooks/:id/duplicate

POST   /api/uploads
POST   /api/assets

GET    /api/flipbooks/:id/pages
POST   /api/flipbooks/:id/pages
PATCH  /api/pages/:id
DELETE /api/pages/:id

PATCH  /api/elements/:id
DELETE /api/elements/:id

POST   /api/analytics/events

POST   /api/paddle/webhook
```

Endpoints internos devem validar:

- autenticação;
- ownership;
- entitlements;
- payload;
- tamanho;
- tipo de arquivo.

---

# 33. Estrutura do Projeto

```text
src/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── pricing/
│   │   └── features/
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   │
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── flipbooks/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   └── [id]/
│   │   │       ├── editor/
│   │   │       ├── analytics/
│   │   │       └── settings/
│   │   ├── assets/
│   │   ├── billing/
│   │   └── settings/
│   │
│   ├── f/
│   │   └── [slug]/
│   │
│   ├── embed/
│   │   └── [id]/
│   │
│   └── api/
│       ├── flipbooks/
│       ├── pages/
│       ├── elements/
│       ├── assets/
│       ├── uploads/
│       ├── analytics/
│       └── paddle/
│
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── flipbook/
│   ├── viewer/
│   └── editor/
│
├── editor/
│   ├── components/
│   ├── commands/
│   ├── hooks/
│   ├── state/
│   └── utils/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── storage/
│   ├── billing/
│   ├── email/
│   ├── analytics/
│   └── entitlements/
│
└── prisma/
    └── schema.prisma
```

---

# 34. Segurança

Implementar:

- autenticação obrigatória no dashboard;
- ownership checks;
- autorização por recurso;
- validação de payload;
- validação de MIME type;
- limites de upload;
- sanitização de dados;
- URLs assinadas quando necessárias;
- rate limiting quando necessário;
- proteção de webhooks;
- validação de assinatura do Paddle;
- proteção contra acesso a flipbooks privados.

Nunca confiar apenas no frontend para autorização.

> Implementação atual (fase 7): o rate limiting usa só o IP que o proxy da frente escreve (`CLIENT_IP_HEADER`), nunca um cabeçalho que o cliente possa mandar. Toda resposta leva cabeçalhos de segurança (CSP com `frame-ancestors`, `nosniff`, HSTS, `Referrer-Policy`); só `/embed/*` pode ser aberto em iframe de outro site. Destinos de redirecionamento pós-login precisam resolver para o próprio site.

---

# 35. Upload Security

PDFs e imagens enviados pelo usuário devem ser tratados como arquivos não confiáveis.

O processamento deve:

- validar extensão;
- validar MIME;
- validar tamanho;
- evitar execução de conteúdo;
- processar em ambiente isolado;
- evitar caminhos controlados pelo usuário;
- armazenar com nomes gerados pelo sistema.

---

# 36. Email

Templates do Resend:

```text
Verify email
Reset password
Welcome
Flipbook processing completed
Flipbook processing failed
Payment confirmation
```

Os emails devem possuir identidade visual consistente com o produto.

---

# 37. Marketing Website

Páginas iniciais:

```text
/
 /features
 /pricing
 /templates
 /login
 /register
```

Homepage deve explicar rapidamente:

```text
Create stunning flipbooks.

Upload a PDF or design from scratch.

[Create your first flipbook]
```

Mostrar exemplos visuais do produto.

---

# 38. SEO

Páginas públicas de flipbook devem possuir:

- title;
- description;
- Open Graph metadata;
- Twitter/X metadata;
- canonical URL;
- thumbnail;
- informações básicas do documento.

O usuário poderá definir:

```text
title
description
```

para cada flipbook.

---

# 39. Responsividade

O dashboard deve funcionar em:

- desktop;
- tablet;
- mobile.

O editor terá prioridade para desktop/tablet.

O viewer público deverá ser plenamente responsivo e otimizado para mobile.

---

# 40. Performance

## Viewer

Utilizar:

- lazy loading;
- thumbnails;
- carregamento progressivo;
- preload da página atual e próximas páginas;
- WebP quando apropriado;
- CDN/R2.

## Editor

Evitar persistir a cada pequeno movimento.

Utilizar:

```text
local state
+
debounce
+
batch updates
```

## Dashboard

Paginação para grandes listas.

---

# 41. Observabilidade

Registrar:

- erros de processamento;
- falhas de upload;
- falhas de webhook;
- erros de publicação;
- jobs travados;
- tempo de processamento.

No início, logging estruturado é suficiente.

Não criar uma plataforma de observabilidade complexa antes do produto ter usuários.

---

# 42. Backup e Recuperação

Neon será a fonte principal dos metadados.

R2 armazenará os arquivos.

Requisitos:

- backups do banco;
- política de retenção;
- possibilidade de recuperar documentos;
- limpeza segura de arquivos.

---

# 43. Roadmap

## Fase 1 — MVP

```text
✓ Better Auth
✓ Google login
✓ Email/password
✓ Dashboard
✓ PDF upload
✓ R2
✓ Hetzner processing
✓ PDF → pages
✓ Flipbook viewer
✓ Canvas editor
✓ Text
✓ Images
✓ Shapes
✓ Pages
✓ Templates básicos
✓ Asset library (antecipada da Fase 2)
✓ Autosave
✓ Undo/Redo
✓ Public URL
✓ Embed
✓ Basic branding
✓ Paddle LTD
✓ Entitlements
✓ Resend
```

## Fase 2

```text
Analytics avançado
Password protected flipbooks
Download controls
Better sharing
More templates
PDF + Canvas hybrid editing
```

## Fase 3

```text
Interactive links
Buttons
Video
Audio
Embeds
Animations
```

## Fase 4

```text
Custom domains
Teams
Organizations
White label
Advanced analytics
API pública
```

---

# 44. Fora do MVP

Não implementar inicialmente:

- colaboração em tempo real;
- comentários;
- chat;
- IA;
- CRM;
- automações;
- microservices;
- Kubernetes;
- Redis obrigatório;
- Celery obrigatório;
- custom domains;
- white label completo;
- editor com complexidade total do Canva;
- marketplace de templates;
- API pública.

---

# 45. Critérios de Aceitação do MVP

O MVP será considerado funcional quando:

### Authentication

- usuário consegue criar conta;
- usuário consegue entrar com Google;
- usuário consegue entrar com email/senha;
- usuário consegue recuperar senha.

### PDF

- usuário consegue enviar PDF;
- PDF é armazenado no R2;
- worker processa o PDF;
- páginas são geradas;
- thumbnails são geradas;
- usuário consegue visualizar o resultado.

### Canvas

- usuário consegue criar flipbook vazio;
- usuário consegue adicionar páginas;
- usuário consegue adicionar texto;
- usuário consegue adicionar imagens;
- usuário consegue adicionar formas;
- usuário consegue mover/redimensionar elementos;
- usuário consegue desfazer/refazer;
- alterações são salvas automaticamente.

### Publishing

- usuário consegue publicar;
- flipbook possui slug público;
- viewer funciona;
- embed funciona;
- viewer é responsivo.

### Billing

- usuário consegue comprar LTD via Paddle;
- webhook atualiza a conta;
- entitlement LIFETIME é concedido;
- funcionalidades são protegidas por entitlement.

### Email

- verificação de email funciona;
- reset de senha funciona;
- emails principais são enviados pelo Resend.

---

# 46. Decisões de Produto

## Decisão 1

O produto não será apenas um PDF viewer.

Ele será um **flipbook creation platform**.

## Decisão 2

Existirão dois caminhos:

```text
PDF → Flipbook
Blank → Canvas → Flipbook
```

## Decisão 3

Ambos utilizarão o mesmo sistema de:

```text
Pages
Viewer
Publishing
Sharing
Analytics
```

## Decisão 4

Hetzner será utilizada para processamento pesado.

## Decisão 5

Neon será utilizado como database principal.

## Decisão 6

R2 será utilizado para arquivos.

## Decisão 7

Paddle será utilizado desde o lançamento para o LTD.

## Decisão 8

O MVP será monolítico e simples.

---

# 47. Visão de Longo Prazo

A evolução natural do produto será:

```text
PDF → Flipbook
          │
          ├── Editor
          │
          ├── Templates
          │
          ├── Interactivity
          │
          ├── Analytics
          │
          ├── Custom Domains
          │
          └── Collaboration
```

O objetivo não é simplesmente reproduzir um PDF com efeito de página.

O objetivo é construir uma plataforma onde empresas e criadores possam:

```text
Create
   ↓
Design
   ↓
Publish
   ↓
Share
   ↓
Embed
   ↓
Measure
```

Tudo dentro de uma única aplicação.
