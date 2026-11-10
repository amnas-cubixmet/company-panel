
import { FolderPlus, Plus, Wrench } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';

export const ServicesHeader = ({ onAdd, onAddCategory }) => {
  const { user } = useAuth();
  return (
    <header className="service-dashboard-header">
      <div>
        <h1>Workshop Services</h1>
        <p>Manage service names, labour charges, categories and checklists in one place.</p>
      </div>
      <div className="service-dashboard-header-actions">
        <div className="service-dashboard-header-badge"><Wrench size={13}/><span>Workshop Services</span></div>
        {hasPermission(user,'services.create') && (
          <>
            <button type="button" className="service-primary-button is-secondary" onClick={onAddCategory}>
              <FolderPlus size={14}/> Add Category
            </button>
            <button type="button" className="service-primary-button" onClick={onAdd}>
              <Plus size={14}/> Add Service
            </button>
          </>
        )}
      </div>
    </header>
  );
};