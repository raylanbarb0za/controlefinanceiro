# Meu Controle Financeiro Web

Aplicação web simples para controle financeiro pessoal, desenvolvida com HTML, CSS e JavaScript puro, estilizada com Tailwind CSS. Permite registrar entradas e saídas, acompanhar o saldo, filtrar lançamentos por período, categoria e tipo, além de controlar as compras e parcelas do cartão de crédito.

## Objetivo

O projeto foi criado para facilitar o acompanhamento das finanças pessoais de forma rápida, visual e sem complicação, permitindo:

Registrar lançamentos de entrada e saída, com data, descrição, categoria e valor
Visualizar um resumo com total de entradas, total de saídas e saldo final
Filtrar lançamentos por período (data inicial e final), categoria e tipo, com soma do total filtrado
Controlar compras no cartão de crédito, incluindo compras parceladas (parcela atual / total)
Acompanhar o valor total da fatura atual do cartão
Navegar pelos lançamentos e compras através de um carrossel, além da tabela tradicional

## Tecnologias utilizadas

**HTML5** — estruturação da interface
**Tailwind CSS** (via CDN) — estilização e responsividade
**CSS3** — estilos complementares
**JavaScript** — lógica da aplicação, manipulação do DOM e regras de negócio

## Funcionalidades

### Lançamentos (entradas e saídas)
Formulário com data, descrição, categoria (Salário, Cartão de Débito/Pix, Uber/99, Gastos Fora de Casa, Gastos Pessoais, Moradia, Estivas, Outros) e tipo (Entrada/Saída)
Listagem em tabela e em carrossel, com opção de exclusão
Resumo automático de totais e saldo

### Filtros
Filtro por intervalo de datas, categoria e tipo
Exibição do valor total do período filtrado

### Cartão de crédito
Cadastro de compras, com suporte a parcelamento (parcela atual de X)
Listagem das compras da fatura em tabela e carrossel
Cálculo automático do total da fatura atual

### Interface
Modal de confirmação/alerta personalizado para ações como exclusão

## Como executar o projeto

Por ser um projeto front-end puro, não há necessidade de instalação de dependências. Basta:

1. Clonar o repositório:

git clone https://github.com/raylanbarb0za/controlefinanceiro.git

2. Acessar a pasta do projeto:

cd controlefinanceiro

3. Abrir o arquivo index.html diretamente no navegador.

## Estrutura do projeto

controlefinanceiro/
├── index.html      # Estrutura e componentes da interface
├── index.js        # Lógica da aplicação (lançamentos, filtros, cartão de crédito)
└── style.css        # Estilização complementar

## Status do projeto

Projeto finalizado com alguns erros, aberto a melhorias e novas funcionalidades.

## Contribuições

Sugestões, correções e melhorias são bem-vindas! Sinta-se à vontade para abrir uma *issue* ou enviar um *pull request*.

Este projeto está disponível livremente para fins de estudo e uso pessoal.
