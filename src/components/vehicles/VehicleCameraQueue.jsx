import { useEffect, useState } from 'react';
import { Camera, Trash2, UploadCloud } from 'lucide-react';
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
  const [category, setCategory] = useState('additional');
  const [phase, setPhase] = useState('before');
  const [caption, setCaption] = useState('');
  const [uploadError, setUploadError] = useState('');

  const addUploads = (event) => {
    const picked = Array.from(event.target.files || []);
    setUploadError('');
    const accepted = picked.filter((file) => file.type.startsWith('image/') && file.size <= 15 * 1024 * 1024);
    if (accepted.length !== picked.length) {
      setUploadError('Select image files up to 15 MB each. Unsupported files were skipped.');
    }
    if (accepted.length) {
      onChange((current) => [...current, ...accepted.map((file) => ({
        id: 'upload-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        file, category, phase, caption: caption.trim(), notes: caption.trim(),
      }))]);
    }
    event.target.value = '';
  };
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
        <div className="vehicle-photo-add-actions">
          <LiveVehicleCamera onCapture={add} disabled={disabled} count={photos.length}/>
          <label className="vehicle-gallery-upload-label">
            <UploadCloud size={17} aria-hidden="true"/> Upload Photos
            <input type="file" accept="image/*" multiple disabled={disabled}
              onChange={addUploads} aria-label="Upload vehicle photos from gallery"/>
          </label>
        </div>
      </div>
      <div className="vehicle-gallery-upload-metadata">
        <label>Upload Photo Category
          <select value={category} disabled={disabled} onChange={(event) => setCategory(event.target.value)}>
            <option value="front">Front View</option><option value="rear">Rear View</option>
            <option value="left">Left Side</option><option value="right">Right Side</option>
            <option value="interior">Interior</option><option value="dashboard">Dashboard</option>
            <option value="engine">Engine</option><option value="damage">Damage</option>
            <option value="additional">Other</option>
          </select>
        </label>
        <label>Service Phase
          <select value={phase} disabled={disabled} onChange={(event) => setPhase(event.target.value)}>
            <option value="before">Before Service</option><option value="progress">In Progress</option>
            <option value="after">After Service</option>
          </select>
        </label>
        <label>Photo Notes
          <input value={caption} disabled={disabled} maxLength={255}
            onChange={(event) => setCaption(event.target.value)} placeholder="Optional notes for gallery photos"/>
        </label>
      </div>
      {uploadError && <p className="vehicle-photo-gallery-error" role="alert">{uploadError}</p>}
      <div className="vehicle-camera-counter" role="status">{photos.length} photo{photos.length === 1 ? '' : 's'} ready to attach to this Job Card</div>
      {photos.length ? (
        <div className="vehicle-camera-queue-grid">
          {photos.map((item) => <QueuedPhoto key={item.id} item={item} onRemove={remove} disabled={disabled} />)}
        </div>
      ) : <p className="vehicle-camera-empty">No photos captured yet. Photos are optional.</p>}
      {uploading > 0 && <p role="status">Saving photo {uploading} of {photos.length}…</p>}
    </section>
  );
}
