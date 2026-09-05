export const CATEGORIAS_GASTO = ['mecanica', 'carroceria', 'papeles', 'transporte', 'publicidad', 'comision', 'otros'];

export function normalizeCategoria(cat) {
  return CATEGORIAS_GASTO.includes(cat) ? cat : 'otros';
}
