const STORAGE_KEY = 'texstock_data';

// Données par défaut si le localStorage est vide
const defaultStock = [
  { code: 'TIS-COT-01', name: 'Coton Blanc 180g', category: 'Tissu', qty: 120, alert: 20, unit: 'Mètres', location: 'Etagère A1' },
  { code: 'TIS-LIN-02', name: 'Lin Bleu Marine', category: 'Tissu', qty: 12, alert: 15, unit: 'Mètres', location: 'Etagère A2' },
  { code: 'BTN-BOIS-15', name: 'Bouton Bois 15mm', category: 'Mercerie', qty: 450, alert: 100, unit: 'Pièces', location: 'Tiroir B' },
  { code: 'FIL-ROUGE-01', name: 'Bobine Fil Rouge', category: 'Fil', qty: 3, alert: 5, unit: 'Bobines', location: 'Tiroir C' }
];

let stock = [];

// Charger depuis le localStorage ou initialiser
function loadStock() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      stock = JSON.parse(saved);
    } catch (e) {
      console.error("Erreur de lecture du localStorage, chargement des données par défaut.", e);
      stock = [...defaultStock];
      saveStock();
    }
  } else {
    stock = [...defaultStock];
    saveStock();
  }
}

// Sauvegarder dans le localStorage
function saveStock() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
}

document.addEventListener('DOMContentLoaded', () => {
  loadStock();
  renderTables();
});

// Soumission du formulaire d'entrée
function submitStock(e) {
  e.preventDefault();

  const code = document.getElementById('code').value.toUpperCase().trim();
  const name = document.getElementById('name').value.trim();
  const category = document.getElementById('category').value;
  const unit = document.getElementById('unit').value;
  const qty = parseFloat(document.getElementById('qty').value);
  const alertVal = parseFloat(document.getElementById('alert').value);
  const location = document.getElementById('location').value.trim() || 'A-00';

  const item = stock.find(i => i.code === code);
  if (item) {
    item.qty += qty;
    item.name = name;
    item.category = category;
    item.unit = unit;
    item.alert = alertVal;
    item.location = location;
  } else {
    stock.push({ code, name, category, qty, alert: alertVal, unit, location });
  }

  saveStock();
  document.getElementById('add-form').reset();
  renderTables();
}

// Action de déduction rapide de stock (Sortie Coupe)
function deduceStock(code) {
  const item = stock.find(i => i.code === code);
  if (item) {
    const amount = prompt(`Métrage/Quantité à retirer pour ${item.name} (${item.unit}) :`);
    if (amount !== null && !isNaN(amount) && amount.trim() !== '') {
      const val = parseFloat(amount);
      if (val > 0) {
        item.qty = Math.max(0, item.qty - val);
        saveStock();
        renderTables();
      }
    }
  }
}

// Affichage et mise à jour des données
function renderTables() {
  const searchInput = document.getElementById('search');
  const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  const listTbody = document.getElementById('list-tbody');
  const remainTbody = document.getElementById('remain-tbody');
  
  if (!listTbody || !remainTbody) return;

  listTbody.innerHTML = '';
  remainTbody.innerHTML = '';

  let alertCount = 0;

  stock.forEach(item => {
    // Calcul des alertes globales
    if (item.qty <= item.alert) {
      alertCount++;
    }

    // Calcul du badge d'état pour le tableau
    let statusBadge = '<span class="badge ok">Suffisant</span>';
    if (item.qty <= 0) {
      statusBadge = '<span class="badge danger">Rupture</span>';
    } else if (item.qty <= item.alert) {
      statusBadge = '<span class="badge warning">Faible</span>';
    }

    // Filtrage par recherche
    if (item.name.toLowerCase().includes(searchVal) || item.code.toLowerCase().includes(searchVal)) {
      // Tableau 1 : Liste & Emplacement
      listTbody.innerHTML += `
        <tr>
          <td><strong>${item.code}</strong></td>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>${item.location}</td>
        </tr>
      `;

      // Tableau 2 : Reste & Actions
      remainTbody.innerHTML += `
        <tr>
          <td>${item.name}</td>
          <td><strong>${item.qty} ${item.unit}</strong></td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn-out" onclick="deduceStock('${item.code}')" title="Retirer du stock">
              <i class="fa-solid fa-minus"></i>
            </button>
          </td>
        </tr>
      `;
    }
  });

  // Mise à jour des statistiques de l'en-tête
  const totalArticlesEl = document.getElementById('total-articles');
  const totalAlertsEl = document.getElementById('total-alerts');

  if (totalArticlesEl) totalArticlesEl.textContent = stock.length;
  if (totalAlertsEl) totalAlertsEl.textContent = alertCount;
} 