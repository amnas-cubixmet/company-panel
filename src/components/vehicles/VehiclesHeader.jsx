
import { Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../utils/permissions';

export const VehiclesHeader = ({ onAddVehicle }) => {
  const { user } = useAuth();

  return (
    <header className="vehicle-dashboard-header">
      <div>
        <h1>Vehicles</h1>
      </div>

      <div className="vehicle-dashboard-header-actions">
        {hasPermission(user, 'vehicles.create') && (
          <button type="button" className="vehicle-primary-button" onClick={onAddVehicle}>
            <Plus size={14} />
            Add Vehicle
          </button>
        )}
      </div>
    </header>
  );
};
