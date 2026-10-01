# Planejamento de Melhorias - Gerador de Mockups

Este documento estabelece o plano para a implementação das próximas funcionalidades e melhorias de UI/UX no sistema.

## 0. Exportação automática pro Wiks Brain (01/10/2026) ✅

**Problema**: SKU/ERP gerado aqui no app ficava só no Firestore próprio —
não sincronizava com o Tiny nem aparecia em lugar nenhum do vault Obsidian
da agência (Wiks Brain), que é onde o Guilherme centraliza conhecimento.
Virou fonte de verdade isolada, uma das 4 fontes fragmentadas de SKU/ERP
da agência (as outras: Tiny ERP, a planilha do JB, e a skill `gerar-erp`
do Claude Code).

**Solução**: ao clicar "Salvar produto" (SKU + descrição ERP), o app agora
também exporta pro vault automaticamente — `src/db.js` (`exportErpParaVault`)
chama `api/export-erp.js`, uma função serverless que usa a API do GitHub
pra:
1. Criar um arquivo novo em `erp-geracao/produtos/<slug>-<data>.md` no
   repositório `agenciawiks/guilherme` (mesma pasta/formato que a skill
   `gerar-erp` do Claude Code já usa, pra não criar um segundo padrão).
2. Inserir uma linha no índice
   `wiks-brain/03-Resources/processos/produtos gerados via erp.md`
   (via um comentário-âncora `<!-- NOVA-LINHA-AQUI -->` no arquivo, que
   não pode ser apagado).

Não bloqueia o salvamento normal: se a exportação falhar (token
inválido/expirado, rede, etc.), o SKU/ERP já foi salvo no Firebase/
LocalForage normalmente antes — só aparece um aviso de que não entrou no
vault dessa vez.

⚠️ **Pendência de configuração (manual, fora do alcance do Claude Code)**:
pra isso funcionar em produção, precisa criar um **Personal Access Token
do GitHub** (fine-grained, só no repo `agenciawiks/guilherme`, permissão
"Contents: Read and write") e cadastrar como variável de ambiente
`GITHUB_TOKEN` no projeto Vercel — **nunca** com prefixo `VITE_` (vazaria
no bundle do navegador). Ver `.env.example`.

## 1. Gerenciamento de Arquivos ✅
- **Botões de Limpeza Explosiva**: Implementado com dois botões distintos por contexto de aba:
  - **Limpar Todos os Mockups**: Remove todos os arquivos da base de "Mockups".
  - **Limpar Todos os Logos (PNGs)**: Remove todos os arquivos da base de "Logos".
  - **Modal de Confirmação Customizado**: Substituiu o `window.confirm` nativo por um modal premium com animação de entrada, ícone de alerta, e botões "Cancelar" / "Confirmar".

## 2. Controle de Escala e Precisão ✅
- **Input Numérico Aprimorado**: Campo maior (w-12), fonte maior (text-[13px]), com limites de segurança (5%–500%).
- **Botões de Escala Rápida**: Presets **50%, 100%, 150%, 200%** com highlight visual na preset ativa.
- **Slider aprimorado**: `accent-green-500`, step=1, max=300.

## 3. Melhorias Úteis de UX (Adicionais) ✅

### A. Seleção em Lote Inteligente ✅
- Botões **"Selecionar Todos"** e **"Desmarcar"** na aba de mockups.

### B. Ajustes de Posição de Alta Precisão ✅
- Inputs numéricos diretos para X e Y.
- Botões **±1px** com hover colorido (vermelho para −, verde para +).
- **Suporte a Shift nos botões**: segurar Shift ao clicar em ±1 aplica ±10px.
- Botão **"Zerar Coordenadas"** em vermelho com ícone X.
- Dica visual `⇧ = ±10px` ao lado do label "Posição".

### C. Feedback Visual de Exportação ✅
- Barra de progresso mostra o nome do arquivo sendo processado (truncado com flex).
- Contador `atual/total` sempre visível.

### D. Segurança de Dados ✅
- `beforeunload` impede fechar a aba durante lote ativo.

### E. Extras Implementados ✅
- **Painel de Atalhos de Teclado**: Botão "Atalhos" na topbar do canvas que abre um painel flutuante listando todos os atalhos disponíveis.
- **Campo de Busca com Botão X**: Limpa o filtro de pesquisa com um clique.
- **Atalhos de Escala via Teclado**: `+`/`=` aumenta, `−` diminui; Shift multiplica por 10.
- **Confirmação visual da cor**: Swatch ativa com ring e scale-110.

---
**Status:** ✅ Todas as melhorias implementadas com maestria.
