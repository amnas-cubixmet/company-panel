import { useMemo, useState } from 'react';
import { Edit3, Plus, Search, FolderTree, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';
import { buildCategoryTreeRows } from '../../utils/serviceHierarchy';

const statusClass = status => String(status).toLowerCase() === 'active' ? 'is-active' : 'is-inactive';

export const ServiceCategoriesPanel = ({ categories = [], services = [], onAdd, onEdit, onDelete }) => {
  const { user } = useAuth();
  const canCreate = hasPermission(user, 'services.create');
  const canEdit = hasPermission(user, 'services.edit');
  const canDelete = hasPermission(user, 'services.delete');
  const [query, setQuery] = useState('');
  const nodes = useMemo(() => buildCategoryTreeRows(categories), [categories]);
  const filtered = nodes.filter(category =>
    !query.trim() || category.path.toLowerCase().includes(query.trim().toLowerCase())
  );
  const childCounts = new Map();
  for (const category of categories) {
    if (category.parentId) childCounts.set(category.parentId, (childCounts.get(category.parentId) || 0) + 1);
  }
  return (
    <section className="service-category-section">
      <div className="service-section-header">
        <div><h2>Service Categories</h2><p>Organize services into a category tree.</p></div>
        {canCreate && <button type="button" className="service-primary-button" aria-label="Add Category" onClick={() => onAdd(null)}>
          <Plus size={16}/> Main Category
        </button>}
      </div>
      <label className="service-category-search"><Search size={17} aria-hidden="true"/>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Search categories and subcategories" aria-label="Search service categories"/>
      </label>
      <div className="service-category-tree" role="tree" aria-label="Service category hierarchy">
        {filtered.map(category => {
          const count = services.filter(service =>
            String(service.categoryId || '') === String(category.id)
          ).length;
          const children = childCounts.get(category.id) || 0;
          return (
            <div role="treeitem" aria-level={category.depth + 1} key={category.id}
              className="service-category-tree-row"
              style={{ '--service-category-indent': Math.min(category.depth, 8) * 16 + 'px' }}>
              <span className="service-category-tree-icon"><FolderTree size={17} aria-hidden="true"/></span>
              <div className="service-category-tree-content">
                <strong>{category.name}</strong>
                <small title={category.path}>{category.path} · {count} services · {children} subcategories</small>
              </div>
              <span className={'service-status ' + statusClass(category.status)}>{category.status || 'active'}</span>
              <div className="service-category-tree-actions">
                {canCreate && <button type="button" onClick={() => onAdd(category.id)} title={'Add subcategory under ' + category.name}><Plus size={15}/> Subcategory</button>}
                {canEdit && <button type="button" onClick={() => onEdit(category)} aria-label={'Edit ' + category.name}><Edit3 size={15}/> Edit</button>}
                {canDelete && <button type="button" className="is-danger"
                  disabled={children > 0 || count > 0}
                  title={children || count ? 'Move children and services or deactivate this category first' : 'Delete empty category'}
                  onClick={() => onDelete(category)} aria-label={'Delete ' + category.name}><Trash2 size={15}/></button>}
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="service-empty">No matching categories.</p>}
      </div>
    </section>
  );
};
