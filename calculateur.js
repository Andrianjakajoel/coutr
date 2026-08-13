function calculerPrixRevient() {
  const temps = parseFloat(document.getElementById('modelTemps').value) || 0;
  const metrage = parseFloat(document.getElementById('tissuMetrage').value) || 0;
  const prixMetre = parseFloat(document.getElementById('tissuPrixMetre').value) || 0;
  const fournitures = parseFloat(document.getElementById('fournituresPrix').value) || 0;
  const margePourcent = parseFloat(document.getElementById('margePourcent').value) || 0;

  // Récupération du coût minute calculé dans script.js
  const totalGlobalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);
  const coutMinute = CAPACITE_MINUTES_MOIS > 0 ? (totalGlobalDepenses / CAPACITE_MINUTES_MOIS) : 0;

  const coutTissu = metrage * prixMetre;
  const coutAtelier = temps * coutMinute;
  const coutRevientTotal = coutTissu + fournitures + coutAtelier;

  const benefice = coutRevientTotal * (margePourcent / 100);
  const prixVenteConseille = coutRevientTotal + benefice;

  // Affichage dans l'interface
  document.getElementById('resTissu').innerText = formaterAriary(coutTissu);
  document.getElementById('resFournitures').innerText = formaterAriary(fournitures);
  document.getElementById('resAtelier').innerText = formaterAriary(coutAtelier);
  document.getElementById('resPrixRevient').innerText = formaterAriary(coutRevientTotal);
  document.getElementById('resBenefice').innerText = formaterAriary(benefice);
  document.getElementById('resPrixVente').innerText = formaterAriary(prixVenteConseille);

  return {
    coutRevientTotal: coutRevientTotal,
    prixVenteConseille: prixVenteConseille
  };
}

function ajouterALaListeCoutures() {
  const ref = document.getElementById('modelRef').value.trim();
  const nom = document.getElementById('modelNom').value.trim();
  const temps = parseFloat(document.getElementById('modelTemps').value) || 0;
  const metrage = parseFloat(document.getElementById('tissuMetrage').value) || 0;

  if (!ref || !nom) {
    alert("Veuillez remplir au moins la référence et le nom du vêtement.");
    return;
  }

  const resultats = calculerPrixRevient();

  listeCoutures.push({
    ref: ref,
    nom: nom,
    temps: temps,
    metrage: metrage,
    prixRevient: resultats.coutRevientTotal,
    prixVente: resultats.prixVenteConseille
  });

  // Sauvegarde automatique
  if (typeof sauvegarderDonnees === 'function') {
    sauvegarderDonnees();
  }

  // Réinitialisation des champs
  document.getElementById('modelRef').value = '';
  document.getElementById('modelNom').value = '';
  document.getElementById('modelTemps').value = '';
  document.getElementById('tissuMetrage').value = '';
  document.getElementById('tissuPrixMetre').value = '';
  document.getElementById('fournituresPrix').value = '';

  calculerPrixRevient();
  afficherListeCoutures();
  naviguer('coutures');
}