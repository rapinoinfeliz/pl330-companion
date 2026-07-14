# Fontes de dados

EiBi é baixada do CSV semicolon-separated da temporada anunciada na página principal. Em julho de 2026, a temporada era A26 e o cabeçalho trazia nomes com limites anotados, como `kHz:75` e `Time(UTC):93`; o parser remove anotações e exige os campos essenciais.

NOAA SWPC usa adaptadores separados: Kp de 3 horas (`Kp`), Kp de 1 minuto (`estimated_kp`), previsão (`kp`), fluxo de 30 dias, medições detalhadas F10.7, alertas e escalas indexadas por dia. Coleta e observação são preservadas separadamente.

Emissoras FM e MW brasileiras vêm das bases abertas SCR do Ministério das Comunicações/Anatel. Rádios comunitárias vêm da base RADCOM, com a frequência derivada da canalização oficial; estações brasileiras OC/OT vêm do SRD. O gerador `scripts/update-radio-catalog.py` filtra faixas cobertas pelo PL-330, remove canais vagos/excluídos, deduplica e publica um JSON compacto. Um workflow mensal atualiza o arquivo e o push aciona o deploy da Cloudflare.

O Radio Garden é apenas uma referência complementar de streams online. A especificação OpenAPI encontrada é comunitária e não oficial, e a presença de um stream não comprova uma transmissão terrestre recebível. Por isso esses dados não são misturados ao catálogo técnico nem à pontuação.
