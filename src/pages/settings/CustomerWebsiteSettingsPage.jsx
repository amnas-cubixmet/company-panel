import {useEffect,useState} from 'react';
import { appConfirm } from '../../components/common/appDialogs';
import {AlertCircle,ArrowUpRight,Check,Copy,Globe2,Palette,RefreshCw,ShieldCheck} from 'lucide-react';
import apiClient from '../../api/apiClient';
import { customerWebsiteAddresses, isLocalCustomerWebsiteDevelopment } from '../../utils/customerWebsiteAddresses';
import '../../styles/customer-website-settings.css';

const addressEndpoint = '/company/customer-website/subdomain';
const validLabel = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const labelHint = 'Use 3–63 letters, numbers or hyphens. Start and end with a letter or number.';
const empty = {
  public_name:'', description:'', welcome_message:'', contact_phone:'',
  whatsapp_phone:'', primary_color:'#116f69', secondary_color:'#e4f2ec'
};
const labels = {
  public_name:'Public Workshop Name', description:'Website Description',
  welcome_message:'Welcome Message', contact_phone:'Contact Number',
  whatsapp_phone:'WhatsApp Number', primary_color:'Primary Brand Color',
  secondary_color:'Secondary Brand Color'
};

function ErrorMessage({children}) {
  return children ? <div className="cws-error" role="alert"><AlertCircle size={16}/>{children}</div> : null;
}

export default function CustomerWebsiteSettingsPage(){
  const [fields,setFields] = useState(empty);
  const [address,setAddress] = useState(null);
  const [availability,setAvailability] = useState(null);
  const [enabledDraft,setEnabledDraft] = useState(true);
  const [subdomainDraft,setSubdomainDraft] = useState('');
  const [subdomainSaving,setSubdomainSaving] = useState(false);
  const [subdomainError,setSubdomainError] = useState(null);
  const [logo,setLogo] = useState(false);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const [reload,setReload] = useState(0);
  useEffect(()=>{
    const controller = new AbortController();
    apiClient.get('/company/customer-website', {signal:controller.signal}).then(website=>{
      if(controller.signal.aborted)return;
      setFields(Object.fromEntries(Object.keys(empty).map(k=>[k,website[k]??empty[k]])));
      setAddress(website);
      setEnabledDraft(website.websiteEnabled!==false);
      setSubdomainDraft(website.subdomainLabel||'');
      setAvailability(null);
      setLogo(!!website.hasLogo);
    }).catch(error=>{
      if(controller.signal.aborted)return;
      setAddress(null);
      setError(error.message||'Could not load your website settings.');
    }).finally(()=>{
      if(!controller.signal.aborted)setLoading(false);
    });
    return ()=>controller.abort();
  },[reload]);

  const subdomainLabel = address?.subdomainLabel || '';
  const wildcardReady = address?.wildcardReady === true;
  const label = subdomainDraft.trim().toLowerCase();
  const changingLabel = label !== subdomainLabel;
  const changingPublication = enabledDraft !== (address?.websiteEnabled !== false);
  const labelValid = validLabel.test(label);
  const check = availability?.label === label ? availability : null;

  useEffect(()=>{
    if(!subdomainLabel || !changingLabel || !labelValid)return;
    const controller=new AbortController();
    const timer=setTimeout(async ()=>{
      try{
        const result=await apiClient.get(addressEndpoint,{params:{label},signal:controller.signal});
        if(!controller.signal.aborted)setAvailability(result);
      }catch(e){
        if(!controller.signal.aborted)setAvailability({label,error:e.fieldErrors?.label||e.message});
      }
    },300);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[subdomainLabel,changingLabel,labelValid,label]);

  const update=(key,value)=>{
    setFields(old=>({...old,[key]:value}));
    setNotice('');
  };

  async function save(event){
    event.preventDefault();
    if(saving)return;
    setSaving(true);setError('');setNotice('');
    try {
      const saved=await apiClient.patch('/company/customer-website',fields);
      setFields(old=>({...old,...saved}));
      setNotice('Website branding saved. The updated settings will appear on your Customer Website.');
    }catch(e){setError(e.message||'Unable to save settings.');}
    finally{setSaving(false);}
  }

  async function updateDefaultSubdomain(event){
    event.preventDefault();
    if(subdomainSaving || !address || (!changingLabel && !changingPublication) ||
      (changingLabel && check?.available!==true))return;
    setSubdomainSaving(true);setSubdomainError(null);setNotice('');
    try{
      if(changingLabel && subdomainLabel && !await appConfirm(
        'Change your website address? The previous subdomain will be retired. Reissue any links that use it.'
      ))return;

      const changed=await apiClient.patch(addressEndpoint,{
        ...(changingLabel ? {label} : {}),
        ...(changingPublication ? {websiteEnabled:enabledDraft} : {}),
      });
      setAddress(changed);
      setSubdomainDraft(changed.subdomainLabel);
      setEnabledDraft(changed.websiteEnabled);
      setAvailability(null);
      const publicationMessage=changed.websiteEnabled?'Website enabled.':'Website disabled.';
      setNotice([changed.message,changingPublication?publicationMessage:''].filter(Boolean).join(' '));
    }catch(e){
      if(e?.data?.suggestedLabel)setAvailability({label,available:false});
      setSubdomainError({
        message:e?.fieldErrors?.label||e?.message||'Could not save the website settings.',
        suggestion:e?.data?.suggestedLabel,
      });
    }finally{setSubdomainSaving(false);}
  }

  const urls = customerWebsiteAddresses({
    ...address, subdomainLabel, wildcardReady,
    localDevelopment: isLocalCustomerWebsiteDevelopment(
      import.meta.env.DEV, window.location.hostname
    ),
    localOrigin: import.meta.env.VITE_CUSTOMER_WEBSITE_DEV_ORIGIN || '',
  });
  const websiteUrl = urls.displayUrl;
  const message = subdomainError?.message || check?.error ||
    (changingLabel && !labelValid ? labelHint : '');
  const suggestion = subdomainError?.suggestion || check?.suggestedLabel;

  function updateDraft(value){
    setSubdomainDraft(value.toLowerCase());
    setSubdomainError(null);
    if(value.trim().toLowerCase()!==label)setAvailability(null);
  }

  async function copyLink(){
    if(!websiteUrl)return;
    try{
      await navigator.clipboard.writeText(websiteUrl);
      setNotice(urls.isLocalPreview ? 'Local website address copied.' : 'Website address copied.');
    }catch{setError('Unable to copy. Please copy the address manually.');}
  }

  if(loading)return <main className="cws-page"><div className="cws-loading" role="status"><RefreshCw size={18}/>Loading Customer Website settings…</div></main>;

  return <main className="cws-page">
    <div className="cws-top">
      <div><span className="cws-eyebrow"><Globe2 size={15}/> CubixGear Customer Website</span><h1>Customer Website</h1>
        <p>Manage your workshop's public identity, website address and customer-facing branding.</p></div>
      <button type="button" className="cws-btn cws-secondary" onClick={()=>{setLoading(true);setError('');setSubdomainError(null);setReload(count=>count+1);}} disabled={subdomainSaving||saving}><RefreshCw size={17}/>Refresh</button>
    </div>
    <ErrorMessage>{error}</ErrorMessage>
    {notice&&<div className="cws-success" role="status"><Check size={17}/>{notice}</div>}
    <div className="cws-cards">
      <section className="cws-card">
        <div className="cws-heading"><div className="cws-square"><Globe2 size={23}/></div><div><h2>Your Customer Website</h2><p>Visitors see your workshop website at the domain root.</p></div></div>
        <div className="cws-domain-url">
          <span>{websiteUrl || 'Website domain not configured'}</span>
          <button type="button" aria-label="Copy website URL" onClick={copyLink} disabled={!websiteUrl}><Copy size={17}/></button>
        </div>
        {urls.isLocalPreview&&<p className="cws-local-domain-info">
          <strong>Local development website</strong>
          <span>Production address: {urls.productionUrl || 'Not configured'} {wildcardReady ? '' : '(DNS / HTTPS activation pending)'}</span>
        </p>}
        <div className="cws-actions">
          {urls.canOpen&&websiteUrl&&<a className="cws-btn cws-primary" href={websiteUrl} target="_blank" rel="noopener noreferrer">Open Website <ArrowUpRight size={16}/></a>}
        </div>
        {address&&<form className="cws-subdomain-form" onSubmit={updateDefaultSubdomain}>
          <label className="cws-field"><span>Website Subdomain</span>
            <div className="cws-subdomain-field">
              <input type="text" value={subdomainDraft} maxLength={63} required
                autoCapitalize="none" spellCheck={false} disabled={subdomainSaving}
                aria-label="Default website subdomain name"
                aria-invalid={Boolean(message || check?.available===false)}
                aria-describedby="website-subdomain-status website-subdomain-hint"
                onChange={event=>updateDraft(event.target.value)}/>
              <span>{address.baseDomain ? '.'+address.baseDomain : urls.suffix}</span>
            </div>
          </label>
          <label className="cws-publication">
            <input type="checkbox" checked={enabledDraft} disabled={subdomainSaving}
              onChange={event=>{setEnabledDraft(event.target.checked);setSubdomainError(null);}}/>
            Website enabled
          </label>
          <div id="website-subdomain-status" role="status">
            {message ? <ErrorMessage>{message}</ErrorMessage> : changingLabel && labelValid &&
              (check?.available===true ? 'Subdomain available.' :
                check?.available===false ? 'Subdomain unavailable.' : 'Checking availability…')}
          </div>
          {suggestion&&<button type="button" className="cws-btn cws-secondary" disabled={subdomainSaving}
            onClick={()=>updateDraft(suggestion)}>Use {suggestion}</button>}
          <small id="website-subdomain-hint">Disabling your site pauses public pages and customer tracking links.</small>
          <button type="submit" className="cws-btn cws-primary"
            disabled={subdomainSaving||(!changingLabel&&!changingPublication)||
              (changingLabel&&check?.available!==true)}>
            {subdomainSaving?'Saving…':'Save Website Address'}
          </button>
        </form>}
        {address&&!wildcardReady&&<p className="cws-warning" role="status">
          Production address reserved in CubeGears. Platform DNS and HTTPS verification is pending.
        </p>}
        <div className="cws-hint"><ShieldCheck size={17}/><span>
          {urls.isLocalPreview
            ? 'Local preview uses your saved workshop subdomain. Production DNS/HTTPS verification is separate.'
            : 'Using default subdomain. DNS and HTTPS must be live before the website opens publicly.'}
        </span></div>
      </section>

      <section className="cws-card">
        <div className="cws-heading"><div className="cws-square"><Palette size={23}/></div><div><h2>Website Branding</h2><p>Changes will appear across your customer-facing pages.</p></div></div>
        <form onSubmit={save}>
          <div className="cws-form-grid">
            {['public_name','welcome_message','contact_phone','whatsapp_phone'].map(key=><label className="cws-field" key={key}><span>{labels[key]}</span>
              <input name={key} value={fields[key]} maxLength={key==='public_name'?180:key==='welcome_message'?240:30} onChange={e=>update(key,e.target.value)} placeholder={labels[key]}/></label>)}
            <label className="cws-field cws-wide"><span>{labels.description}</span><textarea rows={3} name="description" maxLength={500} value={fields.description} onChange={e=>update('description',e.target.value)} placeholder="Describe your workshop and services."/></label>
            {['primary_color','secondary_color'].map(key=><label className="cws-field" key={key}><span>{labels[key]}</span><div className="cws-color"><input type="color" value={/^#[0-9a-f]{6}$/i.test(fields[key])?fields[key]:empty[key]} aria-label={labels[key]+' picker'} onChange={e=>update(key,e.target.value)}/>
              <input value={fields[key]} name={key} pattern="#[0-9A-Fa-f]{6}" maxLength={7} onChange={e=>update(key,e.target.value)} aria-label={labels[key]+' HEX value'}/></div></label>)}
          </div>
          <div className="cws-preview" style={{'--cws-preview':/^#[0-9a-f]{6}$/i.test(fields.primary_color)?fields.primary_color:'#116f69'}}>
            <div className="cws-preview-logo">{logo?'LOGO':'CG'}</div><div><small>Website Preview</small><h3>{fields.public_name||'Your Workshop'}</h3><p>{fields.welcome_message||fields.description||'Your service updates, all in one place.'}</p></div>
          </div>
          <div className="cws-actions"><a className="cws-btn cws-secondary" href="/settings">Manage Workshop Logo <ArrowUpRight size={16}/></a><button type="submit" className="cws-btn cws-primary" disabled={saving||!address}>{saving?'Saving…':'Save Branding'}</button></div>
        </form>
      </section>

    </div>
  </main>;
}
