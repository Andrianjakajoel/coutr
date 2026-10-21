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
let calendar = null; 

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

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

  if (pageId === 'planning') {
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

  afficherTableauSynthetiqueCategories();
  afficherListeCoutures();
  afficherListeCommandes();
  mettreAJourEvenementsCalendrier();
  calculerPrixRevientLive(); 
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

  const nomAffiche = article ? `${article} ${note ? '(' + note + ')' : ''}` : (note || 'Dépense diverse');
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

function afficherTableauSynthetiqueCategories() {
  const headContainer = document.getElementById('categoryMatrixHead');
  const bodyContainer = document.getElementById('categoryMatrixBody');
  if (!headContainer || !bodyContainer) return;

  headContainer.innerHTML = '';
  bodyContainer.innerHTML = '';

  const categories = Object.keys(subCategories);

  const trHead = document.createElement('tr');
  categories.forEach(cat => {
    const totalCat = depenses
      .filter(d => d.categorie === cat)
      .reduce((sum, d) => sum + (d.montant || 0), 0);

    const th = document.createElement('th');
    th.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 4px; color: var(--text-primary);">${escapeHtml(cat)}</div>
      <div style="font-size: 0.78rem; color: var(--accent-purple); font-weight: 600;">Total: ${formaterAriary(totalCat)}</div>
    `;
    trHead.appendChild(th);
  });
  headContainer.appendChild(trHead);

  const trBody = document.createElement('tr');
  categories.forEach(cat => {
    const td = document.createElement('td');
    
    const depensesCat = depenses
      .map((d, index) => ({ ...d, originalIndex: index }))
      .filter(d => d.categorie === cat);

    const pileDiv = document.createElement('div');
    pileDiv.className = 'expense-cell-pile';

    if (depensesCat.length === 0) {
      pileDiv.innerHTML = `<div class="empty-category-notice">Aucune dépense</div>`;
    } else {
      depensesCat.reverse().forEach(item => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'expense-cell-card';
        cardDiv.innerHTML = `
          <div class="expense-cell-title">${escapeHtml(item.nom)}</div>
          <div class="expense-cell-meta">
            <span>📂 ${escapeHtml(item.categorie)}</span>
            <span>🕒 ${escapeHtml(item.date)}</span>
          </div>
          <div class="expense-cell-footer">
            <span class="expense-cell-amount">${formaterAriary(item.montant)}</span>
            <button class="btn btn-danger" onclick="supprimerDepense(${item.originalIndex})" title="Supprimer">✕</button>
          </div>
        `;
        pileDiv.appendChild(cardDiv);
      });
    }

    td.appendChild(pileDiv);
    trBody.appendChild(td);
  });
  bodyContainer.appendChild(trBody);
}

// ==========================================
// 5. SCRIPT CALCULATEUR DE PRIX & MODÈLES
// ==========================================

function calculerPrixRevientLive() {
  const totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);
  const coutMinute = CAPACITE_MINUTES_MOIS > 0 ? (totalDepenses / CAPACITE_MINUTES_MOIS) : 0;

  const temps = parseFloat(document.getElementById('coutureTemps')?.value || 0);
  const metrage = parseFloat(document.getElementById('coutureMetrage')?.value || 0);
  const prixMetre = parseFloat(document.getElementById('couturePrixMetre')?.value || 0);
  const mercerie = parseFloat(document.getElementById('coutureMercerie')?.value || 0);
  const margePourcent = parseFloat(document.getElementById('coutureMarge')?.value || 0);

  const coutMainOeuvre = temps * coutMinute;
  const coutTissu = metrage * prixMetre;
  const prixRevient = coutMainOeuvre + coutTissu + mercerie;
  
  const prixVente = margePourcent < 100 ? (prixRevient / (1 - (margePourcent / 100))) : (prixRevient * 2);
  const margeMontant = prixVente - prixRevient;

  const elMainOeuvre = document.getElementById('calcMainOeuvre');
  const elTissu = document.getElementById('calcTissu');
  const elMercerie = document.getElementById('calcMercerie');
  const elPrixRevient = document.getElementById('calcPrixRevient');
  const elPrixVente = document.getElementById('calcPrixVente');
  const elMargeMontant = document.getElementById('calcMargeMontant');

  if (elMainOeuvre) elMainOeuvre.innerText = formaterAriary(coutMainOeuvre);
  if (elTissu) elTissu.innerText = formaterAriary(coutTissu);
  if (elMercerie) elMercerie.innerText = formaterAriary(mercerie);
  if (elPrixRevient) elPrixRevient.innerText = formaterAriary(prixRevient);
  if (elPrixVente) elPrixVente.innerText = formaterAriary(prixVente);
  if (elMargeMontant) elMargeMontant.innerText = formaterAriary(margeMontant);

  return { prixRevient, prixVente };
}

function enregistrerCouture() {
  const refInput = document.getElementById('coutureRef');
  const nomInput = document.getElementById('coutureNom');
  const tempsInput = document.getElementById('coutureTemps');
  const metrageInput = document.getElementById('coutureMetrage');

  const ref = refInput ? refInput.value.trim() : '';
  const nom = nomInput ? nomInput.value.trim() : '';
  const temps = parseFloat(tempsInput ? tempsInput.value : 0) || 0;
  const metrage = parseFloat(metrageInput ? metrageInput.value : 0) || 0;

  if (!nom) {
    alert("Veuillez donner un nom à votre modèle.");
    return;
  }

  const { prixRevient, prixVente } = calculerPrixRevientLive();

  listeCoutures.push({
    ref: ref || `MOD-${listeCoutures.length + 1}`,
    nom: nom,
    temps: temps,
    metrage: metrage,
    prixRevient: Math.round(prixRevient),
    prixVente: Math.round(prixVente)
  });

  sauvegarderDonnees();

  if (refInput) refInput.value = '';
  if (nomInput) nomInput.value = '';
  if (tempsInput) tempsInput.value = '';
  if (metrageInput) metrageInput.value = '';

  calculerPrixRevientLive();
  afficherListeCoutures();
  alert("Modèle enregistré dans le catalogue !");
}

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
        <td><strong>${escapeHtml(item.ref || 'REF-' + (index + 1))}</strong></td>
        <td>${escapeHtml(item.nom)}</td>
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

  if (clientInput) clientInput.value = '';
  if (modeleInput) modeleInput.value = '';
  if (totalInput) totalInput.value = '';
  if (acompteInput) acompteInput.value = '';
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
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Aucune commande en cours.</p>';
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
      border-bottom: 1px solid var(--card-border);
    `;
    card.innerHTML = `
      <span><strong>👤 ${escapeHtml(cmd.client)}</strong></span>
      <span>🧵 ${escapeHtml(cmd.modele)}</span>
      <span>Total: ${formaterAriary(cmd.total)}</span>
      <span style="color: ${cmd.reste > 0 ? '#d97706' : '#059669'};">Reste: ${formaterAriary(cmd.reste)}</span>
      <span style="font-size: 0.85rem; color: var(--text-secondary);">📅 ${escapeHtml(cmd.dateLivraison || 'Non définie')}</span>
      <button class="btn btn-danger" style="padding: 2px 6px;" onclick="supprimerCommande(${index})">✕</button>
    `;
    container.appendChild(card);
  });
}

// ==========================================
// 7. GESTION DU CALENDRIER & LIVRAISONS
// ==========================================

function obtenirEvenementsCalendrier() {
  return commandes
    .filter(cmd => cmd.dateLivraison)
    .map(cmd => ({
      title: `${cmd.client} - ${cmd.modele}`,
      start: cmd.dateLivraison,
      allDay: true,
      backgroundColor: cmd.reste > 0 ? '#d97706' : '#059669',
      borderColor: cmd.reste > 0 ? '#b45309' : '#047857'
    }));
}

function initialiserCalendrier() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  if (calendar) {
    calendar.render();
    afficherProchainesLivraisons();
    return;
  }

  if (typeof FullCalendar !== 'undefined') {
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'fr',
      height: 'auto',
      aspectRatio: 1.35,
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
      events: obtenirEvenementsCalendrier()
    });
    calendar.render();
    afficherProchainesLivraisons();
  }
}

function mettreAJourEvenementsCalendrier() {
  if (!calendar) return;
  calendar.removeAllEvents();
  calendar.addEventSource(obtenirEvenementsCalendrier());
  afficherProchainesLivraisons();
}

function afficherProchainesLivraisons() {
  const listEl = document.getElementById('upcomingDeliveries');
  if (!listEl) return;

  listEl.innerHTML = '';

  if (commandes.length === 0) {
    listEl.innerHTML = '<p style="color:var(--text-secondary); font-size:0.85rem; padding: 10px;">Aucune livraison enregistrée.</p>';
    return;
  }

  const triees = [...commandes].sort((a, b) => new Date(a.dateLivraison || '9999-12-31') - new Date(b.dateLivraison || '9999-12-31'));

  triees.forEach(c => {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px;
      background: var(--input-bg);
      border-left: 4px solid ${c.reste > 0 ? '#d97706' : '#059669'};
      border-radius: 4px;
      margin-bottom: 6px;
      border: 1px solid var(--card-border);
      border-left-width: 4px;
    `;
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
        <strong style="font-size:0.9rem; color:var(--text-primary);">👤 ${escapeHtml(c.client)}</strong>
        <span style="font-size:0.75rem; color:var(--text-secondary);">📅 ${escapeHtml(c.dateLivraison || 'N/A')}</span>
      </div>
      <div style="font-size:0.8rem; color:var(--text-secondary);">
        🧵 ${escapeHtml(c.modele)}
      </div>
      <div style="font-size:0.8rem; font-weight:600; color:${c.reste > 0 ? '#d97706' : '#059669'};">
        ${c.reste > 0 ? 'Reste : ' + formaterAriary(c.reste) : 'Payé en totalité (' + formaterAriary(c.total) + ')'}
      </div>
    `;
    listEl.appendChild(item);
  });
}