// ==========================================
// 1. CONFIGURATION & STATE INITIAL
// ==========================================

const CAPACITE_MINUTES_MOIS = 36000; // 4 couturiers x 9000 min

const subCategories = {
  "Tissus - Maille & Jersey": [
    "Polo / T-shirt", "Jersey coton", "Jersey coton/polyester", 
    "Piqué coton", "Piqué polyester", "Bord-côte"
  ],
  "Tissus - Vêtements de travail": [
    "Gabardine", "Sergé", "Coton", "Polyester/coton", 
    "Tissus haute résistance", "Tissus fluorescents"
  ],
  "Fournitures & Mercerie": [
    "Fils", "Fermetures éclair", "Boutons", "Pressions", 
    "Velcro", "Élastiques", "Cordons", "Œillets", "Entoilage"
  ],
  "Étiquettes & Emballage": [
    "Étiquettes marque", "Étiquettes de taille", 
    "Étiquettes de composition", "Sac d'emballage"
  ],
  "Salaires & Main d'œuvre": [
    "Salaire Couturier 1", "Salaire Couturier 2", "Salaire Couturier 3", "Salaire Couturier 4", "Prime de production"
  ],
  "Local & Charges (Loyer, Eau, Elec)": [
    "Loyer Atelier", "Électricité (JIRAMA)", "Eau", "Abonnement Internet / Téléphone"
  ],
  "Entretien & Équipements": [
    "Entretien Piqueuse", "Entretien Surjeteuse", "Achat Aiguilles / Pièces", "Huile Machine"
  ],
  "Divers & Marketing": [
    "Transport / Livraison", "Publicité Facebook / Réseaux", "Frais divers"
  ]
};

let depenses = chargerDonnees('depenses');
let listeCoutures = chargerDonnees('listeCoutures');
let commandes = chargerDonnees('commandes');

document.addEventListener('DOMContentLoaded', () => {
  mettreAJourInterface();
});

// ==========================================
// 2. UTILITAIRES & PERSISTANCE
// ==========================================

function chargerDonnees(cle) {
  try {
    const raw = localStorage.getItem(cle);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error(`Erreur lors du chargement de ${cle}:`, e);
    return [];
  }
}

function sauvegarderDonnees() {
  localStorage.setItem('depenses', JSON.stringify(depenses));
  localStorage.setItem('listeCoutures', JSON.stringify(listeCoutures));
  localStorage.setItem('commandes', JSON.stringify(commandes));
}

function formaterAriary(montant) {
  const valeur = Number(montant) || 0;
  return Math.round(valeur).toLocaleString('fr-FR') + " Ar";
}

function naviguer(pageId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));

  const ciblePage = document.getElementById(`page-${pageId}`);
  if (ciblePage) ciblePage.classList.add('active');

  const activeBtn = Array.from(document.querySelectorAll('.menu-item')).find(btn => {
    const attr = btn.getAttribute('onclick');
    return attr && attr.includes(pageId);
  });
  if (activeBtn) activeBtn.classList.add('active');

  if (pageId === 'planning' && typeof initialiserCalendrier === 'function') {
    setTimeout(() => {
      initialiserCalendrier();
    }, 100);
  }
}

function reinitialiserDonnees() {
  if (confirm("Êtes-vous sûr de vouloir réinitialiser toutes les données ?")) {
    localStorage.clear();
    depenses = [];
    listeCoutures = [];
    commandes = [];
    mettreAJourInterface();
  }
}

function mettreAJourInterface() {
  const totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);
  const coutMinute = CAPACITE_MINUTES_MOIS > 0 ? (totalDepenses / CAPACITE_MINUTES_MOIS) : 0;

  const dashTotal = document.getElementById('dashTotalDepenses');
  const dashCout = document.getElementById('dashCoutMinute');
  const totalGlobal = document.getElementById('totalGlobal');

  if (dashTotal) dashTotal.innerText = formaterAriary(totalDepenses);
  if (dashCout) dashCout.innerText = formaterAriary(coutMinute) + "/min";
  if (totalGlobal) totalGlobal.innerText = formaterAriary(totalDepenses);

  afficherListeDepenses();
  afficherListeCoutures();
  afficherListeCommandes();
}

// ==========================================
// 3. EXPORT / IMPORT DATA (JSON)
// ==========================================

function exporterDonneesJSON() {
  const donneesCompletes = {
    depenses,
    listeCoutures,
    commandes,
    dateExportation: new Date().toISOString()
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(donneesCompletes, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);

  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `donnees_atelier_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importerDonneesJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);

      if (Array.isArray(data.depenses) && Array.isArray(data.listeCoutures) && Array.isArray(data.commandes)) {
        depenses = data.depenses;
        listeCoutures = data.listeCoutures;
        commandes = data.commandes;

        sauvegarderDonnees();
        mettreAJourInterface();
        alert("Les données ont été restaurées avec succès !");
      } else {
        alert("Le fichier sélectionné ne contient pas une structure de données valide.");
      }
    } catch (err) {
      alert("Erreur lors de la lecture du fichier JSON.");
    }
  };

  reader.readAsText(file);
}

// ==========================================
// 4. GESTION DES DÉPENSES
// ==========================================

function updateSubCategories() {
  const mainCatSelect = document.getElementById('depenseCategorie');
  const subCatSelect = document.getElementById('depenseSousCategorie');
  if (!mainCatSelect || !subCatSelect) return;

  const mainCat = mainCatSelect.value;
  subCatSelect.innerHTML = '<option value="">-- Sélectionner l\'article --</option>';

  if (mainCat && subCategories[mainCat]) {
    subCategories[mainCat].forEach(item => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      subCatSelect.appendChild(option);
    });
  }
}

function ajouterDepense() {
  const categorieInput = document.getElementById('depenseCategorie');
  const sousCategorieInput = document.getElementById('depenseSousCategorie');
  const montantInput = document.getElementById('depenseMontant');
  const noteInput = document.getElementById('depenseNote');

  const categorie = categorieInput ? categorieInput.value : '';
  const article = sousCategorieInput ? sousCategorieInput.value : '';
  const montant = parseFloat(montantInput ? montantInput.value : 0);
  const note = noteInput ? noteInput.value.trim() : '';

  if (!categorie || isNaN(montant) || montant <= 0) {
    alert("Veuillez choisir une catégorie et saisir un montant valide.");
    return;
  }

  const nomAffiche = article ? `${article} ${note ? '(' + note + ')' : ''}` : (note || categorie);
  const maintenant = new Date();
  const dateStr = maintenant.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const heureStr = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  depenses.push({
    nom: nomAffiche,
    categorie: categorie,
    montant: montant,
    date: `${dateStr} à ${heureStr}`
  });

  sauvegarderDonnees();

  if (categorieInput) categorieInput.value = '';
  if (sousCategorieInput) sousCategorieInput.value = '';
  if (montantInput) montantInput.value = '';
  if (noteInput) noteInput.value = '';

  mettreAJourInterface();
}

function supprimerDepense(index) {
  depenses.splice(index, 1);
  sauvegarderDonnees();
  mettreAJourInterface();
}

function afficherListeDepenses() {
  const container = document.getElementById('listeDepenses');
  if (!container) return;
  container.innerHTML = '';

  if (depenses.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Aucune dépense enregistrée (0 Ar).</p>';
    return;
  }

  const depensesParCategorie = depenses.reduce((acc, depense, index) => {
    const cat = depense.categorie || 'Autres';
    if (!acc[cat]) {
      acc[cat] = { articles: [], total: 0 };
    }
    acc[cat].articles.push({ ...depense, originalIndex: index });
    acc[cat].total += depense.montant || 0;
    return acc;
  }, {});

  Object.keys(depensesParCategorie).forEach(cat => {
    const groupe = depensesParCategorie[cat];

    const catContainer = document.createElement('div');
    catContainer.className = 'category-group';
    catContainer.style.marginBottom = '20px';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.style.cssText = `
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 10px 14px; 
      background-color: #f0f4f8; 
      color: #1f2937;
      border-radius: 6px; 
      font-weight: bold; 
      margin-bottom: 8px;
    `;
    header.innerHTML = `
      <span>📂 ${cat} (${groupe.articles.length})</span>
      <span style="color: var(--accent-color, #1f2937);">Somme : ${formaterAriary(groupe.total)}</span>
    `;
    catContainer.appendChild(header);

    groupe.articles.forEach(item => {
      const el = document.createElement('div');
      el.className = 'expense-item';
      el.style.cssText = `
        display: grid; 
        grid-template-columns: 2fr 1.5fr 1fr auto; 
        gap: 10px; 
        align-items: center; 
        padding: 8px 12px; 
        border-bottom: 1px solid var(--border-color, #e5e7eb);
      `;
      el.innerHTML = `
        <span><strong>${item.nom}</strong></span>
        <span class="expense-date" style="font-size: 0.85rem; color: gray;">🕒 ${item.date}</span>
        <span style="text-align: right; font-weight: 600;">${formaterAriary(item.montant)}</span>
        <button class="btn btn-danger" style="padding: 2px 6px;" onclick="supprimerDepense(${item.originalIndex})">✕</button>
      `;
      catContainer.appendChild(el);
    });

    container.appendChild(catContainer);
  });
}

// ==========================================
// 5. GESTION DES COUTURES / MODÈLES
// ==========================================

function afficherListeCoutures() {
  const containerTable = document.getElementById('listeCouturesTable');

  if (containerTable) {
    containerTable.innerHTML = '';

    if (listeCoutures.length === 0) {
      containerTable.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Aucun modèle enregistré.</td></tr>';
      return;
    }

    listeCoutures.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.ref || 'REF-' + (index + 1)}</strong></td>
        <td>${item.nom}</td>
        <td>⏱️ ${item.temps || 0} min</td>
        <td>🧵 ${item.metrage || 0} m</td>
        <td>${formaterAriary(item.prixRevient || 0)}</td>
        <td>
          <input type="number" 
                 value="${item.prixVente || 0}" 
                 style="width: 110px; padding: 4px; font-weight: bold;" 
                 onchange="modifierPrixVente(${index}, this.value)" />
        </td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button class="btn btn-add" style="padding: 4px 8px; font-size: 0.8rem;" onclick="commanderModele(${index})">
              ➕ Commander
            </button>
            <button class="btn btn-danger" style="padding: 4px 8px;" onclick="supprimerCouture(${index})">✕</button>
          </div>
        </td>
      `;
      containerTable.appendChild(tr);
    });
  }
}

function modifierPrixVente(index, nouveauPrix) {
  const prix = parseFloat(nouveauPrix);
  if (isNaN(prix) || prix < 0) {
    alert("Veuillez saisir un prix valide.");
    afficherListeCoutures();
    return;
  }
  listeCoutures[index].prixVente = prix;
  sauvegarderDonnees();
  afficherListeCoutures();
}

function commanderModele(index) {
  const item = listeCoutures[index];
  if (!item) return;

  const client = prompt(`Nom du client pour la commande de "${item.nom}" :`);
  if (!client || !client.trim()) return;

  const quantiteStr = prompt(`Quantité souhaitée pour "${item.nom}" :`, "1");
  const quantite = parseInt(quantiteStr, 10);
  if (isNaN(quantite) || quantite <= 0) {
    alert("Quantité invalide.");
    return;
  }

  const dateLivraison = prompt("Date de livraison prévue (AAAA-MM-JJ) :", new Date().toISOString().slice(0, 10));

  const total = (item.prixVente || 0) * quantite;
  const acompteStr = prompt(`Acompte versé (en Ar) [Prix Total: ${formaterAriary(total)}] :`, "0");
  const acompte = parseFloat(acompteStr) || 0;

  commandes.push({
    client: client.trim(),
    modele: `${quantite}x ${item.nom} (${item.ref || 'Modèle'})`,
    total: total,
    acompte: acompte,
    reste: total - acompte,
    dateLivraison: dateLivraison || new Date().toISOString().slice(0, 10),
    date: new Date().toLocaleDateString('fr-FR')
  });

  sauvegarderDonnees();
  mettreAJourInterface();

  alert("Commande ajoutée avec succès !");
  naviguer('commandes');
}

function supprimerCouture(index) {
  listeCoutures.splice(index, 1);
  sauvegarderDonnees();
  afficherListeCoutures();
}

// ==========================================
// 6. GESTION DES COMMANDES CLIENTS
// ==========================================

function enregistrerCommandeManuelle() {
  const clientInput = document.getElementById('cmdClient');
  const modeleInput = document.getElementById('cmdModele');
  const totalInput = document.getElementById('cmdTotal');
  const acompteInput = document.getElementById('cmdAcompte');
  const dateInput = document.getElementById('cmdDateLivraison');

  const client = clientInput ? clientInput.value.trim() : '';
  const modele = modeleInput ? modeleInput.value.trim() : '';
  const total = parseFloat(totalInput ? totalInput.value : 0) || 0;
  const acompte = parseFloat(acompteInput ? acompteInput.value : 0) || 0;
  const dateLivraison = dateInput ? dateInput.value : new Date().toISOString().slice(0, 10);

  if (!client || !modele || total <= 0) {
    alert("Veuillez saisir un client, un modèle et un montant total valide.");
    return;
  }

  commandes.push({
    client: client,
    modele: modele,
    total: total,
    acompte: acompte,
    reste: total - acompte,
    dateLivraison: dateLivraison,
    date: new Date().toLocaleDateString('fr-FR')
  });

  sauvegarderDonnees();

  clientInput.value = '';
  modeleInput.value = '';
  totalInput.value = '';
  acompteInput.value = '';
  if (dateInput) dateInput.value = '';

  mettreAJourInterface();
  alert("Commande enregistrée !");
}

function supprimerCommande(index) {
  commandes.splice(index, 1);
  sauvegarderDonnees();
  mettreAJourInterface();
}

function afficherListeCommandes() {
  const container = document.getElementById('listeCommandes');
  if (!container) return;
  container.innerHTML = '';

  if (commandes.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Aucune commande en cours.</p>';
    return;
  }

  commandes.forEach((cmd, index) => {
    const card = document.createElement('div');
    card.className = 'expense-item';
    card.style.cssText = `
      display: grid; 
      grid-template-columns: 1.5fr 2fr 1fr 1fr 1fr auto; 
      gap: 10px; 
      align-items: center; 
      padding: 10px; 
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    `;
    card.innerHTML = `
      <span><strong>👤 ${cmd.client}</strong></span>
      <span>🧵 ${cmd.modele}</span>
      <span>Total: ${formaterAriary(cmd.total)}</span>
      <span style="color: ${cmd.reste > 0 ? '#e67e22' : '#27ae60'};">Reste: ${formaterAriary(cmd.reste)}</span>
      <span style="font-size: 0.85rem; color: gray;">📅 ${cmd.dateLivraison || 'Non définie'}</span>
      <button class="btn btn-danger" style="padding: 2px 6px;" onclick="supprimerCommande(${index})">✕</button>
    `;
    container.appendChild(card);
  });
}