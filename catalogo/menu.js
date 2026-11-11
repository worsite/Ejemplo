// DATOS DE EJEMPLO: cambia el nombre, el horario, el número de mesas y los productos.
export const BUSINESS = {
  name: 'Burger Fest',
  tables: 12, // mesas disponibles para elegir al pedir
  currency: 'COP',
  hours: 'Todos los días · 11:00 a.m. – 11:00 p.m.',
  deliveryNote: 'Domicilio en 30–45 min',
};

export const CATEGORIES = [
  { id: 'hamburguesas', label: 'Hamburguesas' },
  { id: 'perros', label: 'Perros y Sándwiches' },
  { id: 'snacks', label: 'Papas y Snacks' },
  { id: 'pizza', label: 'Pizza' },
  { id: 'bebidas', label: 'Bebidas y Postres' },
];

export const PRODUCTS = [
  { id: 'burger-clasica', category: 'hamburguesas', name: 'Clásica', desc: 'Carne de res 150 g, queso cheddar, lechuga, tomate y salsa de la casa.', price: 18900, badge: 'Favorita', art: 'burger' },
  { id: 'burger-doble', category: 'hamburguesas', name: 'Doble Queso', desc: 'Doble carne, doble cheddar, cebolla caramelizada y pepinillos.', price: 26900, badge: 'Nueva', art: 'doble' },
  { id: 'burger-pollo', category: 'hamburguesas', name: 'Crispy de Pollo', desc: 'Pechuga apanada crujiente, lechuga y mayonesa de ajo.', price: 21900, art: 'pollo' },
  { id: 'perro-especial', category: 'perros', name: 'Perro Especial', desc: 'Salchicha americana, papa ripio, queso gratinado y salsas.', price: 15900, art: 'hotdog' },
  { id: 'sandwich-club', category: 'perros', name: 'Sándwich Club', desc: 'Pan tostado, pollo, tocineta, queso, lechuga y tomate.', price: 19900, art: 'sandwich' },
  { id: 'papas-grandes', category: 'snacks', name: 'Papas Grandes', desc: 'Papas fritas doradas con sal y salsa a elegir.', price: 8500, badge: 'Para compartir', art: 'papas' },
  { id: 'nuggets', category: 'snacks', name: 'Nuggets x10', desc: 'Diez nuggets de pollo crocantes con dip de BBQ.', price: 14900, art: 'nuggets' },
  { id: 'aros', category: 'snacks', name: 'Aros de Cebolla', desc: 'Aros apanados y fritos, con salsa ranch.', price: 9900, art: 'aros' },
  { id: 'pizza-pepperoni', category: 'pizza', name: 'Pizza Pepperoni', desc: 'Personal de 8 porciones con mozzarella y pepperoni.', price: 32900, badge: 'Popular', art: 'pizza' },
  { id: 'pizza-hawaiana', category: 'pizza', name: 'Pizza Hawaiana', desc: 'Jamón, piña y mozzarella sobre salsa de tomate.', price: 31900, art: 'pizza2' },
  { id: 'gaseosa', category: 'bebidas', name: 'Gaseosa 400 ml', desc: 'Bien fría. Cola, limón o naranja.', price: 4500, art: 'soda' },
  { id: 'malteada', category: 'bebidas', name: 'Malteada', desc: 'Vainilla, fresa o chocolate con crema batida.', price: 12900, art: 'malteada' },
  { id: 'helado', category: 'bebidas', name: 'Copa de Helado', desc: 'Tres bolas, salsa de chocolate y galleta.', price: 9900, art: 'helado' },
];
