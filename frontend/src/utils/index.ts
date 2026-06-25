// Formater un montant en FCFA
export const formatMontant = (montant: number | string): string => {
  const n = typeof montant === 'string' ? parseFloat(montant) : montant;
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
};

// Formater une date
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

// Formater date + heure
export const formatDateHeure = (date: string | Date): string => {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// Couleur statut vente
export const statutVenteCouleur = (statut: string) => ({
  CONFIRMEE: 'bg-green-100 text-green-800',
  ANNULEE:   'bg-red-100 text-red-800',
}[statut] || 'bg-gray-100 text-gray-800');

// Couleur statut devis
export const statutDevisCouleur = (statut: string) => ({
  EN_ATTENTE: 'bg-yellow-100 text-yellow-800',
  ACCEPTE:    'bg-blue-100 text-blue-800',
  CONVERTI:   'bg-green-100 text-green-800',
  REFUSE:     'bg-red-100 text-red-800',
  EXPIRE:     'bg-gray-100 text-gray-800',
}[statut] || 'bg-gray-100 text-gray-800');

// Couleur statut crédit
export const statutCreditCouleur = (statut: string) => ({
  EN_COURS:  'bg-yellow-100 text-yellow-800',
  SOLDE:     'bg-green-100 text-green-800',
  EN_RETARD: 'bg-red-100 text-red-800',
}[statut] || 'bg-gray-100 text-gray-800');

// Libellé mode de paiement
export const labelModePaiement = (mode: string) => ({
  ESPECES:      'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  CREDIT:       'Crédit',
  MIXTE:        'Mixte',
}[mode] || mode);

// Libellé type client
export const labelTypeClient = (type: string) => ({
  PARTICULIER:   'Particulier',
  PROFESSIONNEL: 'Professionnel',
}[type] || type);

// Vérifier si une date d'échéance est proche (< 2 jours)
export const echeanceProche = (date: string): boolean => {
  const diff = new Date(date).getTime() - Date.now();
  return diff >= 0 && diff <= 2 * 24 * 3600 * 1000;
};

// Vérifier si une date est passée
export const estExpire = (date: string): boolean => {
  return new Date(date).getTime() < Date.now();
};
