const API_ENDPOINT = 'https://api.mcsrvstat.us/2/';
const $ = id => document.getElementById(id);
function prettyJSON(obj) { return JSON.stringify(obj, null, 2); }
function setVisible(id, yes) { const el = $(id); if(!el) return; el.style.display = yes ? '' : 'none'; }

const ipInput = $('serverIp');
const checkBtn = $('checkBtn');
const resultWrap = $('result');
const statusText = $('statusText');
const motdEl = $('motd');
const versionEl = $('version');
const playersEl = $('players');
const playersList = $('playersList');
const rawJson = $('rawJson');
const faviconImg = $('faviconImg');
const latencyChip = $('latencyChip');
const autoRefresh = $('autoRefresh');
const refreshInterval = $('refreshInterval');
const favBtn = $('favBtn');
const copyJsonBtn = $('copyJsonBtn');
const downloadBtn = $('downloadBtn');
const themeBtn = $('themeBtn');
const badgeBtn = $('badgeBtn');
const embedBtn = $('embedBtn');
const checkPluginsBtn = $('checkPluginsBtn');
const downloadFaviconBtn = $('downloadFaviconBtn');
const yearEl = $('year');

yearEl.textContent = new Date().getFullYear();

let autoTimer = null;
let lastJson = null;

const FAV_KEY = 'mcstatus_favs_v1';
function getFavs(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY)||'[]'); } catch(e){return[]} }
function setFavs(f){ localStorage.setItem(FAV_KEY, JSON.stringify(f)); }
function toggleFav(ip){
  const favs = getFavs();
  const idx = favs.indexOf(ip);
  if(idx >= 0){ favs.splice(idx,1); setFavs(favs); favBtn.textContent='★ Favorite'; return false; }
  favs.push(ip); setFavs(favs); favBtn.textContent='★ Favorited'; return true;
}

themeBtn.addEventListener('click', () => {
  document.documentElement.classList.toggle('alt-theme');
  themeBtn.classList.toggle('active');
});

$('loadVideo1').addEventListener('click', ()=> {
  const src = $('video1src').value || 'assets/video1.mp4';
  const v = $('video1'); v.querySelector('source').src = src; v.load();
});
$('loadVideo2').addEventListener('click', ()=> {
  const src = $('video2src').value || 'assets/video2.mp4';
  const v = $('video2'); v.querySelector('source').src = src; v.load();
});

copyJsonBtn.addEventListener('click', async () => {
  if(!lastJson) return alert('No data to copy.');
  try { await navigator.clipboard.writeText(prettyJSON(lastJson)); alert('JSON copied to clipboard'); }
  catch(e){ alert('Copy failed: ' + e.message); }
});
downloadBtn.addEventListener('click', () => {
  if(!lastJson) return alert('No data to download.');
  const blob = new Blob([prettyJSON(lastJson)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = (ipInput.value || 'server') + '-status.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

downloadFaviconBtn.addEventListener('click', () => {
  if(!lastJson || !lastJson.icon){ return alert('No favicon available to download.'); }
  const link = document.createElement('a');
  link.href = lastJson.icon;
  link.download = (ipInput.value || 'server') + '-favicon.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
});

favBtn.addEventListener('click', () => {
  const ip = ipInput.value.trim();
  if(!ip) return alert('Enter an IP first.');
  const nowFav = toggleFav(ip);
  favBtn.textContent = nowFav ? '★ Favorited' : '★ Favorite';
});

badgeBtn.addEventListener('click', () => {
  if(!lastJson) return alert('No data yet.');
  const badge = `<img src="https://img.shields.io/badge/Server-${encodeURIComponent(lastJson.motd ? (lastJson.motd.clean || 'online') : 'unknown')}-blue?logo=minecraft" alt="Server status">`;
  prompt('Copy this HTML snippet for a badge:', badge);
});
embedBtn.addEventListener('click', () => {
  if(!lastJson) return alert('No data yet.');
  const iframe = `<iframe src="${location.origin}/embed?ip=${encodeURIComponent(ipInput.value)}" width="420" height="80" frameborder="0"></iframe>`;
  prompt('Embed code (iframe):', iframe);
});

checkPluginsBtn.addEventListener('click', () => {
  if(!lastJson) return alert('No data yet.');
  const info = lastJson.software || lastJson.version || lastJson.raw || lastJson;
  const text = JSON.stringify(info).toLowerCase();
  const common = ['essentials','worldedit','vault','spigot','paper','bukkit','fabric','forge','sponge','luckperms','protocolsupport','geyser'];
  const found = common.filter(c => text.includes(c));
  alert(found.length ? 'Possible plugins/mods detected: ' + found.join(', ') : 'No obvious plugin signatures found.');
});

async function fetchStatus(ip){
  if(!ip) throw new Error('No IP provided');
  const url = API_ENDPOINT + encodeURIComponent(ip);
  const t0 = performance.now();
  const resp = await fetch(url, {cache:'no-store'});
  const t1 = performance.now();
  const latency = Math.round(t1 - t0);
  latencyChip.textContent = `Latency: ${latency}ms`;
  if(!resp.ok) throw new Error('Status API returned ' + resp.status);
  return await resp.json();
}

function renderResult(data){
  lastJson = data;
  setVisible('result', true);
  statusText.textContent = data.online ? 'Online' : 'Offline';
  statusText.className = data.online ? 'status-online' : 'status-offline';
  motdEl.textContent = (data.motd && (data.motd.clean || data.motd.raw)) || '—';
  versionEl.textContent = data.version || (data.software && data.software.name) || '—';
  playersEl.textContent = (data.players && `${data.players.online || 0}/${data.players.max || '—'}`) || '—';
  if(data.players && Array.isArray(data.players.list) && data.players.list.length){
    playersList.innerHTML = data.players.list.map(p => `<div class="player-row">${p.name || p}</div>`).join('');
  } else { playersList.textContent = 'Not available'; }
  if(data.icon){ faviconImg.src = data.icon; faviconImg.style.display = ''; }
  else { faviconImg.src = ''; faviconImg.style.display = 'none'; }
  let otherInfo = [];
  if(data.hostname) otherInfo.push('Resolved host: ' + data.hostname);
  if(data.ip) otherInfo.push('Address: ' + data.ip);
  if(data.software) otherInfo.push('Software: ' + JSON.stringify(data.software));
  $('otherInfo').textContent = otherInfo.join(' • ') || '—';
  rawJson.textContent = prettyJSON(data);
}

async function checkHandler(){
  const ip = ipInput.value.trim();
  if(!ip) return alert('Enter a server IP or hostname.');
  try {
    checkBtn.disabled = true; checkBtn.textContent = 'Checking...';
    const data = await fetchStatus(ip);
    renderResult(data);
  } catch (err){
    console.error(err);
    setVisible('result', true);
    statusText.textContent = 'Error';
    statusText.className = 'status-offline';
    motdEl.textContent = '—';
    versionEl.textContent = '—';
    playersEl.textContent = '—';
    playersList.textContent = '—';
    rawJson.textContent = 'Error: ' + err.message;
  } finally {
    checkBtn.disabled = false; checkBtn.textContent = 'Check';
  }
}

function startAuto(){
  if(autoTimer) clearInterval(autoTimer);
  if(!autoRefresh.checked) return;
  const sec = Math.max(5, parseInt(refreshInterval.value) || 30);
  autoTimer = setInterval(() => { const ip = ipInput.value.trim(); if(ip) checkHandler(); }, sec * 1000);
}

checkBtn.addEventListener('click', checkHandler);
autoRefresh.addEventListener('change', startAuto);
refreshInterval.addEventListener('change', startAuto);
ipInput.addEventListener('keydown', e => { if(e.key === 'Enter') checkHandler(); });