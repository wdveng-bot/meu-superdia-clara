# Meu Superdia

Aplicativo mobile/PWA de missões, jogos e recompensas para filhos de 5 a 10 anos.

## Acesso online

Abra no dispositivo:

`https://wdveng-bot.github.io/meu-superdia-clara/`

No primeiro acesso, o responsável configura:

- nome do filho, já sugerido como Clara;
- idade entre 5 e 10 anos;
- escolha entre menina e menino;
- avatar;
- PIN do responsável.

O cadastro, os pontos, os passes de jogo, as tarefas e as recompensas permanecem salvos no mesmo dispositivo.

## Instalar no dispositivo e usar offline

### iPad

1. Abra o endereço no Safari enquanto estiver online.
2. Toque em **Compartilhar**.
3. Escolha **Adicionar à Tela de Início**.
4. Abra o Meu Superdia pelo ícone instalado pelo menos uma vez com internet.

### Dispositivo Android

1. Abra o endereço no Chrome enquanto estiver online.
2. Abra o menu do navegador.
3. Escolha **Instalar aplicativo** ou **Adicionar à tela inicial**.
4. Abra o Meu Superdia pelo ícone instalado pelo menos uma vez com internet.

Depois desse primeiro carregamento, o aplicativo abre e funciona sem internet. Os dados ficam armazenados no navegador do aparelho. Limpar os dados do navegador ou desinstalar o aplicativo apaga o cadastro local.

## O que funciona

- Cadastro inicial configurável e persistente.
- Perfil do filho com 15 tarefas distribuídas entre manhã, tarde e noite, pontos, leitura em voz alta, jogos e recompensas.
- Atualização aditiva da rotina: perfis existentes recebem as novas tarefas sem perder progresso ou tarefas personalizadas.
- Modo responsável protegido pelo PIN definido no cadastro.
- Aprovação de tarefas antes da liberação dos pontos e do passe de jogo.
- Um passe acumulável por tarefa aprovada e consumo de um passe por partida.
- Três jogos disponíveis offline e com dificuldade progressiva:
  - Caça-estrelas com três fases, sequência, cronômetro e penalidade por erro;
  - Memória dos animais com 4, 6 e 8 pares e limite de jogadas;
  - Laboratório de padrões com seis desafios de lógica e três vidas.
- Fases podem ser repetidas sem gastar outro passe quando o tempo, as jogadas ou as vidas acabam.
- Jogos não geram pontos e não reduzem o saldo de recompensas.
- Barras de progresso mostram quanto falta para cada recompensa.
- Aprovação de recompensas antes do desconto dos pontos.
- Criação de novas tarefas pelo responsável com escolha do período do dia.
- Progresso e histórico local.
- Instalação como PWA no dispositivo.
- Funcionamento offline após o primeiro acesso.
- Sem anúncios, rastreadores, chat ou pagamentos.

## Abrir localmente no Windows

Dê dois cliques em `Iniciar Meu Superdia.cmd`.

O aplicativo abrirá em:

`http://127.0.0.1:4187`

Para encerrar, feche a janela preta do servidor.

## Desenvolvimento

```bash
npm install
npm start
```

## Testes

```bash
npm test
```

Cobertura automatizada atual:

1. linguagem de onboarding com “filho” e “dispositivo”;
2. painel de aventura com mascotes e carregamento offline da ilustração;
3. escolha entre menina e menino com persistência após recarregar;
4. migração do perfil antigo sem perda de cadastro, pontos, passes ou histórico;
5. cadastro configurável da Clara e persistência após recarregar;
6. rotina completa com 15 tarefas agrupadas em manhã, tarde e noite;
7. migração aditiva sem perder progresso ou tarefas personalizadas;
8. tarefa solicitada pelo filho e aprovada pelo responsável;
9. liberação, acúmulo e consumo dos passes de jogo;
10. três fases do Caça-estrelas, contagem regressiva, sequência e penalidade;
11. repetição do Caça-estrelas quando o tempo termina;
12. três fases da Memória com 4, 6 e 8 pares e limite de jogadas;
13. repetição da Memória ao atingir o limite;
14. seis desafios, vidas, dicas e recomeço do Laboratório de padrões;
15. nova tarefa criada no período escolhido pelo responsável;
16. acúmulo de pontos e progresso até a recompensa;
17. recompensa solicitada, aprovada e debitada;
18. abertura e execução dos três jogos offline;
19. manifest relativo e navegação básica acessível.

## Limites desta versão

- Um perfil infantil por navegador/aparelho.
- Sem conta na nuvem ou sincronização entre dispositivos.
- Sem notificações push remotas.
- O PIN protege a interface local, mas não substitui autenticação de servidor.
