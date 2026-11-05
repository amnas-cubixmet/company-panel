import { useEffect, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { LiveVehicleCamera } from './LiveVehicleCamera';
import '../../styles/vehicle-camera-queue.css';

function QueuedPhoto({ item, onRemove, disabled }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file]);

  return (
    <figure className="vehicle-camera-queued">
      {url && <img src={url} alt={item.caption || item.category || 'Vehicle inspection'} />}
      <figcaption><strong>{item.category}</strong><small>{item.caption || 'Private until published'}</small></figcaption>
      <button type="button" onClick={() => onRemove(item.id)} disabled={disabled} aria-label="Remove photo"><Trash2 size={17}/></button>
    </figure>
  );
}

export function VehicleCameraQueue({ photos = [], onChange, disabled = false, uploading = 0 }) {
  const add = ({ file, ...metadata }) => {
    onChange((current) => [...current, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file, ...metadata,
    }]);
  };
  const remove = (id) => onChange((current) => current.filter((item) => item.id !== id));
  return (
    <section className="vehicle-camera-queue" aria-label="Vehicle camera photos">
      <div className="vehicle-camera-heading">
        <div><h3><Camera size={18}/> Vehicle Inspection Photos</h3>
          <p>Capture photos using the mobile camera. All uploads stay private until published.</p></div>
        <LiveVehicleCamera onCapture={add} disabled={disabled}/>
      </div>
      {photos.length ? (
        <div className="vehicle-camera-queue-grid">
          {photos.map((item) => <QueuedPhoto key={item.id} item={item} onRemove={remove} disabled={disabled} />)}
        </div>
      ) : <p className="vehicle-camera-empty">No photos captured yet. Photos are optional.</p>}
      {uploading > 0 && <p role="status">Saving photo {uploading} of {photos.length}…</p>}
    </section>
  );
}
