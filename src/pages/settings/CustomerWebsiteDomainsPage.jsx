import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {AlertCircle, Check, Copy, ExternalLink, Globe2, RefreshCw, ShieldCheck, Trash2} from 'lucide-react';
import {appConfirm} from '../../components/common/appDialogs';
import apiClient from '../../api/apiClient';
import '../../styles/customer-website-domains.css';

const providers = [
  ['godaddy', 'GoDaddy'], ['cloudflare', 'Cloudflare'],
  ['hostinger', 'Hostinger'], ['namecheap', 'Namecheap'],
  ['vercel', 'Vercel DNS'], ['other', 'Other Provider'],
];
const providerInstructions = {
  godaddy: 'GoDaddy → My Products → DNS. Add the records below under your domain, then save.',
  cloudflare: 'Cloudflare → Websites → DNS → Records. Create the records below; set the Vercel routing CNAME to DNS only (not Proxied) while validating.',
  hostinger: 'Hostinger hPanel → Domains → DNS / Nameservers → DNS Records. Create the exact records shown.',
  namecheap: 'Namecheap → Domain List → Manage → Advanced DNS. Add the exact host and value.',
  vercel: 'Vercel Dashboard → Domains. If you use Vercel DNS, ensure the domain is delegated to Vercel nameservers. This page does not change provider DNS.',
  other: 'Open your authoritative DNS provider and add the exact records below. Preserve MX, SPF, DKIM and other unrelated records.',
};
const statusLabels = {
  pending_setup: 'Pending Setup', pending_dns: 'DNS Pending',
  pending_verification: 'Verification Pending', ssl_pending: 'SSL Pending',
  active: 'Active', failed: 'Error', disabled: 'Disabled',
};
const apiBase = '/company/customer-website/domains';

function ErrorNotice({children}) {
  return children ? <div className="cwd-error" role="alert"><AlertCircle size={18}/><span>{children}</span></div> : null;
}
function DomainRecords({domain,onCopy}) {
  const records = [...(domain.dnsRecords || []), ...(domain.verificationRecords || [])];
  return <div className="cwd-records">
    <h3>Required DNS Records from Vercel</h3>
    {records.length ? <div className="cwd-records-scroll"><table>
      <thead><tr><th>Type</th><th>Host / Name</th><th>Exact Value</th><th>Copy</th></tr></thead>
      <tbody>{records.map((record,i)=><tr key={i}>
        <td><strong>{record.type}</strong></td>
        <td><code>{record.name}</code></td>
        <td><code className="cwd-record-value">{record.value}</code></td>
        <td><button type="button" className="cwd-icon" aria-label={'Copy '+record.type+' value'} onClick={()=>onCopy(record.value)}><Copy size={16}/></button></td>
      </tr>)}</tbody>
    </table></div> : <p className="cwd-help">Vercel has not returned DNS records yet. Select Retry Setup or Refresh after configuring the Customer Website project. We will not guess record values.</p>}
    <p className="cwd-help">Use @ for the domain root; other host names are relative to the DNS zone. Add any TXT ownership record exactly as shown. Do not delete unrelated email or security records.</p>
  </div>;
}

export default function CustomerWebsiteDomainsPage(){
  const [subdomain,setSubdomain]=useState('');
  const [domains,setDomains]=useState([]);
  const [hostname,setHostname]=useState('');
  const [dnsProvider,setDnsProvider]=useState('godaddy');
  const [busy,setBusy]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [history,setHistory]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const [website,rows] = await Promise.all([
        apiClient.get('/company/customer-website'),
        apiClient.get(apiBase),
      ]);
      setSubdomain(website.subdomain||'');
      setDomains(Array.isArray(rows)?rows:[]);
    }catch(e){setError(e.message||'Unable to load domain settings.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  const update=(domain)=>setDomains(old=>{
    const found=old.some(d=>d.id===domain.id);
    return found?old.map(d=>d.id===domain.id?{...d,...domain}:d):[domain,...old];
  });

  const add=async(event)=>{
    event.preventDefault();
    if(busy||!hostname.trim())return;
    setBusy('add');setError('');setNotice('');
    try{
      const domain=await apiClient.post(apiBase,{hostname:hostname.trim(),dnsProvider});
      update(domain);setHostname('');
      setNotice(domain.lastError?
        'Request recorded, but Vercel setup needs attention: '+domain.lastError:
        'Domain request submitted to Vercel. Copy the returned DNS records and verify after propagation.');
    }catch(e){setError(e.message||'Could not add this domain.');}
    finally{setBusy('');}
  };
  const domainAction=async(domain,action)=>{
    if(busy)return;
    if(action==='remove' && !await appConfirm('Disable '+domain.hostname+' and remove its Vercel assignment? The previous website address will still work.'))return;
    setBusy(domain.id+':'+action);setError('');setNotice('');
    try{
      let result;
      if(action==='remove') result=await apiClient.delete(apiBase+'/'+domain.id);
      else result=await apiClient.post(apiBase+'/'+domain.id+'/'+action,{});
      update(result);
      if(action==='primary')setDomains(old=>old.map(d=>({...d,isPrimary:d.id===domain.id})));
      setNotice(result.message || (
        action==='verify'?'Verification checked. The domain will become active only after valid HTTPS.':
        action==='primary'?'Primary Customer Website address updated.':
        action==='remove'?'Domain disabled. Existing customer data was preserved.':
        'Latest Vercel domain status retrieved.'
      ));
    }catch(e){setError(e.message||'Could not update domain.');await load();}
    finally{setBusy('');}
  };
  const viewHistory=async(domain)=>{
    if(busy)return;
    setBusy('history:'+domain.id);setError('');
    try{const detail=await apiClient.get(apiBase+'/'+domain.id);setHistory({hostname:domain.hostname,events:detail.history||[]});}
    catch(e){setError(e.message||'Unable to load change history.');}
    finally{setBusy('');}
  };
  const copy=async(value)=>{
    try{await navigator.clipboard.writeText(value);setNotice('Copied to clipboard.');}
    catch{setError('Unable to copy automatically. Select and copy the displayed value.');}
  };
  return <main className="cwd-page">
    <header className="cwd-header">
      <div><Link to="/settings/customer-website" className="cwd-back">Customer Website Settings</Link>
        <h1><Globe2 size={26}/> Custom Domains & DNS</h1>
        <p>Connect your workshop domain to the dedicated Vercel Customer Website project, without changing any existing customer data.</p></div>
      <button className="cwd-button" onClick={load} disabled={!!busy||loading}><RefreshCw size={17}/> Refresh</button>
    </header>
    <ErrorNotice>{error}</ErrorNotice>
    {notice&&<p className="cwd-notice" role="status"><Check size={17}/>{notice}</p>}
    <section className="cwd-card">
      <h2>Default CubeGears Subdomain</h2>
      <div className="cwd-default"><code>{subdomain||'Not configured'}</code><button className="cwd-icon" onClick={()=>copy('https://'+subdomain)} disabled={!subdomain} aria-label="Copy default subdomain URL"><Copy size={18}/></button></div>
      <p className="cwd-help">Your default workshop subdomain is never removed when a custom domain changes. Wildcard SSL for the CubeGears root domain requires platform-managed Vercel nameservers.</p>
    </section>
    <section className="cwd-card">
      <h2>Add Custom Domain</h2>
      <form className="cwd-form" onSubmit={add}>
        <label>Domain Name
          <input required value={hostname} onChange={e=>setHostname(e.target.value)} maxLength={253} placeholder="portal.yourworkshop.com" autoCapitalize="none" autoComplete="off" spellCheck={false}/>
        </label>
        <label>DNS Provider
          <select value={dnsProvider} onChange={e=>setDnsProvider(e.target.value)}>
            {providers.map(([value,label])=><option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <button className="cwd-button cwd-primary" disabled={!!busy} type="submit">{busy==='add'?'Adding…':'Add Domain'}</button>
      </form>
      <div className="cwd-provider-guide"><ShieldCheck size={19}/><p>{providerInstructions[dnsProvider]} DNS changes are manual and are not automatically applied by CubeGears.</p></div>
    </section>
    <section className="cwd-card">
      <h2>Workshop Domains</h2>
      {loading?<p role="status">Loading domain status…</p>:
      domains.length===0?<p className="cwd-help">No custom domain is connected yet.</p>:
      <div className="cwd-domains">{domains.map(domain=><article className="cwd-domain" key={domain.id}>
        <div className="cwd-domain-heading">
          <div><h3>{domain.hostname}</h3><p>{providers.find(([v])=>v===domain.dnsProvider)?.[1]||'DNS Provider'}</p></div>
          <span className={'cwd-status cwd-status-'+domain.status}>{statusLabels[domain.status]||domain.status}</span>
        </div>
        <div className="cwd-checks">
          <span>Ownership <b>{domain.ownershipVerified?'Verified':'Pending'}</b></span>
          <span>DNS <b>{domain.dnsConfigured?'Configured':'Pending'}</b></span>
          <span>SSL <b>{domain.sslStatus==='ready'?'HTTPS Ready':'Pending'}</b></span>
          {domain.isPrimary&&<span className="cwd-primary-tag">Primary Domain</span>}
        </div>
        {!domain.isApproved&&<p className="cwd-help">Awaiting CubeGears Super Admin approval.</p>}
        {domain.lastError&&<ErrorNotice>{domain.lastError}</ErrorNotice>}
        {domain.status!=='disabled'&&<DomainRecords domain={domain} onCopy={copy}/>}
        {domain.status!=='disabled'&&<p className="cwd-provider-guide">{providerInstructions[domain.dnsProvider]||providerInstructions.other}</p>}
        <div className="cwd-actions">
          {domain.status!=='disabled'&&<button type="button" className="cwd-button" disabled={!!busy||!domain.isApproved} onClick={()=>domainAction(domain,'refresh')}><RefreshCw size={16}/>{domain.status==='pending_setup'?'Retry Setup':'Refresh DNS / SSL'}</button>}
          {domain.status!=='disabled'&&<button type="button" className="cwd-button" disabled={!!busy||!domain.isApproved} onClick={()=>domainAction(domain,'verify')}><ShieldCheck size={16}/> Verify DNS</button>}
          {domain.status==='active'&&!domain.isPrimary&&<button type="button" className="cwd-button cwd-primary" disabled={!!busy||domain.sslStatus!=='ready'} onClick={()=>domainAction(domain,'primary')}><Check size={16}/> Set Primary</button>}
          {domain.status==='active'&&<a className="cwd-button" href={'https://'+domain.hostname} rel="noreferrer noopener" target="_blank">Open Website <ExternalLink size={16}/></a>}
          <button type="button" className="cwd-button" disabled={!!busy} onClick={()=>viewHistory(domain)}>History</button>
          {domain.status!=='disabled'&&<button type="button" className="cwd-button cwd-danger" disabled={!!busy} onClick={()=>domainAction(domain,'remove')}><Trash2 size={16}/> Remove</button>}
        </div>
      </article>)}</div>}
      {history&&<section className="cwd-history"><div className="cwd-history-head"><h3>{history.hostname} — Domain History</h3><button className="cwd-button" type="button" onClick={()=>setHistory(null)}>Close</button></div>
        {!history.events.length?<p>No recorded domain changes.</p>:<ol>{history.events.map((event,index)=><li key={index}><strong>{event.action.replaceAll('_',' ')}</strong> — {new Date(event.createdAt).toLocaleString()}</li>)}</ol>}
      </section>}
    </section>
    <p className="cwd-help">DNS changes can take time to propagate. The primary domain is updated only after Vercel ownership, DNS and valid HTTPS checks pass. If DNS is invalid, your previous working address remains available.</p>
  </main>;
}
