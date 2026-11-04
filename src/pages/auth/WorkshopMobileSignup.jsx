import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Lock, Phone, UserRound } from 'lucide-react';
import { API_BASE_URL } from '../../api/apiConfig';
import '../../styles/login-system.css';

export default function WorkshopMobileSignup() {
  const [form, setForm] = useState({ workshopName: '', ownerName: '', mobile: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(null);
  const change = (key, value) => setForm((previous) => ({ ...previous, [key]:value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.workshopName.trim() || !form.ownerName.trim() ||
        !/^\+[\d\s().-]{8,22}$/.test(form.mobile.trim())) {
      setError('Enter workshop name, owner name and an international mobile number with country code.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method:'POST', credentials:'omit', referrerPolicy:'no-referrer',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({
          workshop_name:form.workshopName.trim(), owner_name:form.ownerName.trim(),
          mobile:form.mobile.trim(), ...(form.email.trim() ? {email:form.email.trim()} : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = Object.values(data || {}).flat().map(String).join(' ');
        throw new Error(details || 'Unable to register your workshop.');
      }
      setRegistered(data);
    } catch (cause) {
      setError(cause.message || 'Unable to register your workshop.');
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="login-page" data-workshop-mobile-signup>
    <div className="login-shell">
      <section className="login-card">
        <div className="login-brand-row"><div className="login-brand-mark">CG</div>
          <div><strong className="login-brand-name">CubeGears</strong>
            <span className="login-brand-subtitle">Workshop Management</span></div></div>
        {registered ? <>
          <CheckCircle2 size={32} aria-hidden="true"/>
          <h1 className="login-title">Workshop registered</h1>
          <p className="login-description">{registered.message || 'Your password invitation is pending delivery.'}</p>
          <p className="login-description">Workshop code: <strong>{registered.workshop?.slug}</strong>. Keep this code for logging in when your mobile belongs to multiple workshops.</p>
          <p className="login-description">For mobile-only accounts, an official platform WhatsApp sender must be configured to deliver your password setup link. If no message arrives, contact CubeGears support.</p>
          <Link className="login-submit" to="/login">Go to Login</Link>
        </> : <>
          <h1 className="login-title">Create a workshop</h1>
          <p className="login-description">Only a mobile number with country code is required. Email is optional. No OTP login.</p>
          {error && <div className="login-error" role="alert">{error}</div>}
          <form onSubmit={submit} className="login-form">
            <label className="block"><span className="login-field-label">Workshop Name *</span>
              <div className="login-input-shell">
                <span className="login-input-icon"><Building2 size={16}/></span>
                <input className="login-input" type="text" required maxLength={180}
                  value={form.workshopName} onChange={(e) => change('workshopName',e.target.value)}
                  placeholder="Your car workshop"/></div></label>
            <label className="block"><span className="login-field-label">Owner Full Name *</span>
              <div className="login-input-shell"><span className="login-input-icon"><UserRound size={16}/></span>
                <input className="login-input" type="text" required maxLength={150}
                  value={form.ownerName} onChange={(e) => change('ownerName',e.target.value)}
                  placeholder="Workshop owner name"/></div></label>
            <label className="block"><span className="login-field-label">Mobile Number with Country Code *</span>
              <div className="login-input-shell"><span className="login-input-icon"><Phone size={16}/></span>
                <input className="login-input" type="tel" required autoComplete="tel" inputMode="tel"
                  value={form.mobile} onChange={(e) => change('mobile',e.target.value)}
                  placeholder="+919876543210"/></div></label>
            <label className="block"><span className="login-field-label">Email (optional)</span>
              <div className="login-input-shell"><span className="login-input-icon"><Lock size={16}/></span>
                <input className="login-input" type="email" autoComplete="email"
                  value={form.email} onChange={(e) => change('email',e.target.value)}
                  placeholder="name@example.com"/></div></label>
            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Creating workshop…' : 'Register Workshop'}
            </button>
          </form>
          <p className="login-description">Already registered? <Link to="/login">Sign in</Link></p>
        </>}
      </section>
    </div>
  </main>;
}
