// ==========================================
// ETAT GLOBAL DE L'APPLICATION
// ==========================================
let state = {
    expenses: JSON.parse(localStorage.getItem('my_expenses')) || [],
    events: JSON.parse(localStorage.getItem('my_events')) || []
  };
  
  let calendarInstance = null;
  
  // ==========================================
  // INITIALISATION
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    // Définir la date d'aujourd'hui par défaut dans les formulaires
    const today = new Date().toISOString().split('T')[0];
    const expDateInput = document.getElementById('exp-date');
    if (expDateInput) expDateInput.value = today;
  
    renderDashboard();
    renderExpenses();
    initCalendar();
  });
  
  // Navigation entre les pages
  function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
  
    const activeSection = document.getElementById(pageId);
    if (activeSection) activeSection.classList.add('active');
  
    const activeBtn = Array.from(document.querySelectorAll('.menu-item')).find(btn => 
      btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(pageId)
    );
    if (activeBtn) activeBtn.classList.add('active');
  
    // Redimensionner le calendrier si la vue change
    if (pageId === 'calendar' && calendarInstance) {
      setTimeout(() => calendarInstance.updateSize(), 50);
    }
  }
  
  // Formatage Monétaire (Ariary)
  function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', maximumFractionDigits: 0 }).format(amount);
  }
  
  // ==========================================
  // COMPOSANT MODALE PERSONNALISÉ (SANS PROMPT/ALERT)
  // ==========================================
  function openModal({ title, bodyHtml, buttons = [] }) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
  
    const footer = document.getElementById('modal-footer');
    footer.innerHTML = '';
  
    buttons.forEach(btn => {
      const buttonEl = document.createElement('button');
      buttonEl.className = `btn ${btn.class || 'btn-secondary'}`;
      buttonEl.textContent = btn.label;
      buttonEl.onclick = () => {
        if (btn.onClick) btn.onClick();
        if (btn.closeOnClick !== false) closeModal();
      };
      footer.appendChild(buttonEl);
    });
  
    document.getElementById('custom-modal').classList.add('active');
  }
  
  function closeModal() {
    document.getElementById('custom-modal').classList.remove('active');
  }
  
  function showAlert(title, message) {
    openModal({
      title: title,
      bodyHtml: `<p style="color: var(--text-primary); font-size: 0.95rem;">${message}</p>`,
      buttons: [{ label: 'Fermer', class: 'btn-secondary' }]
    });
  }
  
  function showConfirm(title, message, onConfirm) {
    openModal({
      title: title,
      bodyHtml: `<p style="color: var(--text-primary); font-size: 0.95rem;">${message}</p>`,
      buttons: [
        { label: 'Annuler', class: 'btn-secondary' },
        { label: 'Confirmer', class: 'btn-danger', onClick: onConfirm }
      ]
    });
  }
  
  // ==========================================
  // GESTION DES DÉPENSES
  // ==========================================
  function addExpense(e) {
    e.preventDefault();
    const title = document.getElementById('exp-title').value.trim();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const category = document.getElementById('exp-category').value;
    const date = document.getElementById('exp-date').value;
  
    if (!title || isNaN(amount) || amount <= 0 || !date) {
      showAlert('Erreur', 'Veuillez remplir correctement tous les champs.');
      return;
    }
  
    const newExpense = {
      id: Date.now(),
      title,
      amount,
      category,
      date
    };
  
    state.expenses.push(newExpense);
    saveData();
    
    // Réinitialiser le formulaire
    document.getElementById('expense-form').reset();
    document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
  
    renderExpenses();
    renderDashboard();
    
    // Événement miroir dans le calendrier
    syncExpenseToCalendar(newExpense);
  }
  
  function deleteExpense(id) {
    showConfirm('Confirmation', 'Voulez-vous vraiment supprimer cette dépense ?', () => {
      state.expenses = state.expenses.filter(item => item.id !== id);
      
      // Supprimer également l'événement miroir du calendrier
      state.events = state.events.filter(item => item.id !== `exp-${id}`);
      
      saveData();
      renderExpenses();
      renderDashboard();
      if (calendarInstance) calendarInstance.refetchEvents();
    });
  }
  
  function renderExpenses() {
    const container = document.getElementById('expense-list');
    if (!container) return;
  
    container.innerHTML = '';
  
    if (state.expenses.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Aucune dépense enregistrée.</p>';
      return;
    }
  
    // Trier par date décroissante
    const sorted = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  
    sorted.forEach(exp => {
      const item = document.createElement('div');
      item.className = 'expense-item';
      item.innerHTML = `
        <span style="font-weight: 600;">${exp.title}</span>
        <span class="expense-badge">${exp.category}</span>
        <span style="font-weight: bold; color: var(--accent-red);">${formatCurrency(exp.amount)}</span>
        <span class="expense-date">${exp.date}</span>
        <button class="btn btn-danger" onclick="deleteExpense(${exp.id})" title="Supprimer">
          <i class="fa-solid fa-trash"></i>
        </button>
      `;
      container.appendChild(item);
    });
  }
  
  function syncExpenseToCalendar(expense) {
    const calEvent = {
      id: `exp-${expense.id}`,
      title: `💸 ${expense.title} (${formatCurrency(expense.amount)})`,
      start: expense.date,
      color: '#ef4444',
      extendedProps: { type: 'expense', amount: expense.amount, category: expense.category }
    };
    
    state.events = state.events.filter(e => e.id !== calEvent.id);
    state.events.push(calEvent);
    saveData();
    
    if (calendarInstance) {
      calendarInstance.addEvent(calEvent);
    }
  }
  
  // ==========================================
  // GESTION DU CALENDRIER
  // ==========================================
  function initCalendar() {
    const calendarEl = document.getElementById('calendar-widget');
    if (!calendarEl) return;
  
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
      locale: 'fr',
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek'
      },
      events: getFormattedCalendarEvents(),
      eventClick: function(info) {
        showEventDetails(info.event);
      }
    });
  
    calendarInstance.render();
  }
  
  function getFormattedCalendarEvents() {
    return state.events.map(evt => ({
      id: evt.id,
      title: evt.title,
      start: evt.start,
      end: evt.end || null,
      backgroundColor: evt.color || '#3b82f6',
      borderColor: 'transparent',
      extendedProps: evt.extendedProps || {}
    }));
  }
  
  function addEvent(e) {
    e.preventDefault();
    const title = document.getElementById('evt-title').value.trim();
    const start = document.getElementById('evt-start').value;
    const end = document.getElementById('evt-end').value;
  
    if (!title || !start) {
      showAlert('Erreur', 'Veuillez saisir au moins un titre et une date de début.');
      return;
    }
  
    const newEvent = {
      id: `evt-${Date.now()}`,
      title: title,
      start: start,
      end: end || null,
      color: '#8b5cf6',
      extendedProps: { type: 'custom' }
    };
  
    state.events.push(newEvent);
    saveData();
  
    if (calendarInstance) {
      calendarInstance.addEvent(newEvent);
    }
  
    document.getElementById('event-form').reset();
    showAlert('Succès', 'Événement ajouté au calendrier.');
    renderDashboard();
  }
  
  function showEventDetails(event) {
    const isExpense = event.extendedProps && event.extendedProps.type === 'expense';
    
    let bodyHtml = `
      <div class="modal-detail-row">
        <span class="modal-detail-label">Titre :</span>
        <span class="modal-detail-value">${event.title}</span>
      </div>
      <div class="modal-detail-row">
        <span class="modal-detail-label">Début :</span>
        <span class="modal-detail-value">${event.start ? event.start.toLocaleString('fr-FR') : 'N/A'}</span>
      </div>
    `;
  
    if (event.end) {
      bodyHtml += `
        <div class="modal-detail-row">
          <span class="modal-detail-label">Fin :</span>
          <span class="modal-detail-value">${event.end.toLocaleString('fr-FR')}</span>
        </div>
      `;
    }
  
    openModal({
      title: isExpense ? 'Détails de la Dépense' : 'Détails de l\'événement',
      bodyHtml: bodyHtml,
      buttons: [
        {
          label: 'Supprimer',
          class: 'btn-danger',
          onClick: () => {
            event.remove();
            state.events = state.events.filter(e => e.id !== event.id);
            
            // Si c'est une dépense, la retirer également des dépenses globales
            if (isExpense) {
              const rawId = parseInt(event.id.replace('exp-', ''));
              state.expenses = state.expenses.filter(e => e.id !== rawId);
              renderExpenses();
            }
            
            saveData();
            renderDashboard();
          }
        },
        { label: 'Fermer', class: 'btn-secondary' }
      ]
    });
  }
  
  // ==========================================
  // DASHBOARD & APERÇU DATA
  // ==========================================
  function renderDashboard() {
    // 1. Mise à jour des KPI
    const total = state.expenses.reduce((sum, item) => sum + item.amount, 0);
    const kpiTotal = document.getElementById('kpi-total');
    const kpiCount = document.getElementById('kpi-count');
  
    if (kpiTotal) kpiTotal.textContent = formatCurrency(total);
    if (kpiCount) kpiCount.textContent = state.expenses.length;
  
    // 2. Répartition par Catégorie
    const categoryContainer = document.getElementById('category-summary');
    if (categoryContainer) {
      categoryContainer.innerHTML = '';
      
      if (state.expenses.length === 0) {
        categoryContainer.innerHTML = '<p style="color: var(--text-secondary);">Aucune donnée disponible.</p>';
      } else {
        const categories = {};
        state.expenses.forEach(exp => {
          categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
        });
  
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Total (Ar)</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(categories).map(([cat, val]) => {
              const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return `
                <tr>
                  <td>${cat}</td>
                  <td style="font-weight: 600;">${formatCurrency(val)}</td>
                  <td>${percentage}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        `;
        categoryContainer.appendChild(table);
      }
    }
  
    // 3. Prochains Événements
    const eventsContainer = document.getElementById('upcoming-events');
    if (eventsContainer) {
      eventsContainer.innerHTML = '';
      const now = new Date();
      
      const upcoming = state.events
        .filter(e => new Date(e.start) >= now)
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .slice(0, 5);
  
      if (upcoming.length === 0) {
        eventsContainer.innerHTML = '<p style="color: var(--text-secondary);">Aucun événement à venir.</p>';
      } else {
        upcoming.forEach(evt => {
          const item = document.createElement('div');
          item.style.cssText = 'padding: 8px 12px; background: var(--input-bg); margin-bottom: 8px; border-radius: 6px; border: 1px solid var(--card-border); font-size: 0.85rem; display: flex; justify-content: space-between;';
          item.innerHTML = `
            <span>${evt.title}</span>
            <span style="color: var(--text-secondary);">${new Date(evt.start).toLocaleDateString('fr-FR')}</span>
          `;
          eventsContainer.appendChild(item);
        });
      }
    }
  }
  
  // ==========================================
  // SAUVEGARDE & IMPORT/EXPORT JSON
  // ==========================================
  function saveData() {
    localStorage.setItem('my_expenses', JSON.stringify(state.expenses));
    localStorage.setItem('my_events', JSON.stringify(state.events));
  }
  
  function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mymanager_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
  
  function importData(event) {
    const fileReader = new FileReader();
    fileReader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.expenses && importedData.events) {
          state.expenses = importedData.expenses;
          state.events = importedData.events;
          saveData();
          renderExpenses();
          renderDashboard();
          if (calendarInstance) {
            calendarInstance.removeAllEvents();
            calendarInstance.addEventSource(getFormattedCalendarEvents());
          }
          showAlert('Succès', 'Données importées avec succès !');
        } else {
          showAlert('Erreur', 'Format de fichier JSON non valide.');
        }
      } catch (err) {
        showAlert('Erreur', 'Échec de la lecture du fichier JSON.');
      }
    };
    if (event.target.files[0]) {
      fileReader.readAsText(event.target.files[0]);
    }
  }