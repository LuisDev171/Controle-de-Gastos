# Verde — Controle de Gastos

Aplicativo web progressivo (PWA), com visual verde e foco em celular, para organizar despesas pessoais em quatro categorias: **Cartão, Casa, Carro e Cachorro**. A tela **Total** reúne os gastos de todas elas.

## Funcionalidades

- Cadastro e login local com e-mail e senha.
- Senha armazenada como hash PBKDF2 com salt; a senha original não é salva.
- Dados e lançamentos armazenados no navegador do próprio dispositivo (`localStorage`).
- Categorias laterais: Total, Cartão, Casa, Carro e Cachorro.
- Categorias de lançamento:
  - **Cartão:** Fatura do cartão, Compra parcelada, Anuidade e Outros.
  - **Casa:** Aluguel, Água, Luz, IPTU, Internet e Outros.
  - **Carro:** IPVA, Seguro, Mecânico, Lavador, Combustível e Outros.
  - **Cachorro:** Pet shop, Banho, Creche, Vacinas, Veterinário e Outros.
- Cada lançamento registra categoria, tipo, descrição, valor e data.
- Campo para informar a quantidade de parcelas em compras parceladas. O valor cadastrado é contabilizado uma única vez no mês da data escolhida.
- Gráficos de pizza e resumos por categoria ou tipo de gasto.
- Filtro por mês, opção de visualizar todos os meses e exclusão de lançamentos.
- Interface adaptada para celular e computador.
- Recursos PWA para instalação na tela inicial e abertura offline depois do primeiro carregamento.

## Importante sobre armazenamento e login

Este projeto **não usa servidor, banco de dados na nuvem ou sincronização**. A conta e os gastos ficam no armazenamento local do navegador em que foram criados.

Isso significa que:

- A mesma conta não é compartilhada automaticamente entre celular e computador.
- Limpar os dados do navegador, trocar de aparelho ou perder o dispositivo pode apagar os dados e impedir o acesso à conta antiga.
- Criar uma nova conta em outro aparelho começa com os lançamentos em branco.
- O login local serve para separar o uso dentro deste dispositivo; não equivale a uma autenticação de servidor e não deve ser usado para guardar informações financeiras altamente sensíveis.
- O aplicativo não possui recuperação de senha ou backup automático.

O navegador pode remover dados locais em algumas situações. Por isso, este projeto é indicado como controle pessoal simples, não como sistema financeiro com garantia de backup.

## Como publicar no GitHub Pages

1. Entre em [github.com](https://github.com/) e crie um repositório novo, por exemplo `controle-gastos-verde`.
2. Envie **todos os arquivos desta pasta** para a raiz do repositório. O arquivo `index.html` deve ficar na raiz.
3. No repositório, abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main` e a pasta `/ (root)`, depois clique em **Save**.
6. Aguarde a publicação e abra o endereço apresentado pelo GitHub Pages. O endereço terá um formato parecido com `https://seu-usuario.github.io/controle-gastos-verde/`.

O GitHub Pages fornece HTTPS, necessário para os recursos de segurança do navegador e para o service worker da versão instalável.

## Como instalar no celular

- **Android (Chrome):** abra o endereço publicado e escolha **Instalar app** ou **Adicionar à tela inicial** no menu do navegador.
- **iPhone (Safari):** abra o endereço, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**.

Depois do primeiro carregamento, os arquivos principais ficam disponíveis em cache para abrir a interface offline. O armazenamento dos dados continua sendo o armazenamento local do navegador/aplicativo.

## Testar no computador

A forma recomendada é publicar no GitHub Pages. Para testar localmente, use um servidor local (não abra o `index.html` diretamente com duplo clique), por exemplo com Python instalado:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000` no navegador.

## Estrutura do projeto

```text
controle-gastos-verde/
├── index.html          # Estrutura das telas e formulários
├── styles.css          # Tema verde e layout responsivo
├── app.js              # Login local, lançamentos, filtros e gráficos
├── manifest.json       # Configurações de instalação PWA
├── service-worker.js   # Cache dos arquivos para uso offline
├── icon.svg            # Ícone vetorial
├── icon-192.png        # Ícone PWA 192x192
├── icon-512.png        # Ícone PWA 512x512
└── README.md           # Descrição e instruções do projeto
```

## Tecnologias

- HTML, CSS e JavaScript puro.
- Web Crypto API (PBKDF2) para derivar o hash da senha.
- `localStorage` para persistência local.
- Canvas 2D para desenhar os gráficos de pizza.
- Web App Manifest e Service Worker para recursos PWA.

## Licença

Uso pessoal. Adicione uma licença específica ao repositório caso queira definir permissões de redistribuição.
