import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, ClipboardCheck, Plus, RefreshCcw, Search, SkipForward, Trash2, Wrench } from 'lucide-react';
import { jobInspectionService, DEFAULT_INSPECTION_CATEGORIES } from '../../services/jobInspection.service';

const newFinding = () => ({
  description: '', severity: 'Medium', recommendedAction: '', estimatedCost: ''
});

const formatMoney = (number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(number) || 0);

const readImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the photo.'));
  reader.readAsDataURL(file);
});

export function JobInspectionPanel({ job, onChanged, canCorrect = false, canSkip = false, startEditing = false, onDoneEditing }) {
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(DEFAULT_INSPECTION_CATEGORIES[0].id);
  const [editing, setEditing] = useState(startEditing);
  const [finding, setFinding] = useState(newFinding());
  const [diagnostic, setDiagnostic] = useState({ code: '', description: '' });
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [skipReason, setSkipReason] = useState('Quick Service');
  const [skipOther, setSkipOther] = useState('');

  const reload = useCallback(async () => {
    const result = await jobInspectionService.getInspection(job.id);
    setInspection(result || { status: 'Not Started', checklist: {}, findings: [], photos: [], diagnosticScan: { codes: [] } });
    return result;
  }, [job.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    jobInspectionService.getInspection(job.id)
      .then((result) => {
        if (active) setInspection(result || { status: 'Not Started', checklist: {}, findings: [], photos: [], diagnosticScan: { codes: [] } });
      })
      .catch((e) => { if (active) setError(e?.message || 'Could not load inspection.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [job.id]);

  const perform = async (label, operation) => {
    if (busy) return false;
    setBusy(label);
    setError('');
    try {
      await operation();
      await reload();
      await onChanged?.(label);
      return true;
    } catch (e) {
      setError(e?.message || 'Unable to save inspection.');
      return false;
    } finally {
      setBusy('');
    }
  };

  const checklist = inspection?.checklist || {};
  const items = useMemo(() => [...new Set(DEFAULT_INSPECTION_CATEGORIES.flatMap((group) => group.items))], []);
  const total = items.length;
  const completed = items.filter((item) => checklist[item] && checklist[item] !== 'Not Checked').length;
  const good = items.filter((item) => checklist[item] === 'Good').length;
  const attention = items.filter((item) => ['Needs Attention', 'Critical'].includes(checklist[item])).length;
  const findings = inspection?.findings || [];
  const photos = inspection?.photos || [];
  const codes = inspection?.diagnosticScan?.codes || [];
  const isCompleted = inspection?.status === 'Completed';
  const isSkipped = inspection?.status === 'Skipped';
  const isStarted = inspection?.status === 'In Progress' || isCompleted;
  const editable = isStarted && (!isCompleted || (canCorrect && editing));
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const activeGroups = DEFAULT_INSPECTION_CATEGORIES.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()) || group.name.toLowerCase().includes(search.trim().toLowerCase()))
  })).filter((group) => group.items.length);

  const visibleGroup = activeGroups.find((group) => group.id === selectedGroup) || activeGroups[0];
  const groupPosition = activeGroups.findIndex((group) => group.id === visibleGroup?.id);

  const saveFinding = async (event) => {
    event.preventDefault();
    if (!finding.description.trim()) {
      setError('Describe the finding before saving.');
      return;
    }
    const saved = await perform('finding', () => jobInspectionService.addFinding(job.id, {
      ...finding,
      title: finding.description.trim(),
      description: finding.description.trim(),
      estimatedPartCharge: Number(finding.estimatedCost) || 0
    }));
    if (saved) setFinding(newFinding());
  };

  const saveDiagnostic = async (event) => {
    event.preventDefault();
    if (!diagnostic.code.trim()) return;
    const saved = await perform('diagnostic', () => jobInspectionService.addDiagnosticCode(job.id, {
      code: diagnostic.code.trim().toUpperCase(), description: diagnostic.description.trim()
    }));
    if (saved) setDiagnostic({ code: '', description: '' });
  };

  const savePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setError('Choose an image under 2 MB.');
      return;
    }
    try {
      const url = await readImage(file);
      await perform('photo', () => jobInspectionService.addInspectionPhoto(job.id, {
        url, type: 'Inspection', caption: file.name
      }));
    } catch (e) {
      setError(e?.message || 'Photo could not be saved.');
    }
  };


  const submitSkip = async (event) => {
    event.preventDefault();
    const reason = skipReason === 'Other' ? skipOther.trim() : skipReason;
    if (reason.length < 3 || reason.length > 300) {
      setError('Enter a skip reason between 3 and 300 characters.');
      return;
    }
    const saved = await perform('skip', () => jobInspectionService.skipInspection(job.id, reason));
    if (saved) setSkipConfirm(false);
  };

  if (loading) return <div className="cg-inspection-loading" role="status">Loading vehicle inspection…</div>;

  return (
    <div className="cg-inspection" aria-label="Vehicle inspection">
      <section className="cg-inspection-overview">
        <div className="cg-inspection-overview-top">
          <div className="cg-inspection-overview-copy">
            <span className="cg-inspection-kicker">Vehicle inspection</span>
            <h3>{job.vehicleReg || job.vehicle?.registration || 'Vehicle'} <span>· {inspection?.status || 'Not Started'}</span></h3>
            <p>{isSkipped ? 'Inspection was skipped. Existing inspection findings remain available.' : 'Check the vehicle and record issues, or skip when inspection is not required.'}</p>
          </div>
          <div className="cg-inspection-header-actions">
            <button type="button" className="cg-inspection-icon-button" aria-label="Refresh inspection" disabled={!!busy} onClick={() => perform('refresh', async () => {})}><RefreshCcw size={16} /></button>
            {!isStarted && !isSkipped && (
              <button type="button" className="cg-inspection-primary" disabled={!!busy} onClick={() => perform('start', () => jobInspectionService.startInspection(job.id))}>
                {busy === 'start' ? 'Starting…' : 'Start inspection'}
              </button>
            )}
            {isCompleted && canCorrect && (
              <button type="button" className="cg-inspection-primary" disabled={!!busy}
                onClick={() => {
                  if (editing) onDoneEditing?.();
                  else setEditing(true);
                }}>
                {editing ? 'Done editing · Back to Estimate' : 'Edit Inspection'}
              </button>
            )}
          </div>
        </div>
        <div className="cg-inspection-stats" aria-label="Inspection summary">
          <div><span>Checked</span><strong>{completed} / {total}</strong></div>
          <div><span>Good</span><strong>{good}</strong></div>
          <div><span>Needs attention</span><strong>{attention}</strong></div>
          <div><span>Findings</span><strong>{findings.length}</strong></div>
        </div>
        <div className="cg-inspection-progress-head">
          <span>Checklist progress</span>
          <strong>{progress}%</strong>
        </div>
        <div className="cg-inspection-progress-track" role="progressbar" aria-label="Inspection checklist progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed}>
          <div style={{ width: progress + '%' }} />
        </div>
      </section>

      {error && <div className="cg-inspection-error" role="alert">{error}</div>}

      <section className="cg-inspection-checklist">
        <div className="cg-inspection-section-heading">
          <div>
            <h3><ClipboardCheck size={17} aria-hidden="true"/> Inspection checklist</h3>
            <p>Choose a category and tap a condition to save each check.</p>
          </div>
          <label className="cg-inspection-search">
            <Search size={16} aria-hidden="true"/>
            <input aria-label="Search inspection items" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search checks"/>
          </label>
        </div>
        {!isStarted && !isSkipped && <p className="cg-inspection-hint">Start inspection to enable checklist options, or use Skip Inspection below.</p>}
        <div className="cg-inspection-category-row">
          <label htmlFor="cg-inspection-category">Category</label>
          <select
            id="cg-inspection-category"
            value={visibleGroup?.id || ''}
            onChange={(e) => setSelectedGroup(e.target.value)}
            disabled={!activeGroups.length}
          >
            {activeGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.items.filter((item) => checklist[item] && checklist[item] !== 'Not Checked').length}/{group.items.length})
              </option>
            ))}
          </select>
          <span>{activeGroups.length ? groupPosition + 1 + ' / ' + activeGroups.length : 'No categories'}</span>
        </div>
        {visibleGroup ? (
          <div className="cg-inspection-check-rows">
            {visibleGroup.items.map((item) => {
              const selected = checklist[item] || 'Not Checked';
              return (
                <div key={item} className="cg-inspection-check-row">
                  <div className="cg-inspection-check-name">
                    <span>{item}</span>
                    <small>{selected === 'Not Checked' ? 'Not checked' : selected}</small>
                  </div>
                  <div className="cg-inspection-condition-actions" role="group" aria-label={item + ' condition'}>
                    {['Good', 'Needs Attention', 'Critical'].map((status) => (
                      <button
                        type="button"
                        key={status}
                        disabled={!editable || !!busy}
                        aria-pressed={selected === status}
                        className={['cg-inspection-condition', status === 'Good' ? 'is-good' : status === 'Critical' ? 'is-critical' : 'is-attention', selected === status ? 'is-selected' : ''].join(' ')}
                        onClick={() => perform('check', () => jobInspectionService.updateChecklistItem(job.id, item, status))}
                      >
                        {status === 'Needs Attention' ? 'Attention' : status}
                      </button>
                    ))}
                    {selected !== 'Not Checked' && editable && (
                      <button type="button" className="cg-inspection-reset" aria-label={'Clear ' + item} title="Clear check" disabled={!!busy} onClick={() => perform('check', () => jobInspectionService.updateChecklistItem(job.id, item, 'Not Checked'))}>×</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="cg-inspection-empty">No checklist items match this search.</p>
        )}
        <div className="cg-inspection-category-footer">
          <span>{visibleGroup ? visibleGroup.items.filter((item) => checklist[item] && checklist[item] !== 'Not Checked').length + ' of ' + visibleGroup.items.length + ' checked in this category' : 'Try another search'}</span>
          <button type="button" disabled={!visibleGroup || groupPosition >= activeGroups.length - 1} onClick={() => setSelectedGroup(activeGroups[groupPosition + 1].id)}>
            Next category <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section className="cg-inspection-findings">
        <div className="cg-inspection-section-heading">
          <div>
            <h3><Wrench size={17} aria-hidden="true"/> Findings</h3>
            <p>Record issues that need repair or a customer estimate.</p>
          </div>
          <span className="cg-inspection-count">{findings.length} recorded</span>
        </div>
        {findings.length > 0 ? (
          <div className="cg-inspection-findings-list">
            {findings.map((item) => (
              <article key={item.id} className="cg-inspection-finding-card">
                <div className="cg-inspection-finding-body">
                  <strong>{item.description || item.title}</strong>
                  <small>{item.severity || 'Medium'} priority · {formatMoney(item.estimatedPartCharge ?? item.estimatedCost)}</small>
                  {item.recommendedAction && <p>{item.recommendedAction}</p>}
                </div>
                <div className="cg-inspection-finding-actions">
                  <button type="button" disabled={!!busy || item.addedToEstimate} onClick={() => perform('estimate', () => jobInspectionService.addFindingToEstimate(job.id, item.id))}>{item.addedToEstimate ? 'For estimate' : 'Mark for estimate'}</button>
                  {editable && <button type="button" disabled={!!busy} onClick={() => perform('delete', () => jobInspectionService.deleteFinding(job.id, item.id))} aria-label={'Delete finding ' + (item.description || item.title)}><Trash2 size={14}/></button>}
                </div>
              </article>
            ))}
          </div>
        ) : <p className="cg-inspection-empty">No issues recorded. You can complete a good-condition inspection without findings.</p>}
        <details className="cg-inspection-expand">
          <summary><Plus size={16} aria-hidden="true"/> Add finding</summary>
          <form onSubmit={saveFinding} className="cg-inspection-form">
            <label>Issue / damage
              <textarea required rows={3} placeholder="Describe the issue" value={finding.description} onChange={(e) => setFinding({ ...finding, description: e.target.value })}/>
            </label>
            <div className="cg-inspection-two-fields">
              <label>Severity
                <select value={finding.severity} onChange={(e) => setFinding({ ...finding, severity: e.target.value })}>
                  {['Low', 'Medium', 'High', 'Critical'].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label>Estimated parts cost (₹)
                <input type="number" min="0" step="0.01" placeholder="0" value={finding.estimatedCost} onChange={(e) => setFinding({ ...finding, estimatedCost: e.target.value })}/>
              </label>
            </div>
            <label>Recommended action
              <input placeholder="Repair, replace, inspect" value={finding.recommendedAction} onChange={(e) => setFinding({ ...finding, recommendedAction: e.target.value })}/>
            </label>
            <button type="submit" className="cg-inspection-primary" disabled={!editable || !!busy || !finding.description.trim()}>{busy === 'finding' ? 'Saving…' : 'Save finding'}</button>
          </form>
        </details>
      </section>

      <details className="cg-inspection-expand cg-inspection-attachments">
        <summary><Camera size={16} aria-hidden="true"/> Photos & Diagnostics <span>{photos.length + codes.length} added</span></summary>
        <div className="cg-inspection-attachment-content">
          <section>
            <h4>Inspection photos</h4>
            <p>Use your camera or upload an image (max 2 MB).</p>
            <label className={'cg-inspection-upload ' + (!editable || busy ? 'is-disabled' : '')}>
              <Camera size={16}/> Take / upload photo
              <input type="file" accept="image/*" capture="environment" disabled={!editable || !!busy} onChange={savePhoto}/>
            </label>
            {!!photos.length && <div className="cg-inspection-photo-grid">{photos.map((photo) => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" title={photo.caption || 'Inspection photo'}><img src={photo.url} alt={photo.caption || 'Inspection photo'}/></a>)}</div>}
          </section>
          <section>
            <h4>Diagnostic codes</h4>
            <form onSubmit={saveDiagnostic} className="cg-inspection-form">
              <label>Fault code
                <input value={diagnostic.code} onChange={(e) => setDiagnostic({ ...diagnostic, code: e.target.value })} placeholder="e.g. P0300"/>
              </label>
              <label>Description
                <input value={diagnostic.description} onChange={(e) => setDiagnostic({ ...diagnostic, description: e.target.value })} placeholder="Fault description"/>
              </label>
              <button type="submit" disabled={!editable || !!busy || !diagnostic.code.trim()}>Add diagnostic code</button>
            </form>
            {!!codes.length && <div className="cg-inspection-code-list">{codes.map((code) => <div key={code.id}><strong>{code.code}</strong><span>{code.description || 'No description'}</span></div>)}</div>}
          </section>
        </div>
      </details>

      {skipConfirm && !isSkipped && !isCompleted && canSkip && (
        <form className="cg-inspection-skip-confirm" onSubmit={submitSkip} aria-label="Confirm skip inspection">
          <div>
            <strong>Skip this inspection?</strong>
            <p>Unchecked items will remain Not Checked. Skipping is recorded in the Job Card history.</p>
          </div>
          <label htmlFor="inspection-skip-reason">Reason for skipping
            <select id="inspection-skip-reason" value={skipReason} disabled={!!busy} onChange={(event) => setSkipReason(event.target.value)}>
              <option value="Quick Service">Quick Service</option>
              <option value="Customer Declined Inspection">Customer Declined Inspection</option>
              <option value="Inspection Not Required">Inspection Not Required</option>
              <option value="Other">Other</option>
            </select>
          </label>
          {skipReason === 'Other' && (
            <label htmlFor="inspection-skip-other">Specify reason
              <textarea id="inspection-skip-other" rows={2} maxLength={300} required value={skipOther}
                onChange={(event) => setSkipOther(event.target.value)}
                placeholder="Why is the inspection being skipped?" disabled={!!busy} />
            </label>
          )}
          <div className="cg-inspection-skip-confirm-actions">
            <button type="button" disabled={!!busy} onClick={() => setSkipConfirm(false)}>Cancel</button>
            <button type="submit" disabled={!!busy || (skipReason === 'Other' && skipOther.trim().length < 3)}>
              {busy === 'skip' ? 'Skipping…' : 'Confirm Skip & Continue'}
            </button>
          </div>
        </form>
      )}
      <footer className="cg-inspection-footer">
        <div className="cg-inspection-footer-message">
          <strong>{isSkipped ? 'Inspection skipped' : isCompleted ? 'Inspection completed' : !isStarted ? 'Start or skip inspection' : completed ? 'Ready to finish inspection' : 'Check the vehicle to continue'}</strong>
          <p>{isSkipped ? 'Reason: ' + (inspection?.skipReason || 'Not specified')
            : isCompleted ? canCorrect ? 'Use Edit Inspection to correct checks before estimate approval.' : 'Inspection is approved and read-only.'
            : 'Complete at least one check, or skip with a recorded reason.'}</p>
        </div>
        {isSkipped ? (
          <span className="cg-inspection-skipped"><SkipForward size={16}/> Skipped</span>
        ) : isCompleted ? (
          <span className="cg-inspection-done"><CheckCircle2 size={16}/> {editing ? 'Editing' : 'Completed'}</span>
        ) : (
          <div className="cg-inspection-footer-actions">
            {canSkip && (
              <button type="button" className="cg-inspection-skip-button" disabled={!!busy}
                onClick={() => setSkipConfirm((value) => !value)}>
                <SkipForward size={16}/> Skip Inspection
              </button>
            )}
            <button type="button" className="cg-inspection-primary" disabled={!isStarted || completed === 0 || !!busy} onClick={() => perform('complete', () => jobInspectionService.completeInspection(job.id, true))}>
              <CheckCircle2 size={16}/> {busy === 'complete' ? 'Finishing…' : 'Complete inspection'}
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}

export default JobInspectionPanel;
