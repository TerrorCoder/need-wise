import type { Product } from '../types';

export const demoCatalogue: Product[] = [
  { id: 'demo-lamp-01', name: 'LED Study Lamp', description: 'Dimmable desk light with USB charging.', priceCents: 1899, category: 'study', merchant: 'NeedWise demo merchant', source: 'demo', attributes: { durability: 4, portability: 4, value: 5 } },
  { id: 'demo-bottle-01', name: 'Insulated Water Bottle', description: '750 ml stainless steel bottle for daily use.', priceCents: 1499, category: 'daily essentials', merchant: 'NeedWise demo merchant', source: 'demo', attributes: { durability: 5, portability: 4, value: 5 } },
  { id: 'demo-headphones-01', name: 'Wired Study Headphones', description: 'Foldable over-ear headphones with an inline microphone.', priceCents: 2499, category: 'technology', merchant: 'NeedWise demo merchant', source: 'demo', attributes: { durability: 3, portability: 4, value: 5 } },
  { id: 'demo-backpack-01', name: 'Everyday Campus Backpack', description: 'Water-resistant 22 L backpack with laptop sleeve.', priceCents: 3299, category: 'bags', merchant: 'NeedWise demo merchant', source: 'demo', attributes: { durability: 4, portability: 5, value: 4 } },
  { id: 'demo-powerbank-01', name: 'Compact Power Bank', description: '10,000 mAh USB-C portable charger.', priceCents: 2999, category: 'technology', merchant: 'NeedWise demo merchant', source: 'demo', attributes: { durability: 4, portability: 5, value: 4 } },
  { id: 'demo-kettle-01', name: 'Compact Electric Kettle', description: 'One-litre auto-shutoff kettle for small kitchens.', priceCents: 2799, category: 'home', merchant: 'NeedWise demo merchant', source: 'demo', attributes: { durability: 4, portability: 2, value: 4 } },
  { id: 'demo-notebooks-01', name: 'Recycled Notebook Set', description: 'Five ruled A5 notebooks with durable covers.', priceCents: 999, category: 'study', merchant: 'NeedWise demo merchant', source: 'demo', attributes: { durability: 3, portability: 5, value: 5 } },
  { id: 'demo-lunchbox-01', name: 'Leak-resistant Lunch Box', description: 'Three-compartment reusable lunch container.', priceCents: 1699, category: 'daily essentials', merchant: 'NeedWise demo merchant', source: 'demo', attributes: { durability: 4, portability: 4, value: 5 } }
];

export const findProducts = (ids: string[]) => {
  const unique = [...new Set(ids)];
  return unique.map((id) => demoCatalogue.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
};
