# Meu Superdia

Aplicativo mobile/PWA de tarefas, jogos e recompensas para crianças de 5 a 10 anos.

## Acesso online

Abra no tablet:

`https://wdveng-bot.github.io/meu-superdia-clara/`

No primeiro acesso, o responsável configura:

- nome da criança, já sugerido como Clara;
- idade entre 5 e 10 anos;
- avatar;
- PIN do responsável.

O cadastro, os pontos, os passes de jogo, as tarefas e as recompensas permanecem salvos no mesmo tablet.

## Instalar no tablet e usar offline

### iPad

1. Abra o endereço no Safari enquanto estiver online.
2. Toque em **Compartilhar**.
3. Escolha **Adicionar à Tela de Início**.
4. Abra o Meu Superdia pelo ícone instalado pelo menos uma vez com internet.

### Tablet Android

1. Abra o endereço no Chrome enquanto estiver online.
2. Abra o menu do navegador.
3. Escolha **Instalar aplicativo** ou **Adicionar à tela inicial**.
4. Abra o Meu Superdia pelo ícone instalado pelo menos uma vez com internet.

Depois desse primeiro carregamento, o aplicativo abre e funciona sem internet. Os dados ficam armazenados no navegador do aparelho. Limpar os dados do navegador ou desinstalar o aplicativo apaga o cadastro local.

## O que funciona

- Cadastro inicial configurável e persistente.
- Modo criança com tarefas diárias, pontos, leitura em voz alta, jogos e recompensas.
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
- Criação de novas tarefas pelo responsável.
- Progresso e histórico local.
- Instalação como PWA no tablet.
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

1. cadastro configurável da Clara e persistência após recarregar;
2. migração sem perda do cadastro e dos pontos existentes;
3. tarefa solicitada pela criança e aprovada pelo responsável;
4. liberação, acúmulo e consumo dos passes de jogo;
5. três fases do Caça-estrelas, contagem regressiva, sequência e penalidade;
6. repetição do Caça-estrelas quando o tempo termina;
7. três fases da Memória com 4, 6 e 8 pares e limite de jogadas;
8. repetição da Memória ao atingir o limite;
9. seis desafios, vidas, dicas e recomeço do Laboratório de padrões;
10. nova tarefa criada pelo responsável e exibida para a criança;
11. acúmulo de pontos e progresso até a recompensa;
12. recompensa solicitada, aprovada e debitada;
13. abertura e execução dos três jogos offline;
14. manifest relativo e navegação básica acessível.

## Limites desta versão

- Um perfil infantil por navegador/aparelho.
- Sem conta na nuvem ou sincronização entre tablets.
- Sem notificações push remotas.
- O PIN protege a interface local, mas não substitui autenticação de servidor.
