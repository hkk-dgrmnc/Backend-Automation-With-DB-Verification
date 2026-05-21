export const exampleQueries = {
  findById: 'SELECT id, title, price, category FROM products WHERE id = $1',
  findActiveById: 'SELECT id, title, price, category, is_active FROM products WHERE id = $1 AND is_active = true'
};
