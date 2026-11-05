import { useState } from 'react';
import { ExternalLink, MessageCircle } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { USE_MOCK_API } from '../../api/apiConfig';
import '../../styles/whatsapp-manual-share.css';

/**
 * Preparing a Click-to-Chat message does NOT send a WhatsApp message.
 * Open a blank tab on the original user gesture to avoid async popup blockers.
 */
export function WhatsAppManualShareButton({ targetType, targetId, label = 'Send via WhatsApp', className = '' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preparedUrl, setPreparedUrl] = useState('');
  const [preview, setPreview] = useState('');

  const open = async () => {
    if (!targetId || loading) return;
    setLoading(true);
    setError('');
    setPreparedUrl('');
    setPreview('');
    const tab = window.open('', '_blank');
    if (tab) {
      tab.opener = null;
      try { tab.document.title = 'Preparing WhatsApp message'; }
      catch { /* Browser-managed blank window */ }
    }

    try {
      if (USE_MOCK_API) throw new Error('WhatsApp sharing requires the live Django backend.');
      const data = await apiClient.post('/whatsapp/manual-share', { targetType, targetId });
      if (!data?.url) throw new Error('WhatsApp share link was not generated.');
      setPreparedUrl(data.url);
      setPreview(data.preview || '');
      if (tab && !tab.closed) tab.location.replace(data.url);
    } catch (cause) {
      if (tab && !tab.closed) tab.close();
      setError(cause?.message || 'Unable to prepare WhatsApp sharing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className={'wa-manual-share ' + className}>
      <button type="button" className="wa-manual-share__button"
        onClick={open} disabled={!targetId || loading}>
        <MessageCircle size={16} aria-hidden="true" />
        {loading ? 'Preparing…' : label}
      </button>
      {error && <span role="alert" className="wa-manual-share__error">{error}</span>}
      {preparedUrl && (
        <span role="status" className="wa-manual-share__note">
          Draft prepared. Review it in WhatsApp and press Send.
          {' '}<a href={preparedUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={13} aria-hidden="true" /> Open draft
          </a>
        </span>
      )}
      {preview && <details className="wa-manual-share__preview"><summary>Message preview</summary><p>{preview}</p></details>}
    </span>
  );
}
