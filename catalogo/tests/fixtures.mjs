// Menú de ejemplo (basado en el folleto del domingo) para las pruebas.
export const MENU = {
  sections: [
    { id: 's1', title: 'Sancocho de gallina', note: '(Para todos nuestros platos)', price: 25000, includes: ['Sancocho'],
      items: [
        { id: 'i1', name: 'Gallina guisada', desc: 'arroz, ensalada, maduro y jugo', parts: ['Arroz', 'Ensalada', 'Maduro', 'Jugo'], art: 'gallina' },
        { id: 'i2', name: 'Bondiola a la plancha', desc: 'papa salada', parts: ['Papa salada'], art: 'bondiola' },
      ] },
    { id: 's2', title: 'Limonadas', price: null, includes: [],
      items: [
        { id: 'i1', name: 'Limonada natural', price: 8000, art: 'limonada' },
        { id: 'i2', name: 'Limonada especial', price: 11000, choices: ['Coco', 'Cereza', 'Hierbabuena'], choiceLabel: 'Sabor', art: 'limonada_coco' },
      ] },
  ],
};
