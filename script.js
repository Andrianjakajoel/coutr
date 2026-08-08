let depenses = [];
let listeCoutures = [];

const CAPACITE_MINUTES_MOIS = 36000; // 4 couturiers x 9000 min

function naviguer(pageId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));

  document.getElementById(`page-${pageId}`).classList.add('active');

  const activeBtn = Array.from(document.querySelectorAll('.menu-item')).find(btn => btn.getAttribute('onclick').includes(pageId));
  if (activeBtn) activeBtn.classList.add('active');
}

function formaterAriary(montant) {
  return Math.round(montant).toLocaleString('fr-FR') + " Ar";
}

function ajouterDepense() {
  const nomInput = document.getElementById('depenseNom');
  const categorieInput = document.getElementById('depenseCategorie');
  const montantInput = document.getElementById('depenseMontant');

  const nom = nomInput.value.trim();
  const categorie = categorieInput.value;
  const montant = parseFloat(montantInput.value);

  if (!nom || isNaN(montant) || montant <= 0) {
    alert("Veuillez saisir un nom valide et un montant supérieur à 0.");
    return;
  }

  const maintenant = new Date();
  const dateStr = maintenant.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const heureStr = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  depenses.push({
    nom: nom,
    categorie: categorie,
    montant: montant,
    date: `${dateStr} à ${heureStr}`
  });

  nomInput.value = '';
  montantInput.value = '';

  mettreAJourInterface();
}

function supprimerDepense(index) {
  depenses.splice(index, 1);
  mettreAJourInterface();
}

function afficherListeDepenses() {
  const container = document.getElementById('listeDepenses');
  container.innerHTML = '';

  if (depenses.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Aucune dépense enregistrée (0 Ar).</p>';
    return;
  }

  depenses.forEach((depense, index) => {
    const item = document.createElement('div');
    item.className = 'expense-item';
    item.innerHTML = `
      <span><strong>${depense.nom}</strong></span>
      <span class="expense-badge">${depense.categorie}</span>
      <span class="expense-date">🕒 ${depense.date}</span>
      <span style="text-align: right; font-weight: bold;">${formaterAriary(depense.montant)}</span>
      <button class="btn btn-danger" onclick="supprimerDepense(${index})">✕</button>
    `;
    container.appendChild(item);
  });
}

function afficherListeCoutures() {
  const container = document.getElementById('listeCoutures');
  if (!container) return;
  container.innerHTML = '';

  if (listeCoutures.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: span 3;">Aucun vêtement enregistré pour le moment.</p>';
    return;
  }

  listeCoutures.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'couture-card';
    card.innerHTML = `
      <div>
        <div class="couture-card-header">
          <span class="couture-ref">${item.ref}</span>
          <button class="btn btn-danger" onclick="supprimerCouture(${index})">✕</button>
        </div>
        <h3 style="margin-top: 10px;">${item.nom}</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px;">
          ⏱️ Temps : ${item.temps} min | 🧵 Tissu : ${item.metrage}m
        </p>
      </div>
      <div>
        <div class="calc-row" style="font-size: 0.8rem; margin-top: 10px;">
          <span>Coût de revient :</span>
          <strong>${formaterAriary(item.prixRevient)}</strong>
        </div>
        <div class="couture-price-tag">
          ${formaterAriary(item.prixVente)}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function supprimerCouture(index) {
  listeCoutures.splice(index, 1);
  afficherListeCoutures();
}

function calculerEtAfficherTotaux() {
  const totalGlobal = depenses.reduce((sum, d) => sum + d.montant, 0);
  
  document.getElementById('totalGlobal').innerText = formaterAriary(totalGlobal);
  document.getElementById('dashTotalDepenses').innerText = formaterAriary(totalGlobal);

  const coutMinute = CAPACITE_MINUTES_MOIS > 0 ? (totalGlobal / CAPACITE_MINUTES_MOIS) : 0;
  document.getElementById('dashCoutMinute').innerText = coutMinute.toFixed(1) + " Ar/min";

  const totauxParCategorie = {};
  depenses.forEach(d => {
    if (!totauxParCategorie[d.categorie]) {
      totauxParCategorie[d.categorie] = 0;
    }
    totauxParCategorie[d.categorie] += d.montant;
  });

  const containerCat = document.getElementById('repartitionCategories');
  containerCat.innerHTML = '';

  const categories = Object.keys(totauxParCategorie);
  if (categories.length === 0) {
    containerCat.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem; text-align: center;">Aucune catégorie enregistrée (0 Ar).</p>';
    return;
  }

  categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'cat-row';
    row.innerHTML = `
      <span>${cat}</span>
      <strong>${formaterAriary(totauxParCategorie[cat])}</strong>
    `;
    containerCat.appendChild(row);
  });
}

function mettreAJourInterface() {
  afficherListeDepenses();
  afficherListeCoutures();
  calculerEtAfficherTotaux();
  if (typeof calculerPrixRevient === 'function') {
    calculerPrixRevient();
  }
}

// Initialisation
mettreAJourInterface();