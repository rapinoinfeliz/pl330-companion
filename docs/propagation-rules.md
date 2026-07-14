# Regras de propagação

A Visão geral e a página Propagação consomem o mesmo snapshot, a mesma localização salva e a mesma chamada de `recommendBands`. Assim, as três recomendações resumidas são sempre o topo da lista detalhada para o mesmo instante.

Cada banda recebe uma nota relativa de 0–100 a partir de um perfil próprio: altura solar ideal e tolerância ao afastamento, Kp, tendência recente do Kp, F10.7 e alertas recentes. Bandas baixas tendem a subir à noite; 31 m e 25 m têm janelas mais largas; bandas altas dependem mais de iluminação e fluxo solar. Perfis distintos evitam empates artificiais.

A nota ordena bandas para experimentação naquele instante; não representa probabilidade de recepção. Dados ausentes reduzem a nota e aparecem na explicação.
