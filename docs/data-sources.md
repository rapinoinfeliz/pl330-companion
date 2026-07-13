# Fontes de dados

EiBi é baixada do CSV semicolon-separated da temporada anunciada na página principal. Em julho de 2026, a temporada era A26 e o cabeçalho trazia nomes com limites anotados, como `kHz:75` e `Time(UTC):93`; o parser remove anotações e exige os campos essenciais.

NOAA SWPC usa adaptadores separados: Kp de 3 horas (`Kp`), Kp de 1 minuto (`estimated_kp`), previsão (`kp`), fluxo de 30 dias, medições detalhadas F10.7, alertas e escalas indexadas por dia. Coleta e observação são preservadas separadamente.
