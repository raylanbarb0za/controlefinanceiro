/*  1. Constantes e estado global
    2. Funções auxiliares (helpers)
    3. Cabeçalho: navegação de mês e tema
    4. Resumo do mês (saldo, entradas, saídas)
    5. Lançamento rápido
    6. Comparação e gráficos
    7. Filtro de lançamentos
    8. Meus lançamentos (tabela e carrossel)
    9. Cartão de crédito
   10. Backup dos dados
   11. Janela modal
   12. Atualização geral da tela (updateAll)
   13. Inicialização
*/

//1. CONSTANTES E ESTADO GLOBAL
// Dados salvos no navegador
let transactions =
  JSON.parse(localStorage.getItem("finance-transactions")) || [];
let creditCardPurchases =
  JSON.parse(localStorage.getItem("finance-cc-purchases")) || [];

// Mês exibido (formato "2026-11")
let selectedMonth = monthKey(new Date());

// Lista de lançamentos atualmente em exibição (muda com os filtros)
let currentlyDisplayedTransactions = [];

// Carrosséis
let currentSlide = 0;
let ccCurrentSlide = 0;

// Edição em andamento
let editingTransactionId = null;
let editingCreditCardId = null;

// Modal
let onConfirmCallback = null;

// Gráficos
let chartCategorias = null;
let chartMeses = null;

// Constantes
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

//grafico categoria
const CORES = [
  "#2B59E0",
  "#0E9F6E",
  "#C8A24A",
  "#D13B47",
  "#7C5CFF",
  "#0FA3B1",
  "#F08A24",
  "#64748B",
];

const REGRAS_CATEGORIA = [
  ["Uber/99", /\b(uber|99|taxi|corrida)\b/],
  ["Estivas", /\b(mercado|supermercado|feira|atacadao|acougue)\b/],
  [
    "Gastos Fora de Casa",
    /\b(restaurante|lanche|almoco|jantar|ifood|pizza|cafe|padaria|sorvete)\b/,
  ],
  ["Moradia", /\b(aluguel|luz|energia|agua|internet|condominio|iptu)\b/],
  ["Cartão de Débito/Pix", /\b(pix|debito)\b/],
];
const PALAVRAS_ENTRADA =
  /\b(salario|recebi|recebimento|freela|rendimento|reembolso|venda)\b/;
const TAGS_CATEGORIA = {
  salario: "Salário",
  pix: "Cartão de Débito/Pix",
  uber: "Uber/99",
  fora: "Gastos Fora de Casa",
  pessoais: "Gastos Pessoais",
  moradia: "Moradia",
  estivas: "Estivas",
  outros: "Outros",
};

//2. FUNÇÕES AUXILIARES (HELPERS)
// Formatação
function formatCurrency(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateString) {
  if (!dateString) return "";
  if (dateString.includes("-")) {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }
  return dateString;
}

function dataAmigavel(iso) {
  return iso === isoDate(new Date()) ? "hoje" : formatDate(iso);
}

function isoDate(d) {
  return d.toLocaleDateString("sv-SE");
}

// Texto
function sa(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

function normalizarCategoria(categoria) {
  const lower = categoria.toLowerCase();
  if (lower.includes("pix") || lower.includes("cartão de débito")) {
    return "Cartão de Débito/Pix";
  }
  return categoria;
}

// Meses
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthOf(dateString) {
  if (!dateString) return "";
  if (dateString.includes("/")) {
    const [, m, y] = dateString.split("/");
    return `${y}-${m.padStart(2, "0")}`;
  }
  return dateString.slice(0, 7);
}

function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${MESES[Number(m) - 1]}/${y}`;
}

// Dados
function getMonthTransactions() {
  return transactions.filter((t) => monthOf(t.date) === selectedMonth);
}

function sumBy(list, type) {
  return list
    .filter((t) => t.type === type)
    .reduce((acc, t) => acc + t.amount, 0);
}

// Armazenamento
function saveTransactionsToStorage() {
  localStorage.setItem("finance-transactions", JSON.stringify(transactions));
}

function saveCreditCardPurchasesToStorage() {
  localStorage.setItem(
    "finance-cc-purchases",
    JSON.stringify(creditCardPurchases),
  );
}

//CABEÇALHO: NAVEGAÇÃO DE MÊS E TEMA

const monthPicker = document.getElementById("campo-mes");

function setMonth(key) {
  if (!key) return;
  selectedMonth = key;
  currentSlide = 0;
  updateAll();
  clearFilters();
}

document.getElementById("mes-anterior").addEventListener("click", () => setMonth(shiftMonth(selectedMonth, -1)));
document.getElementById("mes-seguinte").addEventListener("click", () => setMonth(shiftMonth(selectedMonth, 1)));
document.getElementById("mes-atual").addEventListener("click", () => setMonth(monthKey(new Date())));
monthPicker.addEventListener("change", () => setMonth(monthPicker.value));

document.getElementById("alternar-tema").addEventListener("click", () => {
  const novo =
    document.documentElement.dataset.tema === "escuro" ? "claro" : "escuro";
  document.documentElement.dataset.tema = novo;
  try {
    localStorage.setItem("finance-theme", novo);
  } catch (e) {}
});

//4. RESUMO DO MÊS
const totalEntradasEl = document.getElementById("total-entradas");
const totalSaidasEl = document.getElementById("total-saidas");
const saldoFinalEl = document.getElementById("saldo-final");

function updateSummary() {
  const mes = getMonthTransactions();
  const entradas = sumBy(mes, "Entrada");
  const saidas = sumBy(mes, "Saída");
  const saldo = entradas - saidas;
  animarValor(totalEntradasEl, entradas);
  animarValor(totalSaidasEl, saidas);
  animarValor(saldoFinalEl, saldo);
  document.getElementById("saldo-acumulado").textContent =
    "Acumulado total: " +
    formatCurrency(
      sumBy(transactions, "Entrada") - sumBy(transactions, "Saída"),
    );
  document.getElementById("resumo").dataset.estado =
    saldo > 0 ? "positivo" : saldo < 0 ? "negativo" : "zero";
}

// Animação de contagem dos valores
function animarValor(el, para) {
  const de = el._valor !== undefined ? el._valor : 0;
  el._valor = para;
  if (el._raf && window.cancelAnimationFrame) cancelAnimationFrame(el._raf);
  const reduzir =
    window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!window.requestAnimationFrame || reduzir || de === para) {
    el.textContent = formatCurrency(para);
    return;
  }
  const inicio = performance.now(),
    duracao = 550;
  const passo = (agora) => {
    const p = Math.min((agora - inicio) / duracao, 1),
      suave = 1 - Math.pow(1 - p, 3);
    el.textContent = formatCurrency(de + (para - de) * suave);
    if (p < 1) el._raf = requestAnimationFrame(passo);
  };
  el._raf = requestAnimationFrame(passo);
}

//5. LANÇAMENTO RÁPIDO
const quickInput = document.getElementById("campo-rapido");
const quickPreview = document.getElementById("previa-rapida");

function inferirCategoria(desc, type) {
  const key = sa(desc);
  const historico = [...transactions]
    .filter((t) => t.type === type)
    .sort((a, b) => b.id - a.id);
  const exata = historico.find((t) => sa(t.description) === key);
  if (exata) return normalizarCategoria(exata.category);
  const primeira = key.split(" ")[0];
  if (primeira.length >= 3) {
    const parecida = historico.find(
      (t) => sa(t.description).split(" ")[0] === primeira,
    );
    if (parecida) return normalizarCategoria(parecida.category);
  }
  if (type === "Entrada") return /salario/.test(key) ? "Salário" : "Outros";
  const regra = REGRAS_CATEGORIA.find(([, re]) => re.test(key));
  return regra ? regra[0] : "Outros";
}

function parseQuick(text) {
  if (!text.trim()) return null;
  const plus = /^\s*\+/.test(text);
  let s = " " + text.trim().replace(/^\+/, " ") + " ";
  let date = new Date();
  const dm = s.match(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s/);
  const rel = s.match(/\s(hoje|ontem|anteontem)\s/i);
  if (dm) {
    const y = dm[3]
      ? dm[3].length === 2
        ? 2000 + Number(dm[3])
        : Number(dm[3])
      : date.getFullYear();
    const d = new Date(y, Number(dm[2]) - 1, Number(dm[1]));
    if (d.getMonth() !== Number(dm[2]) - 1)
      return { erro: "Data inválida. Use dia/mês, como 15/10." };
    date = d;
    s = s.replace(dm[0], " ");
  } else if (rel) {
    date.setDate(
      date.getDate() -
        { hoje: 0, ontem: 1, anteontem: 2 }[rel[1].toLowerCase()],
    );
    s = s.replace(rel[0], " ");
  }
  let categoriaEscolhida = null;
  const tagM = s.match(/\s#(\S+)/);
  if (tagM) {
    const chave = Object.keys(TAGS_CATEGORIA).find(
      (k) => k.startsWith(sa(tagM[1])) && sa(tagM[1]).length >= 2,
    );
    if (!chave)
      return {
        erro: `Categoria #${tagM[1]} não existe. Use: ${Object.keys(
          TAGS_CATEGORIA,
        )
          .map((k) => "#" + k)
          .join(" ")}`,
      };
    categoriaEscolhida = TAGS_CATEGORIA[chave];
    s = s.replace(tagM[0], " ");
  }
  const nums = [
    ...s.matchAll(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g),
  ];
  if (!nums.length) return { erro: "Falta o valor. Exemplo: uber 23,50" };
  const n = nums[nums.length - 1];
  const raw = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(n[1])
    ? n[1].replace(/\./g, "").replace(",", ".")
    : n[1].replace(",", ".");
  const amount = parseFloat(raw);
  if (!(amount > 0)) return { erro: "O valor precisa ser maior que zero." };
  s = (s.slice(0, n.index) + " " + s.slice(n.index + n[0].length))
    .replace(/r\$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return { erro: "Falta a descrição. Exemplo: uber 23,50" };
  const description = s.charAt(0).toUpperCase() + s.slice(1);
  const anterior = [...transactions]
    .sort((a, b) => b.id - a.id)
    .find((t) => sa(t.description) === sa(description));
  const type = plus
    ? "Entrada"
    : anterior
      ? anterior.type
      : PALAVRAS_ENTRADA.test(sa(description))
        ? "Entrada"
        : "Saída";
  return {
    date: isoDate(date),
    description,
    amount,
    type,
    category: categoriaEscolhida || inferirCategoria(description, type),
  };
}

function resumoQuick(r) {
  return `${r.type} de ${formatCurrency(r.amount)} em ${r.category}, ${dataAmigavel(r.date)}`;
}

function previewQuick() {
  const r = parseQuick(quickInput.value);
  quickPreview.className = "previa-rapida" + (r && r.erro ? " com-erro" : "");
  quickPreview.textContent = !r
    ? ""
    : r.erro
      ? r.erro
      : `"${r.description}": ${resumoQuick(r)}`;
}

function submitQuick() {
  const r = parseQuick(quickInput.value);
  if (!r || r.erro) {
    showModal(r ? r.erro : "Digite algo como: uber 23,50", null);
    return;
  }
  const editando = editingTransactionId !== null;
  if (editando) {
    const i = transactions.findIndex((t) => t.id === editingTransactionId);
    transactions[i] = {
      id: editingTransactionId,
      date: r.date,
      description: r.description,
      category: r.category,
      type: r.type,
      amount: r.amount,
    };
    editingTransactionId = null;
  } else {
    transactions.push({
      id: Date.now(),
      date: r.date,
      description: r.description,
      category: r.category,
      type: r.type,
      amount: r.amount,
    });
  }
  selectedMonth = monthOf(r.date);
  updateAll();
  quickInput.value = "";
  quickPreview.className = "previa-rapida com-sucesso";
  quickPreview.textContent = `${editando ? "Atualizado" : "Lançado"}: "${r.description}", ${resumoQuick(r)}.`;
  quickInput.focus();
}

// Atalhos com as descrições mais usadas
function renderQuickChips() {
  const box = document.getElementById("atalhos-rapidos");
  box.innerHTML = "";
  const usos = {};
  [...transactions]
    .sort((a, b) => b.id - a.id)
    .slice(0, 200)
    .forEach((t) => {
      const k = sa(t.description);
      if (!usos[k]) usos[k] = { ultimo: t, n: 0 };
      usos[k].n++;
    });
  Object.values(usos)
    .sort((a, b) => b.n - a.n || b.ultimo.id - a.ultimo.id)
    .slice(0, 6)
    .forEach(({ ultimo: t }) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "atalho";
      b.textContent = t.description;
      b.title = "Repetir o último valor (" + formatCurrency(t.amount) + ")";
      b.addEventListener("click", () => {
        quickInput.value = `${t.description} ${t.amount.toFixed(2).replace(".", ",")}`;
        quickInput.focus();
        quickInput.setSelectionRange(
          t.description.length + 1,
          quickInput.value.length,
        );
        previewQuick();
      });
      box.appendChild(b);
    });
}

quickInput.addEventListener("input", previewQuick);
quickInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitQuick();
  }
  if (e.key === "Escape" && editingTransactionId !== null) {
    editingTransactionId = null;
    quickInput.value = "";
    quickPreview.textContent = "Edição cancelada.";
  }
});
document.getElementById("botao-rapido").addEventListener("click", submitQuick);

//6. COMPARAÇÃO E GRÁFICOS

function renderComparison() {
  const el = document.getElementById("comparacao-mes");
  const atual = sumBy(getMonthTransactions(), "Saída");
  const prev = shiftMonth(selectedMonth, -1);
  const anterior = sumBy(
    transactions.filter((t) => monthOf(t.date) === prev),
    "Saída",
  );
  if (!anterior) {
    el.textContent = atual ? "Sem saídas no mês anterior para comparar." : "";
    return;
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  el.textContent =
    pct === 0
      ? `Suas saídas ficaram iguais às de ${monthLabel(prev)} (${formatCurrency(anterior)}).`
      : `Suas saídas estão ${Math.abs(pct)}% ${pct > 0 ? "maiores" : "menores"} que em ${monthLabel(prev)} (${formatCurrency(anterior)}).`;
}

function renderCharts() {
  const section = document.getElementById("secao-graficos");
  if (typeof Chart === "undefined") {
    section.classList.add("oculto");
    return;
  }

  // Gráfico 1: saídas por categoria
  const porCategoria = {};
  getMonthTransactions()
    .filter((t) => t.type === "Saída")
    .forEach((t) => {
      const c = normalizarCategoria(t.category);
      porCategoria[c] = (porCategoria[c] || 0) + t.amount;
    });
  const cats = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  document
    .getElementById("grafico-categorias-vazio")
    .classList.toggle("oculto", cats.length > 0);
  if (chartCategorias) chartCategorias.destroy();
  chartCategorias = new Chart(document.getElementById("grafico-categorias"), {
    type: "doughnut",
    data: {
      labels: cats.map((c) => c[0]),
      datasets: [{ data: cats.map((c) => c[1]), backgroundColor: CORES }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  });

  // Gráfico 2: últimos 6 meses
  const keys = [5, 4, 3, 2, 1, 0].map((i) => shiftMonth(selectedMonth, -i));
  const porMes = keys.map((k) =>
    transactions.filter((t) => monthOf(t.date) === k),
  );
  if (chartMeses) chartMeses.destroy();
  chartMeses = new Chart(document.getElementById("grafico-meses"), {
    type: "bar",
    data: {
      labels: keys.map((k) => `${k.slice(5)}/${k.slice(2, 4)}`),
      datasets: [
        {
          label: "Entradas",
          data: porMes.map((l) => sumBy(l, "Entrada")),
          backgroundColor: "#0E9F6E",
          borderRadius: 6,
        },
        {
          label: "Saídas",
          data: porMes.map((l) => sumBy(l, "Saída")),
          backgroundColor: "#D13B47",
          borderRadius: 6,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
          },
        },
      },
    },
  });
}

//7. FILTRO DE LANÇAMENTOS
const filterStartDate = document.getElementById("filtro-data-inicio");
const filterEndDate = document.getElementById("filtro-data-fim");
const filterCategory = document.getElementById("filtro-categoria");
const filterType = document.getElementById("filtro-tipo");
const filterBtn = document.getElementById("botao-filtrar");
const clearFilterBtn = document.getElementById("botao-limpar-filtro");
const filteredSummaryEl = document.getElementById("resumo-filtrado");
const filteredSummaryTotalEl = document.getElementById("total-resumo-filtrado");

function applyFilters() {
  const startDateString = filterStartDate.value;
  const endDateString = filterEndDate.value;
  const startDate = startDateString
    ? new Date(startDateString + "T00:00:00")
    : null;
  const endDate = endDateString ? new Date(endDateString + "T00:00:00") : null;

  // Com período informado, busca em todos os meses; sem período, filtra dentro do mês selecionado
  const baseList = startDate || endDate ? transactions : getMonthTransactions();
  const filteredTransactions = baseList.filter((transaction) => {
    let transactionDate;
    const dateString = transaction.date;
    if (dateString.includes("/")) {
      const [day, month, year] = dateString.split("/");
      transactionDate = new Date(year, month - 1, day);
    } else if (dateString.includes("-")) {
      transactionDate = new Date(dateString + "T00:00:00");
    } else {
      return false;
    }

    if (isNaN(transactionDate.getTime())) {
      return false;
    }

    const dateMatch =
      (!startDate || transactionDate >= startDate) &&
      (!endDate || transactionDate <= endDate);
    const categoriaNormalizada = normalizarCategoria(transaction.category);
    const categoryMatch =
      !filterCategory.value || categoriaNormalizada === filterCategory.value;
    const typeMatch =
      !filterType.value || transaction.type === filterType.value;
    return dateMatch && categoryMatch && typeMatch;
  });

  // Atualiza a lista ativa e reseta o slide
  currentlyDisplayedTransactions = filteredTransactions;
  currentSlide = 0;

  renderTransactionViews(currentlyDisplayedTransactions);
  updateFilteredSummary(currentlyDisplayedTransactions);
}

function clearFilters() {
  filterStartDate.value = "";
  filterEndDate.value = "";
  filterCategory.value = "";
  filterType.value = "";

  // Restaura a lista ativa para a original e reseta o slide
  currentlyDisplayedTransactions = getMonthTransactions();
  currentSlide = 0;

  renderTransactionViews(currentlyDisplayedTransactions);
  updateFilteredSummary(currentlyDisplayedTransactions);
}

function updateFilteredSummary(filteredTransactions) {
  let totalEntradas = 0;
  let totalSaidas = 0;
  filteredTransactions.forEach((t) => {
    if (t.type === "Entrada") {
      totalEntradas += t.amount;
    } else {
      totalSaidas += t.amount;
    }
  });

  let valorExibido;
  const tipoFiltrado = filterType.value;

  if (tipoFiltrado === "Saída") {
    valorExibido = totalSaidas;
  } else if (tipoFiltrado === "Entrada") {
    valorExibido = totalEntradas;
  } else {
    valorExibido = totalEntradas - totalSaidas;
  }

  filteredSummaryTotalEl.textContent = `R$ ${valorExibido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const anyFilterApplied =
    filterStartDate.value ||
    filterEndDate.value ||
    filterCategory.value ||
    filterType.value;
  if (anyFilterApplied && filteredTransactions.length > 0) {
    filteredSummaryEl.classList.remove("oculto");
  } else {
    filteredSummaryEl.classList.add("oculto");
  }
}

filterBtn.addEventListener("click", applyFilters);
clearFilterBtn.addEventListener("click", clearFilters);

//8. MEUS LANÇAMENTOS (TABELA E CARROSSEL)
const transactionTableBody = document.getElementById(
  "corpo-tabela-lancamentos",
);
const slider = document.getElementById("faixa-lancamentos");
const prevBtn = document.getElementById("botao-anterior");
const nextBtn = document.getElementById("botao-proximo");
const slideCounter = document.getElementById("contador-slides");

function renderTransactionViews(transactionsToRender) {
  transactionTableBody.innerHTML = "";
  slider.innerHTML = "";

  if (transactionsToRender.length === 0) {
    transactionTableBody.innerHTML = `<tr><td colspan="5" class="vazio">Nenhum lançamento encontrado.</td></tr>`;
    slider.innerHTML = `<div class="slide-carrossel vazio">Nenhum lançamento encontrado.</div>`;
    updateNavButtons(transactionsToRender);
    return;
  }

  const sortedTransactions = [...transactionsToRender].sort((a, b) => {
    let dateA = a.date.includes("/")
      ? new Date(a.date.split("/").reverse().join("-"))
      : new Date(a.date);
    let dateB = b.date.includes("/")
      ? new Date(b.date.split("/").reverse().join("-"))
      : new Date(b.date);
    if (dateB - dateA !== 0) {
      return dateB - dateA;
    }
    return b.id - a.id;
  });

  sortedTransactions.forEach((t) => {
    const isEntrada = t.type === "Entrada";
    const valorFormatado = t.amount.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const corValor = isEntrada ? "valor-entrada" : "valor-saida";
    const sinal = isEntrada ? "+" : "-";
    const categoriaNormalizada = normalizarCategoria(t.category);

    const tableRow = document.createElement("tr");
    tableRow.innerHTML = `
        <td class="texto-suave">${formatDate(t.date)}</td>
        <td class="destaque">${esc(t.description)}</td>
        <td><span class="etiqueta">${categoriaNormalizada}</span></td>
        <td class="numero ${corValor}">${sinal} R$ ${valorFormatado}</td>
        <td class="acoes">
            <button onclick="deleteTransaction(${t.id})" class="botao-link botao-link--perigo">Excluir</button>
            <button onclick="editTransaction(${t.id})" class="botao-link">Editar</button>
        </td>`;
    transactionTableBody.appendChild(tableRow);

    const slideDiv = document.createElement("div");
    slideDiv.className = "slide-carrossel";
    slideDiv.innerHTML = `
        <div class="slide-dado"><span class="slide-rotulo">Data:</span><span class="slide-valor">${formatDate(t.date)}</span></div>
        <div class="slide-dado"><span class="slide-rotulo">Descrição:</span><span class="slide-valor destaque">${esc(t.description)}</span></div>
        <div class="slide-dado"><span class="slide-rotulo">Categoria:</span><span class="slide-valor">${categoriaNormalizada}</span></div>
        <div class="slide-dado"><span class="slide-rotulo">Valor:</span><span class="slide-valor ${corValor}">${sinal} R$ ${valorFormatado}</span></div>
        <div class="slide-acoes"><button onclick="deleteTransaction(${t.id})" class="botao-link botao-link--perigo">Excluir Lançamento</button></div>
        <div class="slide-acoes"><button onclick="editTransaction(${t.id})" class="botao-link">Editar Lançamento</button></div>`;
    slider.appendChild(slideDiv);
  });

  showSlide(currentSlide, transactionsToRender);
}

function editTransaction(id) {
  const t = transactions.find((item) => item.id === id);
  if (!t) return;
  showModal("Deseja editar este lançamento?", () => {
    const tag = Object.keys(TAGS_CATEGORIA).find(
      (k) => TAGS_CATEGORIA[k] === normalizarCategoria(t.category),
    );
    const [y, m, d] = t.date.includes("/")
      ? t.date.split("/").reverse()
      : t.date.split("-");
    quickInput.value = `${t.type === "Entrada" ? "+ " : ""}${t.description} ${t.amount.toFixed(2).replace(".", ",")} ${Number(d)}/${Number(m)}/${y}${tag ? " #" + tag : ""}`;
    editingTransactionId = id;
    previewQuick();
    quickPreview.textContent =
      "Editando: " + quickPreview.textContent + " (Enter salva, Esc cancela)";
    quickInput.scrollIntoView({ behavior: "smooth", block: "center" });
    quickInput.focus();
  });
}

window.deleteTransaction = function (id) {
  showModal("Tem certeza que deseja excluir este lançamento?", () => {
    transactions = transactions.filter((t) => t.id !== id);
    updateAll();
    // Se os filtros estiverem ativos, reaplica para atualizar a visão
    if (
      filterStartDate.value ||
      filterEndDate.value ||
      filterCategory.value ||
      filterType.value
    ) {
      applyFilters();
    }
  });
};

// Carrossel de lançamentos
function showSlide(index, sourceArray) {
  if (sourceArray.length === 0) return;
  if (index >= sourceArray.length) index = sourceArray.length - 1;
  if (index < 0) index = 0;
  slider.style.transform = `translateX(-${index * 100}%)`;
  currentSlide = index;
  updateNavButtons(sourceArray);
}

function updateNavButtons(sourceArray) {
  if (sourceArray.length === 0) {
    slideCounter.textContent = "0 / 0";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  slideCounter.textContent = `${currentSlide + 1} / ${sourceArray.length}`;
  prevBtn.disabled = currentSlide === 0;
  nextBtn.disabled = currentSlide === sourceArray.length - 1;
}

prevBtn.addEventListener("click", () =>
  showSlide(currentSlide - 1, currentlyDisplayedTransactions),
);
nextBtn.addEventListener("click", () =>
  showSlide(currentSlide + 1, currentlyDisplayedTransactions),
);

//9. CARTÃO DE CRÉDITO

const creditCardForm = document.getElementById("formulario-cartao");
const totalFaturaEl = document.getElementById("total-fatura");
const creditCardTableBody = document.getElementById("corpo-tabela-cartao");
const ccSlider = document.getElementById("faixa-cartao");
const ccPrevBtn = document.getElementById("botao-cartao-anterior");
const ccNextBtn = document.getElementById("botao-cartao-proximo");
const ccSlideCounter = document.getElementById("contador-slides-cartao");

// Formulário
function addCreditCardPurchase(e) {
  e.preventDefault();
  const description = document.getElementById("cartao-descricao").value;
  const amount = parseFloat(document.getElementById("cartao-valor").value);
  const installmentCurrent = document.getElementById(
    "cartao-parcela-atual",
  ).value;
  const installmentTotal = document.getElementById(
    "cartao-parcela-total",
  ).value;

  if (!description || isNaN(amount) || amount <= 0) {
    showModal(
      "Por favor, preencha a descrição e o valor com dados válidos.",
      null,
    );
    return;
  }
  if (
    (installmentCurrent && !installmentTotal) ||
    (!installmentCurrent && installmentTotal)
  ) {
    showModal(
      "Para compras parceladas, preencha a parcela atual e a total.",
      null,
    );
    return;
  }

  if (editingCreditCardId) {
    const index = creditCardPurchases.findIndex(
      (p) => p.id === editingCreditCardId,
    );
    creditCardPurchases[index] = {
      id: editingCreditCardId,
      description,
      amount,
      installmentCurrent: installmentCurrent
        ? parseInt(installmentCurrent)
        : null,
      installmentTotal: installmentTotal ? parseInt(installmentTotal) : null,
    };
    editingCreditCardId = null;
  } else {
    creditCardPurchases.push({
      id: Date.now(),
      description,
      amount,
      installmentCurrent: installmentCurrent
        ? parseInt(installmentCurrent)
        : null,
      installmentTotal: installmentTotal ? parseInt(installmentTotal) : null,
    });
  }

  updateAll();
  creditCardForm.reset();
}

// Total da fatura
function updateCreditCardSummary() {
  const totalFatura = creditCardPurchases.reduce((acc, p) => acc + p.amount, 0);
  totalFaturaEl.textContent = formatCurrency(totalFatura);
}

// Tabela e carrossel de compras
function renderCreditCardViews() {
  creditCardTableBody.innerHTML = "";
  ccSlider.innerHTML = "";
  if (creditCardPurchases.length === 0) {
    creditCardTableBody.innerHTML = `<tr><td colspan="4" class="vazio">Nenhuma compra no cartão adicionada ainda.</td></tr>`;
    ccSlider.innerHTML = `<div class="slide-carrossel vazio">Nenhuma compra no cartão.</div>`;
    updateCreditCardNavButtons();
    return;
  }

  const sortedPurchases = [...creditCardPurchases].sort((a, b) => b.id - a.id);
  sortedPurchases.forEach((p) => {
    let installmentText = "Pagamento Único";
    if (p.installmentCurrent && p.installmentTotal)
      installmentText = `${p.installmentCurrent} / ${p.installmentTotal}`;
    const tableRow = document.createElement("tr");
    tableRow.innerHTML = `
        <td class="destaque">${esc(p.description)}</td>
        <td class="numero valor-saida">${formatCurrency(p.amount)}</td>
        <td class="texto-suave centro">${installmentText}</td>
        <td class="acoes">
            <button onclick="deleteCreditCardPurchase(${p.id})" class="botao-link botao-link--perigo">Excluir</button>
            <button onclick="editCreditCardPurchase(${p.id})" class="botao-link">Editar</button>
        </td>`;
    creditCardTableBody.appendChild(tableRow);

    const slideDiv = document.createElement("div");
    slideDiv.className = "slide-carrossel";
    slideDiv.innerHTML = `
        <div class="slide-dado"><span class="slide-rotulo">Descrição:</span><span class="slide-valor destaque">${esc(p.description)}</span></div>
        <div class="slide-dado"><span class="slide-rotulo">Valor:</span><span class="slide-valor valor-saida">${formatCurrency(p.amount)}</span></div>
        <div class="slide-dado"><span class="slide-rotulo">Parcelas:</span><span class="slide-valor">${installmentText}</span></div>
        <div class="slide-acoes"><button onclick="deleteCreditCardPurchase(${p.id})" class="botao-link botao-link--perigo">Excluir Lançamento</button></div>
        <div class="slide-acoes"><button onclick="editCreditCardPurchase(${p.id})" class="botao-link">Editar Lançamento</button></div>`;
    ccSlider.appendChild(slideDiv);
  });
  showCreditCardSlide(0);
}

function editCreditCardPurchase(id) {
  const purchase = creditCardPurchases.find((p) => p.id === id);
  if (purchase) {
    showModal("Deseja editar esta compra do cartão?", () => {
      document.getElementById("cartao-descricao").value = purchase.description;
      document.getElementById("cartao-valor").value = purchase.amount;
      document.getElementById("cartao-parcela-atual").value =
        purchase.installmentCurrent || "";
      document.getElementById("cartao-parcela-total").value =
        purchase.installmentTotal || "";
      editingCreditCardId = id;
    });
  }
}

window.deleteCreditCardPurchase = function (id) {
  showModal("Tem certeza que deseja excluir esta compra do cartão?", () => {
    creditCardPurchases = creditCardPurchases.filter((p) => p.id !== id);
    updateAll();
  });
};

// Carrossel do cartão
function showCreditCardSlide(index) {
  if (creditCardPurchases.length === 0) return;
  if (index >= creditCardPurchases.length)
    index = creditCardPurchases.length - 1;
  if (index < 0) index = 0;
  ccSlider.style.transform = `translateX(-${index * 100}%)`;
  ccCurrentSlide = index;
  updateCreditCardNavButtons();
}

function updateCreditCardNavButtons() {
  if (creditCardPurchases.length === 0) {
    ccSlideCounter.textContent = "0 / 0";
    ccPrevBtn.disabled = true;
    ccNextBtn.disabled = true;
    return;
  }
  ccSlideCounter.textContent = `${ccCurrentSlide + 1} / ${creditCardPurchases.length}`;
  ccPrevBtn.disabled = ccCurrentSlide === 0;
  ccNextBtn.disabled = ccCurrentSlide === creditCardPurchases.length - 1;
}

creditCardForm.addEventListener("submit", addCreditCardPurchase);
ccPrevBtn.addEventListener("click", () =>
  showCreditCardSlide(ccCurrentSlide - 1),
);
ccNextBtn.addEventListener("click", () =>
  showCreditCardSlide(ccCurrentSlide + 1),
);

//10. BACKUP DOS DADOS

function exportBackup() {
  const data = {
    app: "controle-financeiro",
    versao: 1,
    exportadoEm: new Date().toISOString(),
    transactions,
    creditCardPurchases,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `controle-financeiro-${new Date().toLocaleDateString("sv-SE")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  localStorage.setItem("finance-last-backup", String(Date.now()));
  renderBackupInfo();
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const ok =
        Array.isArray(data.transactions) &&
        Array.isArray(data.creditCardPurchases) &&
        data.transactions.every(
          (t) => t && t.date && typeof t.amount === "number",
        );
      if (!ok) throw new Error("formato");
      showModal(
        `Importar ${data.transactions.length} lançamentos e ${data.creditCardPurchases.length} compras de cartão? Os dados atuais serão substituídos.`,
        () => {
          transactions = data.transactions;
          creditCardPurchases = data.creditCardPurchases;
          updateAll();
          clearFilters();
        },
      );
    } catch (err) {
      showModal(
        "Arquivo inválido. Use um backup exportado por este site.",
        null,
      );
    }
  };
  reader.readAsText(file);
}

function renderBackupInfo() {
  const el = document.getElementById("info-backup");
  const last = Number(localStorage.getItem("finance-last-backup")) || 0;
  const dias = last ? Math.floor((Date.now() - last) / 86400000) : null;
  el.textContent = last
    ? `Último backup: ${new Date(last).toLocaleDateString("pt-BR")} ${dias > 0 ? `(há ${dias} dias)` : "(hoje)"}`
    : "Você ainda não fez nenhum backup.";
  el.className =
    "info-backup" + (dias === null || dias >= 7 ? " com-alerta" : "");
}

document
  .getElementById("botao-exportar")
  .addEventListener("click", exportBackup);
document
  .getElementById("botao-importar")
  .addEventListener("click", () =>
    document.getElementById("arquivo-importacao").click(),
  );
document
  .getElementById("arquivo-importacao")
  .addEventListener("change", (e) => {
    if (e.target.files[0]) importBackup(e.target.files[0]);
    e.target.value = "";
  });

//11. JANELA MODAL */

const modal = document.getElementById("janela-modal");
const modalMessage = document.getElementById("mensagem-modal");
const modalButtons = document.getElementById("botoes-modal");

function showModal(message, callback) {
  modalMessage.textContent = message;
  onConfirmCallback = callback;
  modalButtons.innerHTML = "";
  if (callback) {
    modalButtons.innerHTML = `
        <button id="botao-modal-confirmar" class="botao botao--perigo">Sim</button>
        <button id="botao-modal-cancelar" class="botao botao--secundario">Não</button>
    `;
    document.getElementById("botao-modal-confirmar").onclick = () => {
      if (onConfirmCallback) onConfirmCallback();
      hideModal();
    };
    document.getElementById("botao-modal-cancelar").onclick = hideModal;
  } else {
    modalButtons.innerHTML = `<button id="botao-modal-ok" class="botao botao--primario botao--total">OK</button>`;
    document.getElementById("botao-modal-ok").onclick = hideModal;
  }
  modal.classList.remove("oculto");
}

function hideModal() {
  modal.classList.add("oculto");
  onConfirmCallback = null;
}

// 12. ATUALIZAÇÃO GERAL DA TELA. Chama as funções de cada seção, na ordem em que aparecem no HTML.
// Textos e gráficos que dependem do mês selecionado
function renderMonthUI() {
  monthPicker.value = selectedMonth; // 3. cabeçalho
  renderQuickChips(); // 5. lançamento rápido
  renderComparison(); // 6. comparação
  renderCharts(); // 6. gráficos
  document.getElementById("dica-filtro").innerHTML =
    `Sem datas, o filtro vale só para <strong>${monthLabel(selectedMonth)}</strong>. Use De e Até para filtrar o período.`; // 7. filtro
  renderBackupInfo(); // 10. backup
}

function updateAll() {
  // Garante que a lista ativa esteja sincronizada quando tudo é atualizado
  currentlyDisplayedTransactions = getMonthTransactions();

  updateSummary(); // 4. resumo
  renderMonthUI(); // 3, 5, 6, 7 e 10
  renderTransactionViews(currentlyDisplayedTransactions); // 8. lançamentos
  saveTransactionsToStorage();

  renderCreditCardViews(); // 9. cartão
  updateCreditCardSummary();
  saveCreditCardPurchasesToStorage();
}

//13. REINICIALIZAÇÃO

// Mantém a página no topo ao dar F5
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.addEventListener("load", () => {
  window.scrollTo(0, 0);
});

// Pede ao navegador para não apagar os dados automaticamente quando faltar espaço
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

updateAll();