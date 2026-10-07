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

            const filteredTransactions = transactions.filter(transaction => {
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
            currentlyDisplayedTransactions = transactions;
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
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${t.description}</td>
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
                <div class="slide-data-point"><span class="slide-label">Descrição:</span><span class="text-sm font-medium text-gray-900">${t.description}</span></div>
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
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.description}</td>
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
                <div class="slide-data-point"><span class="slide-label">Descrição:</span><span class="text-sm font-medium text-gray-900 text-right">${p.description}</span></div>
                <div class="slide-data-point"><span class="slide-label">Valor:</span><span class="text-sm font-bold text-red-600">${formatCurrency(p.amount)}</span></div>
                <div class="slide-data-point"><span class="slide-label">Parcelas:</span><span class="text-sm text-gray-800">${installmentText}</span></div>
                <div class="mt-4 text-center"><button onclick="deleteCreditCardPurchase(${p.id})" class="text-red-600 hover:text-red-900 text-sm font-medium">Excluir Lançamento</button></div>
                <div class="mt-4 text-center"><button onclick="editCreditCardPurchase(${p.id})" class="text-yellow-600 hover:text-yellow-900 text-sm font-medium">Editar Lançamento</button></div>`;
                ccSlider.appendChild(slideDiv);
            });
            showCreditCardSlide(0);
        }

        function updateSummary() {
            const entradas = transactions.filter(t => t.type === 'Entrada').reduce((acc, t) => acc + t.amount, 0);
            const saidas = transactions.filter(t => t.type === 'Saída').reduce((acc, t) => acc + t.amount, 0);
            const saldo = entradas - saidas;
            totalEntradasEl.textContent = formatCurrency(entradas);
            totalSaidasEl.textContent = formatCurrency(saidas);
            saldoFinalEl.textContent = formatCurrency(saldo);
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
            currentlyDisplayedTransactions = transactions;
            renderTransactionViews(currentlyDisplayedTransactions);
            updateSummary();
            saveTransactionsToStorage();

            renderCreditCardViews();
            updateCreditCardSummary();
            saveCreditCardPurchasesToStorage();
        }

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