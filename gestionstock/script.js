// Key de stockage dans le LocalStorage
const STORAGE_KEY = 'couture_gestion_stock';

// Structure de données initiale si aucun stock n'est enregistré
const initialStock = [
  { id: 1, nom: 'Tissu Coton Blanc', categorie: 'Tissu', quantite: 15, unite: 'mètres', prix: 12000 },
  { id: 2, nom: 'Fil Noir Haute Résistance', categorie: 'Mercerie', quantite: 8, unite: 'bobines', prix: 2500 },
  { id: 3, nom: 'Fermeture Éclair 20cm', categorie: 'Accessoire', quantite: 25, unite: 'pièces', prix: 1000 }
];

// Variable globale contenant la liste des articles
let stockList = [];

// ==========================================
// 1. GESTION DU LOCALSTORAGE (Sauvegarde/Chargement)
// ==========================================

/**
 * Charge les données depuis le localStorage ou initialise si vide
 */
function chargerStock() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      stockList = JSON.parse(data);
    } catch (e) {
      console.error("Erreur de lecture du stock:", e);
      stockList = [...initialStock];
      sauvegarderStock();
    }
  } else {
    // Premier démarrage : charger les données de démo et sauvegarder
    stockList = [...initialStock];
    sauvegarderStock();
  }
}

/**
 * Enregistre l'état actuel de `stockList` dans le localStorage
 */
function sauvegarderStock() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stockList));
}

// ==========================================
// 2. FONCTIONS DE GESTION DU STOCK (CRUD)
// ==========================================

/**
 * Ajoute un nouvel article et sauvegarde
 */
function ajouterArticle(nom, categorie, quantite, unite, prix) {
  const nouveauProduit = {
    id: Date.now(), // Identifiant unique basé sur la date
    nom: nom.trim(),
    categorie: categorie.trim(),
    quantite: Number(quantite),
    unite: unite.trim(),
    prix: Number(prix)
  };

  stockList.push(nouveauProduit);
  sauvegarderStock();
  afficherStock();
}

/**
 * Supprime un article selon son ID et sauvegarde
 */
function supprimerArticle(id) {
  stockList = stockList.filter(article => article.id !== id);
  sauvegarderStock();
  afficherStock();
}

/**
 * Modifie la quantité d'un article (+1 ou -1) et sauvegarde
 */
function ajusterQuantite(id, variation) {
  const article = stockList.find(a => a.id === id);
  if (article) {
    article.quantite = Math.max(0, article.quantite + variation); // Empêche les quantités négatives
    sauvegarderStock();
    afficherStock();
  }
}

// ==========================================
// 3. AFFICHAGE ET INTERFACE UTILISATEUR (DOM)
// ==========================================

/**
 * Rendu dynamique de la table ou de la liste dans l'interface
 */
function afficherStock() {
  const tableBody = document.getElementById('stockTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  if (stockList.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Aucun article dans le stock.</td></tr>`;
    return;
  }

  stockList.forEach(article => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${article.nom}</td>
      <td>${article.categorie}</td>
      <td>
        <button onclick="ajusterQuantite(${article.id}, -1)">-</button>
        <strong>${article.quantite}</strong> ${article.unite}
        <button onclick="ajusterQuantite(${article.id}, 1)">+</button>
      </td>
      <td>${article.prix.toLocaleString()} Ar</td>
      <td>${(article.quantite * article.prix).toLocaleString()} Ar</td>
      <td>
        <button class="btn-danger" onclick="supprimerArticle(${article.id})">Supprimer</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// ==========================================
// 4. INITIALISATION ET ÉVÉNEMENTS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Charger les données au démarrage
  chargerStock();
  afficherStock();

  // 2. Gestion de la soumission du formulaire d'ajout
  const formAjout = document.getElementById('formAjoutStock');
  if (formAjout) {
    formAjout.addEventListener('submit', (e) => {
      e.preventDefault();

      const nom = document.getElementById('nomArticle').value;
      const categorie = document.getElementById('catArticle').value;
      const quantite = document.getElementById('quantiteArticle').value;
      const unite = document.getElementById('uniteArticle').value || 'pcs';
      const prix = document.getElementById('prixArticle').value || 0;

      if (nom && quantite) {
        ajouterArticle(nom, categorie, quantite, unite, prix);
        formAjout.reset(); // Réinitialiser les champs du formulaire
      }
    });
  }
});