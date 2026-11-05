import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { AccountHeader } from '../../components/account';
import { Eye, EyeOff, KeyRound, Link2, Lock, ShieldCheck } from 'lucide-react';
import { authRecoveryService } from '../../services/authRecovery.service';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/account-security.css';
import '../../styles/account-security-inputs.css';

export const AccountSecurity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  const change = async (event) => {
    event.preventDefault();
    setMessage('');
    if (newPassword !== confirm) return setMessage('New passwords do not match.');
    setLoading(true);
    try {
      await authRecoveryService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setMessage('Password changed successfully.');
    } catch (error) {
      setMessage(error?.message || 'Unable to change password.');
    } finally {
      setLoading(false);
    }
  };

  const sendMagic = async () => {
    if (!user?.email) return setMessage('No account email is available.');
    setMagicLoading(true);
    setMessage('');
    try {
      await authRecoveryService.requestMagicLink(user.email);
      // Never expose preview URLs or one-time authentication tokens in the UI.
      setMessage('If this email supports magic-link sign-in, check your inbox.');
    } catch (error) {
      setMessage(error?.message || 'Unable to send magic link.');
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className="account-security-page">
      <AccountHeader
        title="Password & Security"
        active="security"
        onNavigate={navigate}
      />

      {message && <div className="account-security-message" role="status" aria-live="polite">{message}</div>}

      <div className="account-security-grid">
        <section className="account-security-card">
          <div className="account-security-card-head"><KeyRound size={18}/><div><strong>Change Password</strong></div></div>
          <form onSubmit={change} className="account-security-form">
            <label className="account-security-field">
              <span>Current Password</span>
              <div className="account-security-input-row">
                <Lock className="account-security-field-icon" size={18} aria-hidden="true" />
                <input className="account-security-password-input" autoComplete="current-password"
                  aria-label="Current password" type={showCurrent ? 'text' : 'password'}
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                <button className="account-security-visibility-toggle" type="button"
                  aria-label={showCurrent ? "Hide current password" : "Show current password"}
                  aria-pressed={showCurrent} onClick={() => setShowCurrent((v) => !v)}>
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label className="account-security-field">
              <span>New Password</span>
              <div className="account-security-input-row">
                <Lock className="account-security-field-icon" size={18} aria-hidden="true" />
                <input className="account-security-password-input" autoComplete="new-password"
                  minLength={8} aria-label="New password" type={showNew ? 'text' : 'password'}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters" required />
                <button className="account-security-visibility-toggle" type="button"
                  aria-label={showNew ? "Hide new password" : "Show new password"}
                  aria-pressed={showNew} onClick={() => setShowNew((v) => !v)}>
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label className="account-security-field">
              <span>Confirm New Password</span>
              <div className="account-security-input-row">
                <Lock className="account-security-field-icon" size={18} aria-hidden="true" />
                <input className="account-security-password-input" type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password" minLength={8} aria-label="Confirm new password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm your new password" required />
                <button className="account-security-visibility-toggle" type="button"
                  aria-label={showConfirm ? "Hide confirmed password" : "Show confirmed password"}
                  aria-pressed={showConfirm} onClick={() => setShowConfirm((v) => !v)}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button type="submit" className="account-security-primary" disabled={loading}>
              {loading ? 'Updating…' : 'Change Password'}
            </button>
          </form>
        </section>

        <section className="account-security-card">
          <div className="account-security-card-head"><Link2 size={18}/><div><strong>Magic Link</strong></div></div>
          <div className="account-security-info">
            <p>Sign in securely using your email.</p>
            <button type="button" className="account-security-secondary" onClick={sendMagic} disabled={magicLoading}>{magicLoading ? 'Sending…' : 'Send Magic Link'}</button>
          </div>
        </section>

        <section className="account-security-card account-security-wide">
          <div className="account-security-card-head"><ShieldCheck size={18}/><div><strong>Recovery Help</strong></div></div>
          <div className="account-security-info">
            <p>Need help accessing your account?</p>
            <button type="button" className="account-security-secondary" onClick={() => navigate('/forgot-password')}>Reset Password</button>
          </div>
        </section>
      </div>
    </div>
  );
};
