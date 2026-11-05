import {useCallback,useEffect,useState} from 'react';
import {AlertCircle,ArrowUpRight,Check,Copy,Globe2,Palette,RefreshCw,ShieldCheck,Trash2} from 'lucide-react';
import apiClient from '../../api/apiClient';
import '../../styles/customer-website-settings.css';

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
  const [subdomain,setSubdomain] = useState('');
  const [logo,setLogo] = useState(false);
  const [domains,setDomains] = useState([]);
  const [hostname,setHostname] = useState('');
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [requesting,setRequesting] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const load = useCallback(async ()=>{
    setLoading(true);setError('');
    try {
      const [website, domainRows] = await Promise.all([
        apiClient.get('/company/customer-website'),
        apiClient.get('/company/customer-website/domains')
      ]);
      setFields(Object.fromEntries(Object.keys(empty).map(k=>[k,website[k]??empty[k]])));
      setSubdomain(website.subdomain||'');
      setLogo(!!website.hasLogo);
      setDomains(Array.isArray(domainRows)?domainRows:[]);
    } catch(e) {setError(e.message||'Could not load your website settings.');}
    finally {setLoading(false);}
  },[]);

  useEffect(()=>{load();},[load]);

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

  async function requestDomain(event){
    event.preventDefault();
    if(requesting||!hostname.trim())return;
    setRequesting(true);setError('');setNotice('');
    try{
      const result=await apiClient.post('/company/customer-website/domains',{hostname:hostname.trim()});
      setDomains(old=>[result,...old]);
      setHostname('');
      setNotice('Domain request recorded. DNS ownership and HTTPS verification must finish before activation.');
    }catch(e){setError(e.message||'Could not submit domain request.');}
    finally{setRequesting(false);}
  }

  async function disableDomain(domain){
    if(!window.confirm('Disable this custom domain? Existing customer data will be preserved.'))return;
    setError('');setNotice('');
    try{
      await apiClient.delete('/company/customer-website/domains/'+domain.id);
      setDomains(old=>old.map(d=>d.id===domain.id?{...d,status:'disabled',isPrimary:false}:d));
      setNotice('Custom domain disabled.');
    }catch(e){setError(e.message||'Could not disable domain.');}
  }

  async function copyLink(){
    if(!subdomain)return;
    try{
      await navigator.clipboard.writeText('https://'+subdomain);
      setNotice('Default website address copied.');
    }catch{setError('Unable to copy. Please copy the address manually.');}
  }

  if(loading)return <main className="cws-page"><div className="cws-loading" role="status"><RefreshCw size={18}/>Loading Customer Website settings…</div></main>;

  return <main className="cws-page">
    <div className="cws-top">
      <div><span className="cws-eyebrow"><Globe2 size={15}/> CubeGears Customer Website</span><h1>Customer Website</h1>
        <p>Manage your workshop's public identity, website address and customer-facing branding.</p></div>
      <button type="button" className="cws-btn cws-secondary" onClick={load}><RefreshCw size={17}/>Refresh</button>
    </div>
    <ErrorMessage>{error}</ErrorMessage>
    {notice&&<div className="cws-success" role="status"><Check size={17}/>{notice}</div>}
    <div className="cws-cards">
      <section className="cws-card">
        <div className="cws-heading"><div className="cws-square"><Globe2 size={23}/></div><div><h2>Default Workshop Subdomain</h2><p>Each workshop keeps its dedicated CubeGears web address.</p></div></div>
        <div className="cws-domain-url"><span>{subdomain||'Not configured'}</span><button type="button" aria-label="Copy website URL" onClick={copyLink} disabled={!subdomain}><Copy size={17}/></button></div>
        <div className="cws-hint"><ShieldCheck size={17}/><span>Your default subdomain remains available as a fallback. Changing it requires controlled server-side migration.</span></div>
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
          <div className="cws-actions"><a className="cws-btn cws-secondary" href="/settings">Manage Workshop Logo <ArrowUpRight size={16}/></a><button type="submit" className="cws-btn cws-primary" disabled={saving}>{saving?'Saving…':'Save Branding'}</button></div>
        </form>
      </section>

      <section className="cws-card">
        <div className="cws-heading"><div className="cws-square"><Globe2 size={23}/></div><div><h2>Custom Domain</h2><p>Use your own domain after DNS ownership and HTTPS verification.</p></div></div>
        <form className="cws-domain-form" onSubmit={requestDomain}><label className="cws-field"><span>Domain Name</span>
          <input type="text" value={hostname} maxLength={253} onChange={e=>setHostname(e.target.value)} placeholder="portal.yourworkshop.com" required autoCapitalize="none" spellCheck={false}/></label>
          <button className="cws-btn cws-primary" disabled={requesting} type="submit">{requesting?'Submitting…':'Request Domain'}</button></form>
        <div className="cws-hint"><ShieldCheck size={17}/>Unverified domains never serve customer records. Exact DNS records must come from your hosting provider.</div>
        <div className="cws-domain-list">
          {!domains.length&&<p className="cws-muted">No custom domains requested yet.</p>}
          {domains.map(d=><div className="cws-domain-item" key={d.id}>
            <div><strong>{d.hostname}</strong><span className={'cws-domain-status is-'+d.status}>{d.status.replaceAll('_',' ')}</span></div>
            <div className="cws-domain-actions">{d.status==='active'&&<a href={'https://'+d.hostname} target="_blank" rel="noreferrer noopener" aria-label={'Open '+d.hostname}><ArrowUpRight size={18}/></a>}
              {d.status!=='disabled'&&<button type="button" aria-label={'Disable '+d.hostname} onClick={()=>disableDomain(d)}><Trash2 size={17}/></button>}</div>
          </div>)}
        </div>
      </section>
    </div>
  </main>;
}
