# Medidor de Eficiencia — UI Kit "Caderno de Esboco"

Design system para o Medidor de Eficiencia, um sistema web (Express + EJS + Prisma) de registro de atividades diarias e analise de eficiencia pessoal. O usuario registra atividades por categoria, acompanha metas e ve relatorios de tempo por periodo. Fonte de contexto: CLAUDE.md do projeto (stack Node/Express/EJS/Prisma, regras de negocio de atividades e categorias).

Identidade visual: interface parece desenhada a mao em um caderno de rascunho quadriculado — bordas onduladas, cantos irregulares, leve inclinacao dos cartoes, tremor sutil no hover. Tema claro (papel) e escuro (fundo neutro com traco claro) sao suportados via `[data-theme="dark"]` no body.

## Indice
- `styles.css` — ponto de entrada global (importa tokens + components.css)
- `tokens/` — colors.css, typography.css, spacing.css, effects.css (filtro de traco a mao + wobble)
- `components.css` — classes de todos os componentes
- `components/` — primitivos React: buttons/ (Button, IconButton), inputs/ (Input, Select, Checkbox, Radio, Switch), core/ (Card, Badge), overlay/ (Modal, Tooltip), feedback/ (Alert), navigation/ (Pagination), icons/ (Icon, ~24 glifos)
- `guidelines/` — specimen cards (cores, tipografia, espacamento, efeito de traco a mao)
- `ui_kits/medidor-eficiencia/` — tela de login + dashboard (inicio, atividades, categorias, relatorios) navegavel

## Conteudo — tom e voz
- Idioma: portugues (pt-BR), casual e amigavel.
- Frases curtas, diretas ("Nova atividade", "Salvar", "Entrar com Google").
- Mensagens de erro objetivas e gentis, nunca tecnicas ("Minimo de 8 caracteres", "A hora de fim deve ser depois do inicio").
- Sem emoji nas mensagens de sistema.

## Fundamentos visuais
- **Cores**: papel (branco quente) / tinta (quase-preto azulado) como base; 4 cores de "caneta" — azul (primaria/acoes), verde (sucesso/positivo), vermelho (erro/perigo), amarelo (aviso) — mesma familia de croma em oklch, variando so o hue. Sem gradientes.
- **Tipografia**: Patrick Hand (corpo, bem legivel apesar do traco manual) + Architects Daughter (titulos/display) + Kalam (pequenos destaques). Corpo nunca abaixo de 15px.
- **Fundo**: grade quadriculada sutil (linhas de `--paper-grid` a cada 26px) sobre o papel — o body inteiro é o "caderno".
- **Bordas / formas**: todo componente usa `.sketch-edge`, uma pseudo-camada (::before) com borda solida 2.5px + `feTurbulence`/`feDisplacementMap` (filtro CSS via data-URI) que ondula o contorno — nunca bordas retas perfeitas. Raios assimetricos (`--radius-blob`, `--radius-sm`, `--radius-pill`) reforcam o efeito "desenhado a mao livre".
- **Sombra**: nenhuma sombra suave/blur — o proprio traco ondulado faz as vezes de profundidade; cartoes usam leve rotacao (`tilt`) para parecer posicionados a mao.
- **Hover/press**: tremor (`sketch-wobble`, rotacao alternada rapida) ao passar o mouse ou focar — nunca opacidade/escala tipica de UI corporativa.
- **Icones**: linha simples (stroke 1.8px) com o mesmo filtro de traco tremido aplicado ao proprio traçado, para combinar com os componentes.
- **Sem gradientes, sem blur/vidro fosco, sem emoji.**

## Iconografia
Conjunto proprio de ~24 icones de linha (`components/icons/Icon.jsx`), desenhados como paths SVG simples e "esboçados" via filtro CSS (nao ha biblioteca externa). Cobre acoes comuns: navegacao (home, logout), formularios (mail, lock, eye/eye-off, check, x), dados (calendar, clock, tag, filter), feedback (alert-triangle, info, star, bell).

## Observacoes
- Fontes carregadas via Google Fonts (`@import` em tokens/typography.css) — nao ha arquivos de fonte locais.
- Nao existe logo/marca fornecida; onde um logo apareceria, o nome "Medidor" é exibido em `--font-display`.
- Ainda faltam (fora do escopo pedido): Tabs, Avatar, Tabela — falar se forem necessarios.
