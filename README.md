# Zeit — Cronogramas de Atividades

Sistema web para planejar e acompanhar cronogramas de **paradas, feriados e férias coletivas por KW**
(semana do calendário), no mesmo formato das planilhas "Atividades KWxx" usadas pela equipe.

Não precisa de instalação: basta abrir o `index.html` no navegador (Chrome, Edge ou Firefox).
Funciona sem internet. A biblioteca de Excel fica dentro do projeto, em `vendor/`.

> **Dados:** por enquanto, tudo é salvo no navegador (localStorage). A camada de dados (`js/store.js`)
> está isolada para ser ligada ao banco da intranet depois. Até lá, use **Configurações → Backup**
> para levar os dados de um computador a outro.

## Organização

**Setor → Subpasta → Sistema (pastas e cronogramas)**:

1. **Setor:** na tela inicial, escolha o setor (Manutenção Site, Armação, Montagem, Estamparia…) ou crie outro.
   O ícone do setor pode ser um dos ícones prontos ou uma **imagem enviada** (ex.: logo da área), em *⋯ → Editar setor*.
2. **Subpasta:** dentro do setor, escolha uma subpasta existente (ex.: `Paradas 2026`) ou crie uma nova.
   Só depois disso o sistema abre, e tudo dentro dele (dashboard, kanban, Gantt, relatórios…) mostra apenas
   o conteúdo dessa subpasta. Para trocar, use *Trocar subpasta* no menu lateral.
3. **Cronogramas:** dentro da subpasta, crie pastas e cronogramas como num drive. O cronograma tem o **título**
   (o feriado ou a ação) e as **semanas inicial e final (KW)**. Os dias de **feriado ou parada** ficam em laranja.

## Dashboards

- **Um dashboard para cada cronograma:** em *Dashboard*, escolha o cronograma na faixa do topo (Carnaval,
  Férias Coletivas…). Cada um mostra seus próprios números: progresso, horas e HH realizados, backlog,
  homens alocados, HH por dia, **curva S**, situação, horas por responsável e por fornecedor, e pendências
  com observações. O mesmo painel aparece na aba *Dashboard deste cronograma*, dentro de cada cronograma.
- Pelo **⋯** de cada cronograma na faixa dá para abrir, renomear, mudar o período, mover, duplicar,
  imprimir, exportar ou excluir.
- **Visão geral:** junta os cronogramas da subpasta no ano, com MTBF, MTTR, disponibilidade, aderência
  e um comparativo entre cronogramas.

## A grade do cronograma

Igual à planilha: **N°, Descrição da ação, Fornecedor, Resp., Situação, P/R (Plan./Real.), Horas**, a grade
dia a dia com **Mês / KW / dia** no cabeçalho, e **Progresso**.

- Escolha um código na barra **Marcar** e clique ou arraste nos dias:

  | Código | Significado |
  |---|---|
  | PL | Planejado |
  | R | Realizado |
  | P | Parada |
  | A | Atraso |
  | PE | Pendente |
  | C | Concluído |
  | N | Cancelado |
  | PO | Postergado |

  O modo **Automático** coloca PL na linha Plan. e R na linha Real.
- **Horas** = dias marcados × horas do dia, igual à fórmula `CONT.SE(...;"PL")*8` da planilha.
  **Progresso** = Real. ÷ Plan.
- **Dia inteiro ou por horas:** em cada atividade, marque *Dia inteiro* (cada dia vale X horas) ou desmarque para
  lançar as horas de cada dia (dois cliques no dia).
- **Homens necessários:** marque a caixa e informe a quantidade. O sistema calcula o **homem-hora (HH)**.
- **Adicionar observação:** para registrar, por exemplo, que um serviço foi descontinuado ou adiado.
- **Situação:** é automática pela grade (Concluído, Em andamento, Postergado, Cancelado, Atrasado…) ou escolhida à mão.
- Clique no número de um dia para marcá-lo ou desmarcá-lo como feriado.

## Telas

| Tela | O que mostra |
|---|---|
| **Dashboard** | Um painel por cronograma, mais a visão geral da subpasta (MTBF, MTTR, disponibilidade, aderência, HH) |
| **Cronogramas** | Drive de pastas e cronogramas |
| **Todas Atividades** | Lista de atividades do setor com filtros |
| **Kanban** | Atividades por situação; arraste o cartão para mudar a situação |
| **Gantt** | Cronogramas do ano, ou as atividades de um cronograma (planejado × realizado) |
| **Equipe** | Horas por responsável e por fornecedor |
| **Analytics** | HH por mês, situação, horas por fornecedor e por responsável, resumo por cronograma |
| **Timeline** | Histórico dos cronogramas por ano |
| **Calendário** | Mês a mês, com as atividades marcadas e os feriados |
| **Ocorrências** | Registro de falhas por equipamento → **MTBF, MTTR e disponibilidade** |
| **Relatórios** | Impressão, Excel e CSV |
| **Configurações** | Setor, tema claro/escuro, horas padrão, horas de operação, importação e backup |

## Excel e impressão

- **Importar:** em *Cronogramas → Importar Excel*, selecione os arquivos `.xlsx` existentes. Cada arquivo vira um
  cronograma (título, KW, feriados, atividades, códigos da grade e horas por dia tirados das fórmulas).
  Há a opção de criar pastas por ano automaticamente.
- **Exportar:** o botão *Excel* gera a planilha no mesmo layout (cores, grade, fórmulas de horas e progresso,
  aba Legendas). Em *Relatórios* dá para exportar o setor inteiro, com uma aba por cronograma.
- **Imprimir** (A4 deitada, letra grande de 11, 13 ou 15 pt):
  - **Preenchido:** como está no sistema.
  - **Para preencher:** mantém o planejado e deixa a linha Real. em branco para marcar à mão.
  - **Em branco:** só as atividades e a grade, para quando as datas ainda não são conhecidas.

  Linhas extras em branco ficam disponíveis para atividades novas. Se os dias não couberem em uma folha, a grade
  é dividida por semana.

## Estrutura

```
index.html            Página principal
css/zeit.css          Visual (tema claro e escuro)
css/print.css         Folha de impressão
vendor/exceljs.min.js Leitura e escrita de .xlsx (ExcelJS 4.4.0, MIT)
js/util.js            Datas, semanas ISO (KW), formatação
js/store.js           Dados: setores, pastas, cronogramas, falhas (trocar aqui pela API da intranet)
js/calc.js            Horas, HH, progresso, situação, MTBF/MTTR
js/ui.js              Ícones, modais, menus, tema
js/charts.js          Gráficos em SVG
js/excel.js           Importação e exportação de Excel
js/print.js           Versões para impressão
js/views/*.js         Telas
js/app.js             Rotas
js/scope.js           Setor + subpasta abertos no momento
js/seed-data.js       Dados iniciais gerados das planilhas em exemplos/
exemplos/             Planilhas reais usadas como exemplo (Carnaval KW08, Férias Coletivas KW50)
```
