# 🧰 ERP Utility WIKS (Vite + React)

Hub interno da Agência Wiks de ferramentas de apoio pros e-commerces: mockup de estampa, geração de prompt de IA, e cadastro de SKU + descrição ERP. Não é uma loja — é ferramenta de operação (ver nota `gerador-de-estampas` no wiks-brain).

Online em: [erp-utility-wiks.vercel.app](https://erp-utility-wiks.vercel.app)

## ⚡ Desenvolvimento

Para rodar localmente e modificar a interface:

1.  **Acesse a pasta:**
    ```bash
    cd frontend
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Inicie o servidor localmente:**
    ```bash
    npm run dev
    ```

## 🛠️ Tecnologias Principais

*   **Tailwind CSS 4** - Estilização dinâmica por meio de `@theme` e `@utility`.
*   **React Draggable** - Para o controle de posições das estampas.
*   **JSZip & FileSaver** - Para geração de arquivos em lote sem API no servidor.
*   **LocalForage** - Persistência das imagens enviadas no IndexedDB do navegador.

## 📁 Estrutura de Arquivos

*   `src/App.jsx` - Arquivo principal contendo a lógica central, sistema de toasts e UI.
*   `src/index.css` - Estilos globais e componentes personalizados do sistema.
*   `public/icons.svg` - Conjunto de ícones SVGs compactados.

---
*Veja o [README principal](../README.md) na raiz do projeto para mais informações sobre o funcionamento do sistema completo.*
