# Parser EiBi

O parser detecta cabeçalhos, aceita frequência decimal, interpreta `0000-2400`, dias nomeados, numéricos e intervalos, registra linhas inválidas e deduplica por hash. A importação escreve em staging, somente troca a versão após o parse e mantém a anterior em caso de falha. Expressões especiais mensais são preservadas no original; quando não podem ser resolvidas com segurança, a regra diária é conservadora e a interface expõe a expressão original.
