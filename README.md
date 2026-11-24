# Cronograma de Atividades

Sistema web para organizar cronogramas de atividades em **pastas**, no estilo do Windows Explorer.

Não precisa de instalação nem de servidor: basta abrir o `index.html` no navegador.
Os dados ficam salvos no próprio navegador (localStorage), e dá para exportar ou importar um backup em JSON.

## Como usar

1. **Abra** o arquivo `index.html` no navegador (Chrome, Edge, Firefox…).
2. **Organize em pastas**: crie pastas e subpastas, renomeie, mova (arrastando ou pelo menu do clique direito) e exclua.
3. **Crie um cronograma** dentro de uma pasta: dê um título e escolha o **mês de início** e o **mês de término**
   (por exemplo, Novembro/2026 a Dezembro/2026). Esse é o período do cronograma.
4. **Abra o cronograma** (duplo clique). Lá dentro há quatro abas:

| Aba | O que tem |
|---|---|
| **Atividades** | Lista de atividades com responsável, início, término, dias úteis, horas estimadas, horas realizadas, progresso, status e prioridade. Filtros e ordenação. O término pode ser **calculado automaticamente** pelas horas e pela jornada diária do responsável. |
| **Responsáveis** | Pessoas do cronograma, com função e **horas disponíveis por dia**. Mostra capacidade no período, horas alocadas, ocupação (%) e alerta de sobrecarga. |
| **Horas** | Matriz de horas planejadas × capacidade por responsável, **por mês ou por semana**, com cores para ocupação e sobrecarga. Também mostra horas estimadas, realizadas e restantes de cada atividade. |
| **Dashboard** | Indicadores (total de atividades, horas planejadas e realizadas, **duração estimada**, tempo restante, progresso geral, ocupação da equipe), **gráfico de Gantt**, horas por responsável, status das atividades e horas planejadas por semana. |

### Como o tempo é calculado

- **Dias úteis**: segunda a sexta (fins de semana não contam).
- **Dias necessários** de uma atividade = horas estimadas ÷ horas por dia do responsável (arredondado para cima).
- **Capacidade** de um responsável = horas por dia × dias úteis do período do cronograma.
- **Duração estimada** do cronograma = dias úteis entre o início da primeira atividade e o término da última.
- As horas de cada atividade são distribuídas igualmente pelos seus dias úteis para montar a carga por mês/semana.
- Uma atividade não concluída cujo término já passou aparece como **Atrasada**.

### Atalhos no explorador

- Duplo clique / Enter: abrir
- Clique direito: menu (abrir, renomear, mover, duplicar, excluir)
- F2: renomear · Delete: excluir
- Arrastar e soltar: mover para outra pasta (inclusive na árvore lateral e no caminho do topo)

### No celular

O sistema funciona no navegador do celular (Chrome, Safari…). Toque em uma pasta ou cronograma para abrir
e use o botão **⋯** de cada item para renomear, mover, duplicar ou excluir (no celular não há clique direito).
O botão **☰** no topo mostra a árvore de pastas.

Os dados ficam salvos em cada navegador separadamente. Para levar seus cronogramas do PC para o celular:
clique em **Exportar** no PC, envie o arquivo `.json` para o celular (WhatsApp, e-mail, Drive…) e use **Importar** no celular.

### Backup

Use **Exportar** no topo para baixar todos os dados em JSON e **Importar** para restaurá-los
(em outro computador ou navegador, por exemplo). Dentro de um cronograma, o menu `⋯` permite exportar as atividades em CSV (abre no Excel) e imprimir.

## Estrutura

```
index.html        Página principal
css/styles.css    Estilos (tema claro e escuro automáticos)
js/utils.js       Datas, formatação e utilitários
js/store.js       Armazenamento de pastas e cronogramas
js/calc.js        Cálculos de duração, capacidade, carga e progresso
js/ui.js          Modais, menus e avisos
js/explorer.js    Explorador de pastas e árvore lateral
js/schedule.js    Abas Atividades, Responsáveis e Horas
js/dashboard.js   Dashboard e gráficos
js/app.js         Inicialização e navegação
```

Para publicar online, basta ativar o **GitHub Pages** no repositório (Settings → Pages → branch principal, pasta raiz).
