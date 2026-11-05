// Flat API records stay stable; only the presentation order changes.
// Avoid recursion for arbitrarily deep workshop category trees.
export const buildCategoryTreeRows = (categories = []) => {
  const byId = new Map(categories.map(row => [String(row.id), row]));
  const children = new Map();
  for (const category of categories) {
    const parentId = category.parentId ? String(category.parentId) : '';
    const parent = byId.get(parentId);
    const key = parent && parent.id !== category.id ? parentId : '';
    const list = children.get(key) || [];
    list.push(category);
    children.set(key, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }
  const visited = new Set(), result = [];
  const walk = (id, depth, path = []) => {
    const stack = [...(children.get(id) || [])].reverse().map(row => ({ row, depth, path }));
    while (stack.length) {
      const node = stack.pop();
      const key = String(node.row.id);
      if (visited.has(key)) continue;
      visited.add(key);
      const nextPath = [...node.path, node.row.name];
      result.push({ ...node.row, depth: node.depth, path: nextPath.join(' › ') });
      const nested = children.get(key) || [];
      for (let i = nested.length - 1; i >= 0; i -= 1) {
        stack.push({ row: nested[i], depth: node.depth + 1, path: nextPath });
      }
    }
  };
  walk('', 0);
  // Orphaned legacy/corrupt records remain visible; never silently drop data.
  for (const row of categories) {
    if (!visited.has(String(row.id))) {
      walk(String(row.parentId || ''), 0);
      if (!visited.has(String(row.id))) {
        visited.add(String(row.id));
        result.push({ ...row, depth: 0, path: row.name });
      }
    }
  }
  return result;
};

export const categoryIsDescendantOf = (categoryId, possibleParentId, categories = []) => {
  const parentById = new Map(categories.map(row => [String(row.id), String(row.parentId || '')]));
  const seen = new Set();
  let current = String(possibleParentId || '');
  while (current) {
    if (current === String(categoryId)) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = parentById.get(current) || '';
  }
  return false;
};
