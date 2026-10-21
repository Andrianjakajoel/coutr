// DONNÉES ET ÉTAT INITIAL (Stockage en localStorage)
let expenses = JSON.parse(localStorage.getItem('couture_expenses')) || [];
let fixedCosts = JSON.parse(localStorage.getItem('couture_fixedCosts')) || [];
let coutures = JSON.parse(localStorage.getItem('couture_projects')) || [];
let calendar = null;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCalendar();
    renderAll();
    
    // Définir la date du jour par défaut dans les champs de saisie date
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('expDate')) document.getElementById('expDate').value = today;
    if(document.getElementById('coutureDeadline')) document.getElementById('coutureDeadline').value = today;
});

// 1. NAVIGATION ENTRE LES PAGES
function initNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.page-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');
            
            menuItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const activeSection = document.getElementById(targetPage);
            if (activeSection) {
                activeSection.classList.add('active');
            }

            // Si on ouvre la page Calendrier, on rafraîchit la taille du calendrier
            if (targetPage === 'calendar-page' && calendar) {
                setTimeout(() => calendar.render(), 100);
            }
        });
    });
}

function navigateTo(pageId) {
    const menuItem = document.querySelector(`.menu-item[data-page="${pageId}"]`);
    if (menuItem) menuItem.click();
}

// 2. GESTION DU CALENDRIER (FullCalendar)
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'fr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        buttonText: {
            today: "Aujourd'hui",
            month: 'Mois',
            week: 'Semaine'
        },
        events: getCalendarEvents()
    });
    calendar.render();
}

function getCalendarEvents() {
    return coutures.map(c => ({
        title: `${c.client} - ${c.item} (${formatAr(c.prixVente)})`,
        start: c.deadline,
        color: '#8b5cf6',
        allDay: true
    }));
}

function updateCalendarEvents() {
    if (!calendar) return;
    calendar.removeAllEvents();
    calendar.addEventSource(getCalendarEvents());
}

// 3. LOGIQUE METIER & CALCULS

// Calcul du coût de la minute d'atelier (Basé sur 4 couturiers = 36 000 min / mois)
function calculateMinuteCost() {
    const totalFixed = fixedCosts.reduce((sum, item) => sum + Number(item.amount), 0);
    const TOTAL_MINUTES_PER_MONTH = 36000; // 4 couturiers * 9000 min
    return totalFixed > 0 ? (totalFixed / TOTAL_MINUTES_PER_MONTH) : 0;
}

// Calcul direct de la couture en cours de création
function liveCalculateCouture() {
    const fabricCost = Number(document.getElementById('coutureFabric').value) || 0;
    const mercerieCost = Number(document.getElementById('coutureMercerie').value) || 0;
    const timeMinutes = Number(document.getElementById('coutureTime').value) || 0;
    const marginPercent = Number(document.getElementById('coutureMargin').value) || 0;

    const minuteCost = calculateMinuteCost();
    const laborCost = timeMinutes * minuteCost;
    const totalCost = fabricCost + mercerieCost + laborCost;
    const marginAmount = totalCost * (marginPercent / 100);
    const suggestedPrice = totalCost + marginAmount;

    // Mise à jour de l'affichage du calcul
    document.getElementById('calcRawCost').textContent = formatAr(fabricCost + mercerieCost);
    document.getElementById('calcLaborCost').textContent = formatAr(laborCost);
    document.getElementById('calcTotalCost').textContent = formatAr(totalCost);
    document.getElementById('calcSuggestedPrice').textContent = formatAr(suggestedPrice);
}

// 4. GESTION DES DÉPENSES
function addExpense() {
    const title = document.getElementById('expTitle').value.trim();
    const amount = Number(document.getElementById('expAmount').value);
    const category = document.getElementById('expCategory').value;
    const date = document.getElementById('expDate').value;

    if (!title || !amount || !date) {
        alert("Veuillez remplir tous les champs de la dépense.");
        return;
    }

    const expense = { id: Date.now(), title, amount, category, date };
    expenses.push(expense);

    // Si c'est une charge fixe, l'ajouter également aux frais de structure
    if (category === 'Fixe') {
        fixedCosts.push({ id: expense.id, name: title, amount: amount });
        saveFixedCosts();
    }

    saveExpenses();
    renderExpensesList();
    renderDashboard();

    // Reset du formulaire
    document.getElementById('expTitle').value = '';
    document.getElementById('expAmount').value = '';
}

function deleteExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    fixedCosts = fixedCosts.filter(f => f.id !== id);
    
    saveExpenses();
    saveFixedCosts();
    renderExpensesList();
    renderDashboard();
}

function renderExpensesList() {
    const listEl = document.getElementById('expensesList');
    if (!listEl) return;

    listEl.innerHTML = '';
    
    // Tri du plus récent au plus ancien
    const sortedExpenses = [...expenses].sort((a,b) => new Date(b.date) - new Date(a.date));

    sortedExpenses.forEach(exp => {
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.innerHTML = `
            <span><strong>${escapeHtml(exp.title)}</strong></span>
            <span class="expense-badge">${escapeHtml(exp.category)}</span>
            <span class="expense-date">${exp.date}</span>
            <span style="font-weight:bold; color:var(--text-primary); text-align:right;">${formatAr(exp.amount)}</span>
            <button class="btn btn-danger" onclick="deleteExpense(${exp.id})" title="Supprimer">✕</button>
        `;
        listEl.appendChild(item);
    });

    // Mettre à jour le résumé des catégories à chaque rafraîchissement
    renderCategorySummary();
}

function renderCategorySummary() {
    const summaryEl = document.getElementById('repartitionCategories');
    if (!summaryEl) return;

    if (expenses.length === 0) {
        summaryEl.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem; text-align: center; padding: 10px;">Aucune dépense enregistrée.</p>';
        return;
    }

    // Regroupement par catégorie
    const totalsByCategory = expenses.reduce((acc, exp) => {
        const cat = exp.category || 'Autre';
        acc[cat] = (acc[cat] || 0) + Number(exp.amount);
        return acc;
    }, {});

    summaryEl.innerHTML = '';
    Object.keys(totalsByCategory).forEach(cat => {
        const row = document.createElement('div');
        row.className = 'cat-row';
        row.innerHTML = `
            <span>${escapeHtml(cat)}</span>
            <strong>${formatAr(totalsByCategory[cat])}</strong>
        `;
        summaryEl.appendChild(row);
    });
}

// 5. GESTION DES CHARGES FIXES (Pour le calcul du coût minute)
function addFixedCost() {
    const name = document.getElementById('fixedName').value.trim();
    const amount = Number(document.getElementById('fixedAmount').value);

    if (!name || !amount) {
        alert("Veuillez saisir le nom et le montant du frais fixe.");
        return;
    }

    fixedCosts.push({ id: Date.now(), name, amount });
    saveFixedCosts();
    renderFixedCostsList();
    liveCalculateCouture();

    document.getElementById('fixedName').value = '';
    document.getElementById('fixedAmount').value = '';
}

function deleteFixedCost(id) {
    fixedCosts = fixedCosts.filter(f => f.id !== id);
    saveFixedCosts();
    renderFixedCostsList();
    liveCalculateCouture();
}

function renderFixedCostsList() {
    const listEl = document.getElementById('fixedCostsList');
    if (!listEl) return;

    listEl.innerHTML = '';
    let total = 0;

    fixedCosts.forEach(f => {
        total += Number(f.amount);
        const item = document.createElement('div');
        item.className = 'cat-row';
        item.style.marginBottom = '5px';
        item.innerHTML = `
            <span>${escapeHtml(f.name)}</span>
            <div>
                <strong style="margin-right:10px;">${formatAr(f.amount)}</strong>
                <button class="btn btn-danger" style="padding:2px 6px;" onclick="deleteFixedCost(${f.id})">✕</button>
            </div>
        `;
        listEl.appendChild(item);
    });

    document.getElementById('totalFixedCosts').textContent = formatAr(total);
    document.getElementById('costPerMinute').textContent = formatAr(calculateMinuteCost(), 2);
}

// 6. GESTION DES COMMANDES / PROJETS DE COUTURE
function saveCoutureProject() {
    const client = document.getElementById('coutureClient').value.trim();
    const item = document.getElementById('coutureItem').value.trim();
    const deadline = document.getElementById('coutureDeadline').value;
    const fabricCost = Number(document.getElementById('coutureFabric').value) || 0;
    const mercerieCost = Number(document.getElementById('coutureMercerie').value) || 0;
    const timeMinutes = Number(document.getElementById('coutureTime').value) || 0;
    const marginPercent = Number(document.getElementById('coutureMargin').value) || 0;

    if (!client || !item || !deadline) {
        alert("Veuillez remplir le nom du client, le vêtement et la date de livraison.");
        return;
    }

    const minuteCost = calculateMinuteCost();
    const laborCost = timeMinutes * minuteCost;
    const totalCost = fabricCost + mercerieCost + laborCost;
    const marginAmount = totalCost * (marginPercent / 100);
    const prixVente = totalCost + marginAmount;

    const couture = {
        id: Date.now(),
        ref: 'CT-' + Math.floor(1000 + Math.random() * 9000),
        client,
        item,
        deadline,
        fabricCost,
        mercerieCost,
        timeMinutes,
        totalCost,
        prixVente,
        benefice: marginAmount,
        createdAt: new Date().toISOString()
    };

    coutures.push(couture);
    saveCoutures();
    renderCoutureGrid();
    renderDashboard();
    updateCalendarEvents();

    alert("Commande enregistrée avec succès !");

    // Reinitialisation
    document.getElementById('coutureClient').value = '';
    document.getElementById('coutureItem').value = '';
    document.getElementById('coutureFabric').value = '';
    document.getElementById('coutureMercerie').value = '';
    document.getElementById('coutureTime').value = '';
    liveCalculateCouture();
}

function deleteCouture(id) {
    if (confirm("Voulez-vous vraiment supprimer ce projet ?")) {
        coutures = coutures.filter(c => c.id !== id);
        saveCoutures();
        renderCoutureGrid();
        renderDashboard();
        updateCalendarEvents();
    }
}

function renderCoutureGrid() {
    const gridEl = document.getElementById('coutureGrid');
    if (!gridEl) return;

    gridEl.innerHTML = '';

    if (coutures.length === 0) {
        gridEl.innerHTML = '<p style="color:var(--text-secondary); grid-column:span 2;">Aucune couture enregistrée pour le moment.</p>';
        return;
    }

    const sortedCoutures = [...coutures].sort((a,b) => new Date(a.deadline) - new Date(b.deadline));

    sortedCoutures.forEach(c => {
        const card = document.createElement('div');
        card.className = 'couture-card';
        card.innerHTML = `
            <div>
                <div class="couture-card-header">
                    <span class="couture-ref">${escapeHtml(c.ref)}</span>
                    <span style="font-size:0.8rem; color:var(--text-secondary);">📅 ${c.deadline}</span>
                </div>
                <h3 style="margin: 10px 0 5px 0; font-size:1.1rem; color:var(--text-primary);">${escapeHtml(c.item)}</h3>
                <p style="font-size:0.85rem; color:var(--accent-purple);">Client: <strong>${escapeHtml(c.client)}</strong></p>
                
                <div style="margin-top:12px; font-size:0.8rem; color:var(--text-secondary); display:flex; flex-direction:column; gap:4px;">
                    <div>Temps de travail : <strong>${c.timeMinutes} min</strong></div>
                    <div>Coût de revient : <strong>${formatAr(c.totalCost)}</strong></div>
                    <div>Bénéfice estimé : <strong style="color:var(--accent-green);">${formatAr(c.benefice)}</strong></div>
                </div>
            </div>
            
            <div>
                <div class="couture-price-tag">${formatAr(c.prixVente)}</div>
                <button class="btn btn-danger" style="width:100%; margin-top:10px;" onclick="deleteCouture(${c.id})">Supprimer</button>
            </div>
        `;
        gridEl.appendChild(card);
    });
}

// 7. TABLEAU DE BORD
function renderDashboard() {
    const totalCA = coutures.reduce((sum, c) => sum + c.prixVente, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalBeneficeNet = coutures.reduce((sum, c) => sum + c.benefice, 0);

    const caEl = document.getElementById('dashCA');
    const expEl = document.getElementById('dashExpenses');
    const benEl = document.getElementById('dashBenefice');
    const countEl = document.getElementById('dashCount');

    if (caEl) caEl.textContent = formatAr(totalCA);
    if (expEl) expEl.textContent = formatAr(totalExpenses);
    if (benEl) benEl.textContent = formatAr(totalBeneficeNet);
    if (countEl) countEl.textContent = coutures.length;
}

// 8. FONCTIONS UTILITAIRES & PERSISTANCE (localStorage)
function saveExpenses() {
    localStorage.setItem('couture_expenses', JSON.stringify(expenses));
}

function saveFixedCosts() {
    localStorage.setItem('couture_fixedCosts', JSON.stringify(fixedCosts));
}

function saveCoutures() {
    localStorage.setItem('couture_projects', JSON.stringify(coutures));
}

function renderAll() {
    renderExpensesList();
    renderFixedCostsList();
    renderCoutureGrid();
    renderDashboard();
    liveCalculateCouture();
}

function formatAr(amount, decimals = 0) {
    return new Intl.NumberFormat('fr-MG', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(amount) + ' Ar';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// 9. EXPORT & IMPORT DE DONNÉES JSON
function exportData() {
    const data = {
        expenses,
        fixedCosts,
        coutures,
        exportedAt: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `atelier_couture_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.expenses && imported.fixedCosts && imported.coutures) {
                expenses = imported.expenses;
                fixedCosts = imported.fixedCosts;
                coutures = imported.coutures;

                saveExpenses();
                saveFixedCosts();
                saveCoutures();

                renderAll();
                updateCalendarEvents();

                alert("Données importées avec succès !");
            } else {
                alert("Format du fichier JSON invalide.");
            }
        } catch (err) {
            alert("Erreur lors de la lecture du fichier JSON.");
        }
    };
    reader.readAsText(file);
}