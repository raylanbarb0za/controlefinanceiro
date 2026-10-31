// PARTE 1: SELEÇÃO DE ELEMENTOS DO HTML (DOM)
        const transactionForm = document.getElementById('transaction-form');
        const creditCardForm = document.getElementById('credit-card-form');
        const totalEntradasEl = document.getElementById('total-entradas');
        const totalSaidasEl = document.getElementById('total-saidas');
        const saldoFinalEl = document.getElementById('saldo-final');
        const saldoFinalCard = saldoFinalEl.parentElement;
        const totalFaturaEl = document.getElementById('total-fatura');
        const modal = document.getElementById('custom-modal');
        const modalMessage = document.getElementById('modal-message');
        const modalButtons = document.getElementById('modal-buttons');

        // Elementos dos Lançamentos Principais
        const transactionTableContainer = document.getElementById('transaction-table-container');
        const transactionTableBody = document.getElementById('transaction-table-body');
        const carouselContainer = document.getElementById('transaction-carousel-container');
        const slider = document.getElementById('transaction-slider');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const slideCounter = document.getElementById('slide-counter');

        // Elementos do Cartão de Crédito
        const creditCardTableContainer = document.getElementById('credit-card-table-container');
        const creditCardTableBody = document.getElementById('credit-card-table-body');
        const ccCarouselContainer = document.getElementById('credit-card-carousel-container');
        const ccSlider = document.getElementById('credit-card-slider');
        const ccPrevBtn = document.getElementById('cc-prev-btn');
        const ccNextBtn = document.getElementById('cc-next-btn');
        const ccSlideCounter = document.getElementById('cc-slide-counter');

        // Elementos dos Filtros
        const filterStartDate = document.getElementById('filter-start-date');
        const filterEndDate = document.getElementById('filter-end-date');
        const filterCategory = document.getElementById('filter-category');
        const filterType = document.getElementById('filter-type');
        const filterBtn = document.getElementById('filter-btn');
        const filteredSummaryEl = document.getElementById('filtered-summary');
        const filteredSummaryTotalEl = document.getElementById('filtered-summary-total');
        const clearFilterBtn = document.getElementById('clear-filter-btn');

        // PARTE 2: ESTADO DA APLICAÇÃO (VARIÁVEIS GLOBAIS)
        let transactions = JSON.parse(localStorage.getItem('finance-transactions')) || [];
        let creditCardPurchases = JSON.parse(localStorage.getItem('finance-cc-purchases')) || [];

        // ALTERAÇÃO: Variável de estado para a lista de transações atualmente em exibição.
        let currentlyDisplayedTransactions = [];

        let onConfirmCallback = null;
        let currentSlide = 0;
        let ccCurrentSlide = 0;
        let editingTransactionId = null;
        let editingCreditCardId = null;

        // PARTE 3: FUNÇÕES DE DADOS (ADD, DELETE, FILTER, SAVE)
        function addTransaction(e) {
            e.preventDefault();
            const date = document.getElementById('date').value;
            const description = document.getElementById('description').value;
            const category = document.getElementById('category').value;
            const type = document.getElementById('type').value;
            const amount = parseFloat(document.getElementById('amount').value);
            if (!date || !description || isNaN(amount) || amount <= 0) {
                showModal('Por favor, preencha todos os campos com valores válidos.', null);
                return;
            }

            if (editingTransactionId) {
                const index = transactions.findIndex(t => t.id === editingTransactionId);
                transactions[index] = { id: editingTransactionId, date, description, category, type, amount };
                editingTransactionId = null;
            } else {
                transactions.push({ id: Date.now(), date, description, category, type, amount });
            }

            selectedMonth = monthOf(date);
            updateAll();
            transactionForm.reset();
            document.getElementById('date').valueAsDate = new Date();
        }

        function addCreditCardPurchase(e) {
            e.preventDefault();
            const description = document.getElementById('cc-description').value;
            const amount = parseFloat(document.getElementById('cc-amount').value);
            const installmentCurrent = document.getElementById('cc-installment-current').value;
            const installmentTotal = document.getElementById('cc-installment-total').value;

            if (!description || isNaN(amount) || amount <= 0) {
                showModal('Por favor, preencha a descrição e o valor com dados válidos.', null);
                return;
            }
            if ((installmentCurrent && !installmentTotal) || (!installmentCurrent && installmentTotal)) {
                showModal('Para compras parceladas, preencha a parcela atual e a total.', null);
                return;
            }

            if (editingCreditCardId) {
                const index = creditCardPurchases.findIndex(p => p.id === editingCreditCardId);
                creditCardPurchases[index] = {
                    id: editingCreditCardId,
                    description,
                    amount,
                    installmentCurrent: installmentCurrent ? parseInt(installmentCurrent) : null,
                    installmentTotal: installmentTotal ? parseInt(installmentTotal) : null
                };
                editingCreditCardId = null;
            } else {
                creditCardPurchases.push({
                    id: Date.now(),
                    description,
                    amount,
                    installmentCurrent: installmentCurrent ? parseInt(installmentCurrent) : null,
                    installmentTotal: installmentTotal ? parseInt(installmentTotal) : null
                });
            }

            updateAll();
            creditCardForm.reset();
        }

        window.deleteTransaction = function (id) {
            showModal('Tem certeza que deseja excluir este lançamento?', () => {
                transactions = transactions.filter(t => t.id !== id);
                updateAll();
                // Se os filtros estiverem ativos, reaplica para atualizar a visão
                if (filterStartDate.value || filterEndDate.value || filterCategory.value || filterType.value) {
                    applyFilters();
                }
            });
        }

        window.deleteCreditCardPurchase = function (id) {
            showModal('Tem certeza que deseja excluir esta compra do cartão?', () => {
                creditCardPurchases = creditCardPurchases.filter(p => p.id !== id);
                updateAll();
            });
        }

        // ALTERAÇÃO 2: Funções de filtro agora gerenciam a lista 'currentlyDisplayedTransactions'
        function applyFilters() {
            const startDateString = filterStartDate.value;
            const endDateString = filterEndDate.value;
            const startDate = startDateString ? new Date(startDateString + 'T00:00:00') : null;
            const endDate = endDateString ? new Date(endDateString + 'T00:00:00') : null;

            // Com período informado, busca em todos os meses; sem período, filtra dentro do mês selecionado
            const baseList = (startDate || endDate) ? transactions : getMonthTransactions();
            const filteredTransactions = baseList.filter(transaction => {
                let transactionDate;
                const dateString = transaction.date;
                if (dateString.includes('/')) {
                    const [day, month, year] = dateString.split('/');
                    transactionDate = new Date(year, month - 1, day);
                } else if (dateString.includes('-')) {
                    transactionDate = new Date(dateString + 'T00:00:00');
                } else { return false; }

                if (isNaN(transactionDate.getTime())) { return false; }

                const dateMatch = (!startDate || transactionDate >= startDate) && (!endDate || transactionDate <= endDate);
                const categoriaNormalizada = normalizarCategoria(transaction.category);
                const categoryMatch = !filterCategory.value || categoriaNormalizada === filterCategory.value;
                const typeMatch = !filterType.value || transaction.type === filterType.value;
                return dateMatch && categoryMatch && typeMatch;
            });

            // Atualiza a lista ativa e reseta o slide
            currentlyDisplayedTransactions = filteredTransactions;
            currentSlide = 0;

            renderTransactionViews(currentlyDisplayedTransactions);
            updateFilteredSummary(currentlyDisplayedTransactions);
        }

        function clearFilters() {
            filterStartDate.value = '';
            filterEndDate.value = '';
            filterCategory.value = '';
            filterType.value = '';

            // Restaura a lista ativa para a original e reseta o slide
            currentlyDisplayedTransactions = getMonthTransactions();
            currentSlide = 0;

            renderTransactionViews(currentlyDisplayedTransactions);
            updateFilteredSummary(currentlyDisplayedTransactions); // Passa a lista correta
        }

        function updateFilteredSummary(filteredTransactions) {
            let totalEntradas = 0;
            let totalSaidas = 0;
            filteredTransactions.forEach(t => {
                if (t.type === "Entrada") {
                    totalEntradas += t.amount;
                } else {
                    totalSaidas += t.amount;
                }
            });

            let valorExibido;
            const tipoFiltrado = document.getElementById('filter-type').value;

            if (tipoFiltrado === 'Saída') {
                valorExibido = totalSaidas;
            } else if (tipoFiltrado === 'Entrada') {
                valorExibido = totalEntradas;
            } else {
                valorExibido = totalEntradas - totalSaidas;
            }

            filteredSummaryTotalEl.textContent = `R$ ${valorExibido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
            const anyFilterApplied = filterStartDate.value || filterEndDate.value || filterCategory.value || filterType.value;
            if (anyFilterApplied && filteredTransactions.length > 0) {
                filteredSummaryEl.classList.remove('hidden');
            } else {
                filteredSummaryEl.classList.add('hidden');
            }
        }

        // A função updateDisplay que sugeri antes não é mais necessária, pois a lógica está em 'renderTransactionViews' e 'updateNavButtons'

        function saveTransactionsToStorage() {
            localStorage.setItem('finance-transactions', JSON.stringify(transactions));
        }

        function saveCreditCardPurchasesToStorage() {
            localStorage.setItem('finance-cc-purchases', JSON.stringify(creditCardPurchases));
        }

        // PARTE 4: FUNÇÕES DE RENDERIZAÇÃO E UI (VISUAL)
        function renderTransactionViews(transactionsToRender) {
            transactionTableBody.innerHTML = '';
            slider.innerHTML = '';

            if (transactionsToRender.length === 0) {
                transactionTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">Nenhum lançamento encontrado.</td></tr>`;
                slider.innerHTML = `<div class="carousel-slide text-center text-gray-500 py-8">Nenhum lançamento encontrado.</div>`;
                updateNavButtons(transactionsToRender);
                return;
            }

            const sortedTransactions = [...transactionsToRender].sort((a, b) => {
                let dateA = a.date.includes('/') ? new Date(a.date.split('/').reverse().join('-')) : new Date(a.date);
                let dateB = b.date.includes('/') ? new Date(b.date.split('/').reverse().join('-')) : new Date(b.date);
                if (dateB - dateA !== 0) { return dateB - dateA; }
                return b.id - a.id;
            });

            sortedTransactions.forEach(t => {
                const isEntrada = t.type === 'Entrada';
                const valorFormatado = t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const corValor = isEntrada ? 'text-green-600' : 'text-red-600';
                const sinal = isEntrada ? '+' : '-';
                const categoriaNormalizada = normalizarCategoria(t.category);

                const tableRow = document.createElement('tr');
                tableRow.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(t.date)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${esc(t.description)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${categoriaNormalizada}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${corValor}">${sinal} R$ ${valorFormatado}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onclick="deleteTransaction(${t.id})" class="text-red-600 hover:text-red-900 text-sm font-medium">Excluir</button>
                    <button onclick="editTransaction(${t.id})" class="text-yellow-600 hover:text-yellow-900 text-sm font-medium">Editar</button>
                </td>`;
                transactionTableBody.appendChild(tableRow);

                const slideDiv = document.createElement('div');
                slideDiv.className = 'carousel-slide';
                slideDiv.innerHTML = `
                <div class="slide-data-point"><span class="slide-label">Data:</span><span class="text-sm text-gray-800">${formatDate(t.date)}</span></div>
                <div class="slide-data-point"><span class="slide-label">Descrição:</span><span class="text-sm font-medium text-gray-900">${esc(t.description)}</span></div>
                <div class="slide-data-point"><span class="slide-label">Categoria:</span><span class="text-sm text-gray-800">${categoriaNormalizada}</span></div>
                <div class="slide-data-point"><span class="slide-label">Valor:</span><span class="text-sm font-bold ${corValor}">${sinal} R$ ${valorFormatado}</span></div>
                <div class="mt-4 text-center"><button onclick="deleteTransaction(${t.id})" class="text-red-600 hover:text-red-900 text-sm font-medium">Excluir Lançamento</button></div>
                <div class="mt-4 text-center"><button onclick="editTransaction(${t.id})" class="text-yellow-600 hover:text-yellow-900 text-sm font-medium">Editar Lançamento</button></div>`;
                slider.appendChild(slideDiv);
            });

            showSlide(currentSlide, transactionsToRender);
        }

        function editTransaction(id) {
            const t = transactions.find(item => item.id === id);
            if (t) {
                showModal('Deseja editar este lançamento?', () => {
                    let dateValue = t.date;
                    if (t.date.includes('/')) {
                        const [day, month, year] = t.date.split('/');
                        dateValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    }
                    document.getElementById("date").value = dateValue;
                    document.getElementById("description").value = t.description;
                    document.getElementById("category").value = t.category;
                    document.getElementById("amount").value = t.amount;
                    document.getElementById("type").value = t.type;
                    editingTransactionId = id;
                });
            }
        }

        function editCreditCardPurchase(id) {
            const purchase = creditCardPurchases.find(p => p.id === id);
            if (purchase) {
                showModal('Deseja editar esta compra do cartão?', () => {
                    document.getElementById('cc-description').value = purchase.description;
                    document.getElementById('cc-amount').value = purchase.amount;
                    document.getElementById('cc-installment-current').value = purchase.installmentCurrent || '';
                    document.getElementById('cc-installment-total').value = purchase.installmentTotal || '';
                    editingCreditCardId = id;
                });
            }
        }

        function renderCreditCardViews() {
            creditCardTableBody.innerHTML = '';
            ccSlider.innerHTML = '';
            if (creditCardPurchases.length === 0) {
                creditCardTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-500 py-4">Nenhuma compra no cartão adicionada ainda.</td></tr>`;
                ccSlider.innerHTML = `<div class="carousel-slide text-center text-gray-500">Nenhuma compra no cartão.</div>`;
                updateCreditCardNavButtons();
                return;
            }

            const sortedPurchases = [...creditCardPurchases].sort((a, b) => b.id - a.id);
            sortedPurchases.forEach(p => {
                let installmentText = 'Pagamento Único';
                if (p.installmentCurrent && p.installmentTotal) installmentText = `${p.installmentCurrent} / ${p.installmentTotal}`;
                const tableRow = document.createElement('tr');
                tableRow.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${esc(p.description)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">${formatCurrency(p.amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${installmentText}</td>
                <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onclick="deleteCreditCardPurchase(${p.id})" class="text-red-600 hover:text-red-900 text-sm font-medium">Excluir</button>
                    <button onclick="editCreditCardPurchase(${p.id})" class="text-yellow-600 hover:text-yellow-900 text-sm font-medium">Editar</button>
                </td>`;
                creditCardTableBody.appendChild(tableRow);
                const slideDiv = document.createElement('div');
                slideDiv.className = 'carousel-slide';
                slideDiv.innerHTML = `
                <div class="slide-data-point"><span class="slide-label">Descrição:</span><span class="text-sm font-medium text-gray-900 text-right">${esc(p.description)}</span></div>
                <div class="slide-data-point"><span class="slide-label">Valor:</span><span class="text-sm font-bold text-red-600">${formatCurrency(p.amount)}</span></div>
                <div class="slide-data-point"><span class="slide-label">Parcelas:</span><span class="text-sm text-gray-800">${installmentText}</span></div>
                <div class="mt-4 text-center"><button onclick="deleteCreditCardPurchase(${p.id})" class="text-red-600 hover:text-red-900 text-sm font-medium">Excluir Lançamento</button></div>
                <div class="mt-4 text-center"><button onclick="editCreditCardPurchase(${p.id})" class="text-yellow-600 hover:text-yellow-900 text-sm font-medium">Editar Lançamento</button></div>`;
                ccSlider.appendChild(slideDiv);
            });
            showCreditCardSlide(0);
        }

        function updateSummary() {
            const mes = getMonthTransactions();
            const entradas = sumBy(mes, 'Entrada');
            const saidas = sumBy(mes, 'Saída');
            const saldo = entradas - saidas;
            totalEntradasEl.textContent = formatCurrency(entradas);
            totalSaidasEl.textContent = formatCurrency(saidas);
            saldoFinalEl.textContent = formatCurrency(saldo);
            document.getElementById('saldo-acumulado').textContent = 'Acumulado total: ' + formatCurrency(sumBy(transactions, 'Entrada') - sumBy(transactions, 'Saída'));
            saldoFinalCard.classList.remove('bg-blue-100', 'border-blue-200', 'bg-green-100', 'border-green-200', 'bg-red-100', 'border-red-200');
            saldoFinalEl.classList.remove('text-blue-900', 'text-green-900', 'text-red-900');
            if (saldo > 0) {
                saldoFinalCard.classList.add('bg-green-100', 'border-green-200');
                saldoFinalEl.classList.add('text-green-900');
            } else if (saldo < 0) {
                saldoFinalCard.classList.add('bg-red-100', 'border-red-200');
                saldoFinalEl.classList.add('text-red-900');
            } else {
                saldoFinalCard.classList.add('bg-blue-100', 'border-blue-200');
                saldoFinalEl.classList.add('text-blue-900');
            }
        }

        function updateCreditCardSummary() {
            const totalFatura = creditCardPurchases.reduce((acc, p) => acc + p.amount, 0);
            totalFaturaEl.textContent = formatCurrency(totalFatura);
        }

        function showModal(message, callback) {
            modalMessage.textContent = message;
            onConfirmCallback = callback;
            modalButtons.innerHTML = '';
            if (callback) {
                modalButtons.innerHTML = `
                <button id="modal-confirm-btn" class="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">Sim</button>
                <button id="modal-cancel-btn" class="px-4 py-2 bg-gray-200 text-gray-900 text-base font-medium rounded-md w-24 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">Não</button>
            `;
                document.getElementById('modal-confirm-btn').onclick = () => { if (onConfirmCallback) onConfirmCallback(); hideModal(); };
                document.getElementById('modal-cancel-btn').onclick = hideModal;
            } else {
                modalButtons.innerHTML = `<button id="modal-ok-btn" class="px-4 py-2 bg-indigo-500 text-white text-base font-medium rounded-md w-full hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">OK</button>`;
                document.getElementById('modal-ok-btn').onclick = hideModal;
            }
            modal.classList.remove('hidden');
        }

        function hideModal() {
            modal.classList.add('hidden');
            onConfirmCallback = null;
        }

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
                slideCounter.textContent = '0 / 0';
                prevBtn.disabled = true;
                nextBtn.disabled = true;
                return;
            }
            slideCounter.textContent = `${currentSlide + 1} / ${sourceArray.length}`;
            prevBtn.disabled = currentSlide === 0;
            nextBtn.disabled = currentSlide === sourceArray.length - 1;
        }

        function showCreditCardSlide(index) {
            if (creditCardPurchases.length === 0) return;
            if (index >= creditCardPurchases.length) index = creditCardPurchases.length - 1;
            if (index < 0) index = 0;
            ccSlider.style.transform = `translateX(-${index * 100}%)`;
            ccCurrentSlide = index;
            updateCreditCardNavButtons();
        }

        function updateCreditCardNavButtons() {
            if (creditCardPurchases.length === 0) {
                ccSlideCounter.textContent = '0 / 0';
                ccPrevBtn.disabled = true;
                ccNextBtn.disabled = true;
                return;
            }
            ccSlideCounter.textContent = `${ccCurrentSlide + 1} / ${creditCardPurchases.length}`;
            ccPrevBtn.disabled = ccCurrentSlide === 0;
            ccNextBtn.disabled = ccCurrentSlide === creditCardPurchases.length - 1;
        }

        // PARTE 5: FUNÇÕES UTILITÁRIAS (HELPERS)
        function formatCurrency(value) {
            return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        function formatDate(dateString) {
            if (!dateString) return '';
            if (dateString.includes('-')) {
                const [year, month, day] = dateString.split('-');
                return `${day}/${month}/${year}`;
            }
            return dateString;
        }

        function normalizarCategoria(categoria) {
            const lower = categoria.toLowerCase();
            if (lower.includes("pix") || lower.includes("cartão de débito")) {
                return "Cartão de Débito/Pix";
            }
            return categoria;
        }

        // PARTE 6: FUNÇÃO PRINCIPAL DE ATUALIZAÇÃO
        function updateAll() {
            // ALTERAÇÃO: Garante que a lista ativa esteja sincronizada quando tudo é atualizado
            currentlyDisplayedTransactions = getMonthTransactions();
            renderTransactionViews(currentlyDisplayedTransactions);
            updateSummary();
            renderMonthUI();
            saveTransactionsToStorage();

            renderCreditCardViews();
            updateCreditCardSummary();
            saveCreditCardPurchasesToStorage();
        }

        // PARTE 6B: MÊS SELECIONADO, GRÁFICOS E BACKUP
        const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const CORES = ['#4f46e5', '#f97316', '#10b981', '#ef4444', '#eab308', '#06b6d4', '#8b5cf6', '#64748b'];
        const monthPicker = document.getElementById('month-picker');
        let selectedMonth = monthKey(new Date());
        let chartCategorias = null;
        let chartMeses = null;

        function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
        function monthOf(dateString) {
            if (!dateString) return '';
            if (dateString.includes('/')) { const [, m, y] = dateString.split('/'); return `${y}-${m.padStart(2, '0')}`; }
            return dateString.slice(0, 7);
        }
        function shiftMonth(key, delta) { const [y, m] = key.split('-').map(Number); return monthKey(new Date(y, m - 1 + delta, 1)); }
        function monthLabel(key) { const [y, m] = key.split('-'); return `${MESES[Number(m) - 1]}/${y}`; }
        function getMonthTransactions() { return transactions.filter(t => monthOf(t.date) === selectedMonth); }
        function sumBy(list, type) { return list.filter(t => t.type === type).reduce((acc, t) => acc + t.amount, 0); }
        function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

        function setMonth(key) {
            if (!key) return;
            selectedMonth = key;
            currentSlide = 0;
            updateAll();
            clearFilters();
        }

        function renderMonthUI() {
            monthPicker.value = selectedMonth;
            renderComparison();
            renderCharts();
            renderQuickChips();
            renderBackupInfo();
        }

        function renderComparison() {
            const el = document.getElementById('month-compare');
            const atual = sumBy(getMonthTransactions(), 'Saída');
            const prev = shiftMonth(selectedMonth, -1);
            const anterior = sumBy(transactions.filter(t => monthOf(t.date) === prev), 'Saída');
            if (!anterior) { el.textContent = atual ? 'Sem saídas no mês anterior para comparar.' : ''; return; }
            const pct = Math.round((atual - anterior) / anterior * 100);
            el.textContent = pct === 0
                ? `Suas saídas ficaram iguais às de ${monthLabel(prev)} (${formatCurrency(anterior)}).`
                : `Suas saídas estão ${Math.abs(pct)}% ${pct > 0 ? 'maiores' : 'menores'} que em ${monthLabel(prev)} (${formatCurrency(anterior)}).`;
        }

        function renderCharts() {
            const section = document.getElementById('charts-section');
            if (typeof Chart === 'undefined') { section.classList.add('hidden'); return; }
            const porCategoria = {};
            getMonthTransactions().filter(t => t.type === 'Saída').forEach(t => {
                const c = normalizarCategoria(t.category);
                porCategoria[c] = (porCategoria[c] || 0) + t.amount;
            });
            const cats = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
            document.getElementById('chart-categorias-vazio').classList.toggle('hidden', cats.length > 0);
            if (chartCategorias) chartCategorias.destroy();
            chartCategorias = new Chart(document.getElementById('chart-categorias'), {
                type: 'doughnut',
                data: { labels: cats.map(c => c[0]), datasets: [{ data: cats.map(c => c[1]), backgroundColor: CORES }] },
                options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } } } }
            });

            const keys = [5, 4, 3, 2, 1, 0].map(i => shiftMonth(selectedMonth, -i));
            const porMes = keys.map(k => transactions.filter(t => monthOf(t.date) === k));
            if (chartMeses) chartMeses.destroy();
            chartMeses = new Chart(document.getElementById('chart-meses'), {
                type: 'bar',
                data: {
                    labels: keys.map(k => `${k.slice(5)}/${k.slice(2, 4)}`),
                    datasets: [
                        { label: 'Entradas', data: porMes.map(l => sumBy(l, 'Entrada')), backgroundColor: '#10b981' },
                        { label: 'Saídas', data: porMes.map(l => sumBy(l, 'Saída')), backgroundColor: '#ef4444' }
                    ]
                },
                options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } } } }
            });
        }

        function exportBackup() {
            const data = { app: 'controle-financeiro', versao: 1, exportadoEm: new Date().toISOString(), transactions, creditCardPurchases };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `controle-financeiro-${new Date().toLocaleDateString('sv-SE')}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
            localStorage.setItem('finance-last-backup', String(Date.now()));
            renderBackupInfo();
        }

        function importBackup(file) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    const ok = Array.isArray(data.transactions) && Array.isArray(data.creditCardPurchases)
                        && data.transactions.every(t => t && t.date && typeof t.amount === 'number');
                    if (!ok) throw new Error('formato');
                    showModal(`Importar ${data.transactions.length} lançamentos e ${data.creditCardPurchases.length} compras de cartão? Os dados atuais serão substituídos.`, () => {
                        transactions = data.transactions;
                        creditCardPurchases = data.creditCardPurchases;
                        updateAll();
                        clearFilters();
                    });
                } catch (err) {
                    showModal('Arquivo inválido. Use um backup exportado por este site.', null);
                }
            };
            reader.readAsText(file);
        }

        function renderBackupInfo() {
            const el = document.getElementById('backup-info');
            const last = Number(localStorage.getItem('finance-last-backup')) || 0;
            const dias = last ? Math.floor((Date.now() - last) / 86400000) : null;
            el.textContent = last
                ? `Último backup: ${new Date(last).toLocaleDateString('pt-BR')} ${dias > 0 ? `(há ${dias} dias)` : '(hoje)'}`
                : 'Você ainda não fez nenhum backup.';
            el.className = 'mt-3 text-sm ' + ((dias === null || dias >= 7) ? 'text-amber-700' : 'text-gray-600');
        }

        document.getElementById('month-prev').addEventListener('click', () => setMonth(shiftMonth(selectedMonth, -1)));
        document.getElementById('month-next').addEventListener('click', () => setMonth(shiftMonth(selectedMonth, 1)));
        document.getElementById('month-today').addEventListener('click', () => setMonth(monthKey(new Date())));
        monthPicker.addEventListener('change', () => setMonth(monthPicker.value));
        document.getElementById('export-btn').addEventListener('click', exportBackup);
        document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
        document.getElementById('import-file').addEventListener('change', e => {
            if (e.target.files[0]) importBackup(e.target.files[0]);
            e.target.value = '';
        });
        // Pede ao navegador para não apagar os dados automaticamente quando faltar espaço
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

        // PARTE 6C: LANÇAMENTO RÁPIDO (texto livre)
        const quickInput = document.getElementById('quick-input');
        const quickPreview = document.getElementById('quick-preview');
        const REGRAS_CATEGORIA = [
            ['Uber/99', /\b(uber|99|taxi|corrida)\b/],
            ['Estivas', /\b(mercado|supermercado|feira|atacadao|acougue)\b/],
            ['Gastos Fora de Casa', /\b(restaurante|lanche|almoco|jantar|ifood|pizza|cafe|padaria|sorvete)\b/],
            ['Moradia', /\b(aluguel|luz|energia|agua|internet|condominio|iptu)\b/],
            ['Cartão de Débito/Pix', /\b(pix|debito)\b/]
        ];
        const PALAVRAS_ENTRADA = /\b(salario|recebi|recebimento|freela|rendimento|reembolso|venda)\b/;

        function sa(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
        function isoDate(d) { return d.toLocaleDateString('sv-SE'); }

        function inferirCategoria(desc, type) {
            const key = sa(desc);
            const historico = [...transactions].filter(t => t.type === type).sort((a, b) => b.id - a.id);
            const exata = historico.find(t => sa(t.description) === key);
            if (exata) return normalizarCategoria(exata.category);
            const primeira = key.split(' ')[0];
            if (primeira.length >= 3) {
                const parecida = historico.find(t => sa(t.description).split(' ')[0] === primeira);
                if (parecida) return normalizarCategoria(parecida.category);
            }
            if (type === 'Entrada') return /salario/.test(key) ? 'Salário' : 'Outros';
            const regra = REGRAS_CATEGORIA.find(([, re]) => re.test(key));
            return regra ? regra[0] : 'Outros';
        }

        function parseQuick(text) {
            if (!text.trim()) return null;
            const plus = /^\s*\+/.test(text);
            let s = ' ' + text.trim().replace(/^\+/, ' ') + ' ';
            let date = new Date();
            const dm = s.match(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s/);
            const rel = s.match(/\s(hoje|ontem|anteontem)\s/i);
            if (dm) {
                const y = dm[3] ? (dm[3].length === 2 ? 2000 + Number(dm[3]) : Number(dm[3])) : date.getFullYear();
                const d = new Date(y, Number(dm[2]) - 1, Number(dm[1]));
                if (d.getMonth() !== Number(dm[2]) - 1) return { erro: 'Data inválida. Use dia/mês, como 15/10.' };
                date = d;
                s = s.replace(dm[0], ' ');
            } else if (rel) {
                date.setDate(date.getDate() - { hoje: 0, ontem: 1, anteontem: 2 }[rel[1].toLowerCase()]);
                s = s.replace(rel[0], ' ');
            }
            const nums = [...s.matchAll(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g)];
            if (!nums.length) return { erro: 'Falta o valor. Exemplo: uber 23,50' };
            const n = nums[nums.length - 1];
            const raw = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(n[1]) ? n[1].replace(/\./g, '').replace(',', '.') : n[1].replace(',', '.');
            const amount = parseFloat(raw);
            if (!(amount > 0)) return { erro: 'O valor precisa ser maior que zero.' };
            s = (s.slice(0, n.index) + ' ' + s.slice(n.index + n[0].length)).replace(/r\$/ig, ' ').replace(/\s+/g, ' ').trim();
            if (!s) return { erro: 'Falta a descrição. Exemplo: uber 23,50' };
            const description = s.charAt(0).toUpperCase() + s.slice(1);
            const anterior = [...transactions].sort((a, b) => b.id - a.id).find(t => sa(t.description) === sa(description));
            const type = plus ? 'Entrada' : (anterior ? anterior.type : (PALAVRAS_ENTRADA.test(sa(description)) ? 'Entrada' : 'Saída'));
            return { date: isoDate(date), description, amount, type, category: inferirCategoria(description, type) };
        }

        function dataAmigavel(iso) { return iso === isoDate(new Date()) ? 'hoje' : formatDate(iso); }
        function resumoQuick(r) { return `${r.type} de ${formatCurrency(r.amount)} em ${r.category}, ${dataAmigavel(r.date)}`; }

        function previewQuick() {
            const r = parseQuick(quickInput.value);
            quickPreview.className = 'text-sm mt-2 min-h-[1.25rem] ' + (r && r.erro ? 'text-amber-700' : 'text-gray-600');
            quickPreview.textContent = !r ? '' : (r.erro ? r.erro : `"${r.description}": ${resumoQuick(r)}`);
        }

        function submitQuick() {
            const r = parseQuick(quickInput.value);
            if (!r || r.erro) { showModal(r ? r.erro : 'Digite algo como: uber 23,50', null); return; }
            transactions.push({ id: Date.now(), date: r.date, description: r.description, category: r.category, type: r.type, amount: r.amount });
            selectedMonth = monthOf(r.date);
            updateAll();
            quickInput.value = '';
            quickPreview.className = 'text-sm mt-2 min-h-[1.25rem] text-green-700';
            quickPreview.textContent = `Lançado: "${r.description}", ${resumoQuick(r)}.`;
            quickInput.focus();
        }

        function renderQuickChips() {
            const box = document.getElementById('quick-chips');
            box.innerHTML = '';
            const usos = {};
            [...transactions].sort((a, b) => b.id - a.id).slice(0, 200).forEach(t => {
                const k = sa(t.description);
                if (!usos[k]) usos[k] = { ultimo: t, n: 0 };
                usos[k].n++;
            });
            Object.values(usos).sort((a, b) => b.n - a.n || b.ultimo.id - a.ultimo.id).slice(0, 6).forEach(({ ultimo: t }) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'text-sm bg-gray-100 hover:bg-indigo-100 text-gray-800 rounded-full px-3 py-1';
                b.textContent = t.description;
                b.title = 'Repetir o último valor (' + formatCurrency(t.amount) + ')';
                b.addEventListener('click', () => {
                    quickInput.value = `${t.description} ${t.amount.toFixed(2).replace('.', ',')}`;
                    quickInput.focus();
                    quickInput.setSelectionRange(t.description.length + 1, quickInput.value.length);
                    previewQuick();
                });
                box.appendChild(b);
            });
        }

        quickInput.addEventListener('input', previewQuick);
        quickInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitQuick(); } });
        document.getElementById('quick-btn').addEventListener('click', submitQuick);

        // PARTE 7: INICIALIZAÇÃO E EVENT LISTENERS
        document.getElementById('date').valueAsDate = new Date();
        transactionForm.addEventListener('submit', addTransaction);
        creditCardForm.addEventListener('submit', addCreditCardPurchase);

        filterBtn.addEventListener('click', applyFilters);
        clearFilterBtn.addEventListener('click', clearFilters);

        // ALTERAÇÃO: Os botões agora passam a lista ativa para a função showSlide
        prevBtn.addEventListener('click', () => showSlide(currentSlide - 1, currentlyDisplayedTransactions));
        nextBtn.addEventListener('click', () => showSlide(currentSlide + 1, currentlyDisplayedTransactions));

        ccPrevBtn.addEventListener('click', () => showCreditCardSlide(ccCurrentSlide - 1));
        ccNextBtn.addEventListener('click', () => showCreditCardSlide(ccCurrentSlide + 1));

        updateAll();