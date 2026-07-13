# Arquitetura

O navegador é a autoridade do diário (Dexie/IndexedDB). O D1 contém apenas dados compartilhados. Schemas Zod e regras puras ficam em `packages/shared`. O Worker usa Hono, queries parametrizadas, request IDs, cache HTTP, CSP e segredo administrativo. A PWA armazena o shell, o último painel NOAA e conjuntos recentes de resultados EiBi, evitando copiar toda a base.
