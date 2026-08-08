/**
 * Fichier dédié au calcul des coûts de revient et la sauvegarde dans la liste des coutures
 */

function calculerPrixRevient() {
    const tempsMinutes = parseFloat(document.getElementById('modelTemps').value) || 0;
    const tissuMetrage = parseFloat(document.getElementById('tissuMetrage').value) || 0;
    const tissuPrixMetre = parseFloat(document.getElementById('tissuPrixMetre').value) || 0;
    const fournituresPrix = parseFloat(document.getElementById('fournituresPrix').value) || 0;
    const margePourcent = parseFloat(document.getElementById('margePourcent').value) || 0;
  
    const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);
    const coutMinuteAtelier = CAPACITE_MINUTES_MOIS > 0 ? (totalDepenses / CAPACITE_MINUTES_MOIS) : 0;
  
    const coutTissu = tissuMetrage * tissuPrixMetre;
    const coutMainOeuvre = tempsMinutes * coutMinuteAtelier;
    const coutRevientTotal = coutTissu + fournituresPrix + coutMainOeuvre;
  
    const benefice = coutRevientTotal * (margePourcent / 100);
    const prixVenteConseille = coutRevientTotal + benefice;
  
    document.getElementById('resTissu').innerText = formaterAriary(coutTissu);
    document.getElementById('resFournitures').innerText = formaterAriary(fournituresPrix);
    document.getElementById('resAtelier').innerText = formaterAriary(coutMainOeuvre);
    document.getElementById('resPrixRevient').innerText = formaterAriary(coutRevientTotal);
    document.getElementById('resBenefice').innerText = formaterAriary(benefice);
    document.getElementById('resPrixVente').innerText = formaterAriary(prixVenteConseille);
  
    // Retourne les valeurs pour la sauvegarde
    return {
      coutRevientTotal,
      prixVenteConseille
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
  
    // Réinitialisation des champs du formulaire
    document.getElementById('modelRef').value = '';
    document.getElementById('modelNom').value = '';
    document.getElementById('modelTemps').value = '';
    document.getElementById('tissuMetrage').value = '';
    document.getElementById('tissuPrixMetre').value = '';
    document.getElementById('fournituresPrix').value = '';
  
    calculerPrixRevient();
    afficherListeCoutures();
  
    // Redirection automatique vers la liste des coutures
    naviguer('coutures');
  }