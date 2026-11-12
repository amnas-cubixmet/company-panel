import { useState } from 'react';
import { ArrowLeft, KeyRound, Mail, Phone, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CubixgearLogo } from '../../components/branding/CubixgearLogo';
import { authRecoveryService } from '../../services/authRecovery.service';
import { getAuthErrorMessage, getAuthFieldErrors } from '../../utils/authErrors';
import { isValidEmail, normalizeEmail } from '../../utils/validation';
import '../../styles/login-system.css';
import '../../styles/auth-recovery.css';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [mode, setMode] = useState('reset');
  const isMagicLink = mode === 'magic';
  const isMobile = mode === 'mobile';
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const clearFeedback = () => {
    setMessage('');
    setEmailError('');
    setPreviewUrl('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;

    clearFeedback();
    const cleanEmail = normalizeEmail(email);
    if (isMobile) {
      if (!/^\+[\d\s().-]{8,22}$/.test(mobile.trim())) {
        setEmailError('Enter your international mobile number, e.g. +919876543210.');
        return;
      }
      if (!workshop.trim()) {
        setEmailError('Enter your workshop code for a manual password reset.');
        return;
      }
    } else if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // Both paths already exist in Django. Keep them separate, rate-limited
      // server-side, and never disclose whether this address has an account.
      const result = isMobile
        ? await authRecoveryService.requestPasswordReset({ mobile, workshop })
        : isMagicLink
          ? await authRecoveryService.requestMagicLink(cleanEmail)
          : await authRecoveryService.requestPasswordReset(cleanEmail);
      if (result?.previewUrl) setPreviewUrl(result.previewUrl);
      // A successful public request does not prove that an account exists or
      // that email delivery succeeded. Never show "Link sent" for unknown users.
      setMessage(isMobile
        ? 'If eligible, contact your workshop administrator for a secure manual reset link. No WhatsApp message is sent automatically.'
        : 'If an account is eligible, recovery instructions will be sent.');
    } catch (error) {
      const backend = getAuthFieldErrors(error);
      setEmailError(backend.email || getAuthErrorMessage(error, isMagicLink
        ? 'Could not request the magic link. Try again.'
        : 'Could not request the reset link. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page auth-recovery-page">
      <div className="login-shell">
        <section className="login-card auth-recovery-card">
          <Link to="/login" className="auth-back">
            <ArrowLeft size={14} aria-hidden="true" /> Back to sign in
          </Link>

          <div className="login-brand-row">
            <div className="login-brand-mark" aria-hidden="true"><CubixgearLogo /></div>
            <div>
              <div className="login-brand-name">cubixgear</div>
              <div className="login-brand-subtitle">Secure Account Access</div>
            </div>
          </div>

          <h1 className="login-title">{isMagicLink ? 'Sign in with a magic link' : 'Reset your password'}</h1>
          <p className="login-description">
            {isMagicLink
              ? 'Email a one-time login link (valid for 15 minutes).'
              : isMobile
                  ? 'Mobile-only staff can request a reset link from their workshop administrator. No OTP or automatic WhatsApp is used.'
                  : 'Request a password reset link by email.'}
          </p>

          <div className="auth-recovery-methods" role="group" aria-label="Choose account recovery method">
            <button
              type="button"
              className={'auth-recovery-method' + (!isMagicLink ? ' is-active' : '')}
              aria-pressed={!isMagicLink}
              disabled={loading}
              onClick={() => {
                setMode('reset');
                clearFeedback();
              }}
            >
              <KeyRound size={16} strokeWidth={1.8} aria-hidden="true" />
              Reset Password
            </button>
            <button
              type="button"
              className={'auth-recovery-method' + (isMagicLink ? ' is-active' : '')}
              aria-pressed={isMagicLink}
              disabled={loading}
              onClick={() => {
                setMode('magic');
                clearFeedback();
              }}
            >
              <WandSparkles size={16} strokeWidth={1.8} aria-hidden="true" />
              Magic Login Link
            </button>
            <button type="button"
              className={'auth-recovery-method auth-recovery-method--mobile' + (isMobile ? ' is-active' : '')}
              aria-pressed={isMobile} disabled={loading}
              onClick={() => { setMode('mobile'); clearFeedback(); }}>
              <Phone size={16} aria-hidden="true" /> Mobile Recovery (Manual)
            </button>
          </div>

          <form className="login-form" onSubmit={submit} noValidate>
            <label htmlFor="forgot-password-email" className="block">
              <span className="login-field-label">{isMobile ? 'International mobile number' : 'Email'}</span>
              <div className={'login-input-shell ' + (emailError ? 'is-error' : '')}>
                <span className="login-input-icon" aria-hidden="true">{isMobile ? <Phone size={16} /> : <Mail size={16} />}</span>
                <input
                  id="forgot-password-email"
                  className="login-input"
                  type={isMobile ? 'tel' : 'email'}
                  inputMode={isMobile ? 'tel' : 'email'}
                  autoComplete={isMobile ? 'tel' : 'email'}
                  autoCapitalize="none"
                  spellCheck={false}
                  value={isMobile ? mobile : email}
                  placeholder={isMobile ? '+919876543210' : 'name@example.com'}
                  required
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? 'forgot-password-email-error' : undefined}
                  onChange={(event) => {
                    if (isMobile) setMobile(event.target.value);
                    else setEmail(event.target.value);
                    clearFeedback();
                  }}
                />
              </div>
              {isMobile && (
                <input className="login-input mt-3" type="text" aria-label="Workshop code"
                  autoComplete="off" placeholder="Workshop code" value={workshop}
                  onChange={(event) => { setWorkshop(event.target.value); clearFeedback(); }} />
              )}
              {emailError && (
                <span id="forgot-password-email-error" className="auth-field-error" role="alert">
                  {emailError}
                </span>
              )}
              {message && !emailError && (
                <span className="auth-message is-info auth-recovery-inline-status" role="status">
                  {message}
                </span>
              )}
            </label>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Submitting…' : isMobile ? 'Request Manual Recovery' : isMagicLink ? 'Send Magic Link' : 'Send Reset Link'}
            </button>
          </form>

          {previewUrl && (
            <div className="auth-dev-link">
              <span>Development preview</span>
              <Link to={previewUrl}>{isMagicLink ? 'Open magic link' : 'Open reset link'}</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
