# UltraLearn

Rastreador de princípios de ultra-aprendizado. Acompanhe se você está aplicando os 9 princípios do livro *Ultralearning* em cada assunto que estuda.

## Requisitos

- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **npm** (vem com o Node.js)

## Instalação e execução

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em modo desenvolvimento
npm run dev
```

## Build para produção

```bash
# Gerar executável
npm run build
```

---

## Como usar

1. Na primeira tela, clique em **"Abrir pasta de estudo"** — escolha uma pasta onde seus arquivos serão salvos
2. Clique em **"+ novo assunto"** para criar um novo tópico de estudo
3. Abra cada princípio (1–9) e **marque os itens do checklist** conforme você aplica
4. Adicione **observações** por princípio
5. Clique em **"Marcar como revisado hoje"** após revisar cada princípio

## Como os arquivos são salvos

Cada assunto é salvo como um arquivo `.ul.md` na pasta que você escolheu.  
O formato é **Markdown com frontmatter YAML** — legível e editável em qualquer editor de texto.

Exemplo: `typescript.ul.md`

```yaml
---
title: TypeScript
motivation: instrumental
why: Melhorar produtividade no trabalho
targetHours: 80
hoursSpent: 12
principles:
  meta:
    checklist:
      - id: "1"
        text: Defini por que estou aprendendo isso
        checked: true
    notes: "Li sobre o assunto no Reddit e entrevistei um dev sênior"
    lastReviewed: "2024-01-15"
  ...
---

Notas livres aqui em Markdown...
```

## Princípios rastreados

| # | Princípio | Pergunta-guia |
|---|-----------|---------------|
| 1 | Meta-aprendizagem | Você pesquisou como aprender antes de mergulhar? |
| 2 | Foco | Você está concentrado durante suas sessões? |
| 3 | Prática Direta | Sua prática reflete o contexto real de uso? |
| 4 | Repetição | Você está atacando seus pontos fracos? |
| 5 | Recuperação | Você se testa em vez de só reler? |
| 6 | Retorno | Você busca feedback honesto? |
| 7 | Retenção | Você tem estratégias para não esquecer? |
| 8 | Intuição | Você entende profundamente ou só memoriza? |
| 9 | Experimentação | Você testa diferentes abordagens? |

## Indicadores de status

- 🟢 **Verde** — ≥ 80% dos itens marcados (seguindo o princípio)
- 🟡 **Amarelo** — 1–79% dos itens marcados (em progresso)
- ⚫ **Cinza** — 0% marcado (não iniciado)
