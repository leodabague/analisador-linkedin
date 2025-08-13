## LinkedIn Network Insights — Analisador de CSVs

Aplicação web para analisar dados exportados do LinkedIn (CSVs) e transformar em insights acionáveis. Permite upload de um arquivo único ou seleção de uma pasta inteira com subpastas, faz deduplicação automática das linhas e apresenta análises com drill‑down e paginação.

### Parte 1: Para que serve e principais funcionalidades

- **Upload de dados**:
  - Upload de um único `.csv`
  - Upload por pasta (`webkitdirectory`), com seleção de múltiplas subpastas antes de carregar
  - Deduplicação automática de linhas (linhas idênticas considerando todas as colunas são removidas)

- **Análises**:
  - **Empresas**: top empresas extraídas do campo de título; cada card abre um drill‑down com a lista de pessoas daquela empresa (paginação de 10 por página, exportação CSV, link para perfil quando disponível)
  - **Áreas Funcionais**: agrupamento por área (Technology, Sales, Marketing, Product, HR/People, Finance, Operations, Design, Legal) com drill‑down e exportação
  - **Níveis de Senioridade**: níveis fixos em ordem de senioridade (C‑Level, Director/VP, Manager, Lead, Senior, Junior, Intern), cada card abre drill‑down paginado e exportável
  - **Conexões**: distribuição por grau de conexão e top conectores por conexões mútuas
  - **Localizações**: top locais mais frequentes
  - **Resumo Executivo**: destaques rápidos (empresa mais representada, área dominante, networking etc.)

- **Experiência de uso**:
  - Drill‑down colapsável com rolagem automática até a lista
  - Paginação amigável (10 itens/página) com botões Anterior/Próxima
  - Exportação do resultado atual do drill‑down para CSV

- **Formato esperado do CSV** (exemplo de colunas):
  - `linkedin_url`, `name`, `degree_connection`, `title`, `location`, `followers`, `mutual_connections`

Como executar (PowerShell):
1. `cd analisador`
2. `npm install`
3. `npm run dev`
4. Abra `http://localhost:5173`

### Parte 2: Tecnologia, arquitetura e escolhas

- **Stack**:
  - React + Vite (desenvolvimento rápido, HMR, bundling moderno)
  - Tailwind CSS v3 (utilitários estáveis; v4 foi evitado pela maturidade/compatibilidade)
  - PapaParse (parse e unparse de CSV no navegador)
  - Lucide React (ícones)

- **Arquitetura de front‑end** (SPA, sem backend):
  - Todo o processamento ocorre no cliente (browser)
  - Estado local com `useState` e derivação com `useMemo` para cálculos (empresas, áreas, senioridade, conexões, locais)
  - Seleção de pasta com `input[type=file]` + `webkitdirectory` (suportado em Chrome/Edge)

- **Deduplicação**:
  - É calculada uma chave canônica por linha concatenando todas as colunas ordenadas
  - Um `Set` é utilizado para filtrar registros repetidos antes de popular o estado

- **Extração de empresas/áreas/senioridade**:
  - Regras baseadas em regex sobre o campo `title`
  - Empresas: limpeza de sufixos comuns (LTDA, INC, SA, etc.) e normalização
  - Áreas: dicionário de padrões por domínio funcional
  - Senioridade: padrões por nível e apresentação em ordem fixa (não por contagem)

- **Drill‑down e paginação**:
  - Cada card abre uma área colapsável que rola a tela automaticamente para o bloco
  - Paginação de 10 itens/página; exportação do conjunto atual via `Papa.unparse`
  - Espaço de “footer invisível” para garantir visibilidade dos controles no fim da lista

- **Estilo e UI**:
  - Tailwind v3 com classes utilitárias
  - Sem dependência de design system externo

- **Scripts**:
  - `npm run dev` — modo desenvolvimento
  - `npm run build` — build de produção
  - `npm run preview` — servir build localmente

### Parte 3: Futuras melhorias

- **Usabilidade e navegação**
  - Sticky header/anchor para o drill‑down (compensar cabeçalhos fixos)
  - Barra de busca e filtros (por empresa, área, senioridade, localização)
  - Multi‑seleção e ações em lote (exportar várias empresas/áreas de uma vez)

- **Dados e performance**
  - Validação de esquema do CSV (ex.: Zod) com mensagens claras
  - Suporte a arquivos grandes com Web Workers/streaming para não travar a UI
  - Cache dos resultados e persistência (LocalStorage/IndexedDB)

- **Compatibilidade**
  - Alternativa ao `webkitdirectory` para Safari
  - Internacionalização (pt‑BR/en)

- **Análises adicionais**
  - Séries temporais (se houver data nos dados)
  - Enriquecimento externo opcional (evitar PII sensível por padrão)
  - Exportação dos agregados (tabelas de empresas, áreas, senioridade) em CSV

- **Qualidade**
  - Testes unitários para utilitários de parsing/normalização
  - Verificações de acessibilidade (focus, contraste, navegação por teclado)
