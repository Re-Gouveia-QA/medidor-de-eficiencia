# Plan: Corrige input de data/hora vazio em branco no Safari (mobile)

**Date:** 2026-07-30
**Status:** concluído em `fix/safari-date-input-placeholder` (não mesclado — merge só mediante
pedido explícito).

### Nota de execução

Verificado com um HTML isolado carregando `reset.css`/`tokens.css`/`components.css` reais + Chrome
headless (emulação de dispositivo móvel via CDP): captura antes/depois da mudança é pixel-idêntica
no Chrome (esperado — o bug é específico do WebKit, Chrome nunca teve o problema), confirmando que
a exceção não reintroduz nenhum "chrome" nativo indesejado nos navegadores testáveis neste
ambiente. Build, 137/137 testes e lint verdes. Checagem real em Safari/iOS continua pendente para
confirmação do usuário após o deploy — mecanismo do bug é bem documentado (WebKit não tem fallback
de renderização pra sub-campos de `date`/`time` quando `appearance` é zerado), risco baixo.

## Goal

Fazer os campos `<input type="date">`/`<input type="time">` mostrarem o placeholder nativo
(ex.: `dd/mm/aaaa`) quando vazios no Safari (iOS/macOS), em vez de um quadrado em branco.

## Root cause (já encontrado, sem precisar de investigação adicional)

`public/css/reset.css:9-17` zera a aparência nativa de **todo** `input`/`select`/`textarea` (regra
propositalmente ampla, documentada no comentário do arquivo: "remove estilos padrão do navegador
antes dos tokens/componentes entrarem em ação"):

```css
button, input, select, textarea {
  ...
  appearance: none;
}
```

Isso é seguro pra inputs de texto/número/checkbox (Chrome/Firefox/Safari continuam renderizando o
conteúdo normalmente sem o "chrome" nativo). Mas `input[type="date"]`/`input[type="time"]` no
WebKit (Safari desktop e mobile) são compostos internamente por sub-campos nativos
(dia/mês/ano ou hora/minuto) desenhados pelo motor de renderização nativo do navegador — ao zerar
a aparência com `appearance: none`, o WebKit não tem um fallback de renderização customizada pra
esses sub-campos como tem pra `<select>`/`<input type="text">`; o resultado observado é exatamente
o relatado: campo vazio sem nenhum texto de placeholder, um quadrado em branco. Chrome/Firefox não
têm esse problema porque implementam um fallback funcional mesmo com `appearance: none`.

Nenhuma regra já existe hoje pra restaurar a aparência desses dois tipos (`grep` por
`-webkit-appearance`/`input[type="date"]`/`input[type="time"]` em `public/css/` não encontrou
nada) — é a primeira vez que esse tipo de campo recebe uma exceção à regra do reset.

Afeta também os campos `type="time"` de `activities/create.ejs` (`horaInicio`/`horaFim`, mesma
classe `.input`) — mesmo root cause, mesmo componente, escopo natural de incluir na mesma correção
mesmo o relato do usuário citando só os filtros de data de `/activities`.

## Scope

### In-Scope
- Restaurar `appearance: auto` (ou remover o `none`) especificamente para
  `input[type="date"]`/`input[type="time"]`, preservando o reset atual pra todos os outros tipos
  de input/select/textarea.
- Aplicar a todas as páginas que usam esses tipos: filtros de `/activities` e `/reports`, formulário
  de `/activities/new` (e edição).

### Out-of-Scope
- Redesenhar o campo de data/hora com um date picker customizado (JS) — fora do pedido, e o
  problema é só a ausência do placeholder nativo, não a necessidade de um componente novo.
- Mexer no ícone de calendário/relógio já resolvido via `color-scheme` (`tokens.css`) — problema
  diferente (cor do ícone no tema escuro), já coberto, não confundir as duas correções.

## Phases

### Phase 1: Exceção pontual no reset pra date/time
**Objetivo:** placeholder nativo volta a aparecer em `input[type="date"]`/`input[type="time"]`
vazios, sem reintroduzir o "chrome" nativo (borda/fundo do navegador) que o reset remove de
propósito dos outros inputs.

**Steps:**
1. `public/css/reset.css`: logo após a regra `button, input, select, textarea { ... appearance: none; }`,
   adicionar `input[type="date"], input[type="time"] { appearance: auto; }` — mais específica,
   sobrescreve só esses dois tipos.
2. Rodar visualmente (`npm run dev` + Chrome DevTools emulando um user-agent Safari/iOS, já que
   não há Safari real neste ambiente Windows) pra confirmar que `border`/`background` custom de
   `.input`/`.input-wrap` (`components.css`) continuam controlando a aparência visual — `appearance:
   auto` sozinho não deveria reintroduzir borda/fundo nativos por cima do que `.input` já define
   (background: transparent, border: none no próprio elemento; a borda visível vem do `::before` de
   `.sketch-edge` no `.input-wrap` pai, não do input em si).
3. Revisar visualmente as 4 telas afetadas: `/activities` (filtros), `/reports` (filtros),
   `/activities/new` e edição (campos `data`/`horaInicio`/`horaFim`).

**Files Touched:** `public/css/reset.css`
**Verify:** `npm run dev`, abrir `/activities` no Chrome DevTools com emulação de dispositivo
(iPhone) — comparação visual antes/depois; não substitui uma checagem real em Safari/iOS
(indisponível neste ambiente).
**Done When:** os inputs de data/hora continuam com o mesmo visual (`.sketch-edge`, sem borda/fundo
nativo do navegador) em Chrome, e a mudança de CSS é uma exceção mínima e isolada (1 seletor, 1
propriedade) que não exige nenhuma outra alteração.

**Replanning triggers:**
- Se `appearance: auto` reintroduzir visualmente um "chrome" nativo indesejado (borda 3D, fundo
  cinza) por cima do `.sketch-edge` em algum navegador testável aqui (Chrome/Firefox) — nesse caso
  avaliar uma correção mais cirúrgica via `-webkit-appearance: auto` isolado (só WebKit) em vez de
  `appearance` genérico.

## Dependências e suposições

- Assume que o comportamento relatado (quadrado vazio) é especificamente o problema de
  `appearance: none` em inputs de data/hora do WebKit — bug amplamente documentado e consistente
  com o reset atual do projeto; não há necessidade de reproduzir em um dispositivo Safari real
  antes de aplicar a correção (o mecanismo é conhecido e a mudança é mínima/reversível).
- Checagem real em Safari/iOS fica pendente pro usuário confirmar após o deploy — mesma limitação
  recorrente de ambiente já registrada em outros planos desta sessão (sem ferramenta de
  browser/dispositivo Safari neste ambiente Windows).

## Notes

- Ponto de atenção pra não confundir com outra correção já existente: `color-scheme` (`tokens.css`)
  resolve a cor do ícone de calendário/relógio no tema escuro; esta correção é sobre o placeholder
  do campo em si, um problema diferente e anterior na cadeia de renderização (o campo nem chega a
  desenhar o texto, independente de tema claro/escuro).
