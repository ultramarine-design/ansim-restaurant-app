'use strict';

// ── 업종 색상 / 표시명 ──
const CAT = {
  '한식':   {c:'#2c6a4e', label:'한식'},
  '일식':   {c:'#3a6ea5', label:'일식'},
  '중식':   {c:'#bf5a2a', label:'중식'},
  '서양식': {c:'#9a5fae', label:'서양식'},
  '기타외국식':{c:'#b8893a', label:'기타외국식'},
};
const catMeta = g => CAT[g] || {c:'#9a9486', label:(g||'기타')};

const PAGE = 80;            // 한 번에 그릴 개수
const $ = s => document.querySelector(s);
const view = $('#view');
const backBtn = $('#backBtn');
const sub = $('#sub');

const state = {
  index:null,        // index.json
  sido:null,         // {sido, slug, gus}
  rows:[],           // 현재 시도 전체 [nm,gu,gb,ad,tel,dt]
  gu:'전체',
  cat:'전체',
  q:'',
  shown:PAGE,
};

const icon = {
  search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>',
  pin:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  phone:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L17 12l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z"/></svg>',
  ext:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  photo:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M3 17l5-4 4 3 3-2 6 4"/></svg>',
};

const esc = s => (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nf = n => n.toLocaleString('ko-KR');

let toastT;
function toast(msg){
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(()=>{t.hidden = true}, 2200);
}

// 네이버 검색 링크. 식당명 + 시군구로 질의 (지침: 도로명 붙이면 빈 결과 잦음)
function naverQ(nm, gu){
  const q = (nm + ' ' + (gu||'')).trim().replace(/\s+/g,'+');
  return encodeURIComponent(q).replace(/%2B/g,'+');
}
// 통합검색(가게 정보·리뷰가 뜨는 기본 검색)
function naverUrl(nm, gu){
  return 'https://search.naver.com/search.naver?query=' + naverQ(nm, gu);
}
// 사진 검색(네이버 이미지 탭)
function naverPhotoUrl(nm, gu){
  return 'https://search.naver.com/search.naver?where=image&query=' + naverQ(nm, gu);
}

// ── 라우팅 ──
async function boot(){
  try{
    const r = await fetch('data/index.json');
    state.index = await r.json();
  }catch(e){
    view.innerHTML = '<div class="empty"><div class="ico">⚠</div><p>데이터를 불러오지 못했습니다.<br>인터넷 연결을 확인해 주세요.</p></div>';
    return;
  }
  renderHome();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}

function renderHome(){
  state.sido = null;
  backBtn.hidden = true;
  sub.textContent = '전국 농식품부 지정 식당';
  const idx = state.index;
  const cards = idx.sido.map(s =>
    `<button class="sido-card" data-slug="${s.slug}">
       <span class="nm">${esc(s.sido)}</span>
       <span class="cnt"><b>${nf(s.count)}</b>곳</span>
       <span class="arw">›</span>
     </button>`).join('');
  view.innerHTML =
    `<section class="lede fade">
       <span class="kicker">농식품부 안심식당</span>
       <h2>지역을 고르면<br><em>안심식당</em>을 찾아드립니다</h2>
       <p>전국 ${nf(idx.total)}곳. 위생과 방역 기준을 지켜 지정된 식당만 모았습니다.</p>
     </section>
     <div class="sido-grid stagger">${cards}</div>
     <p class="foot-note">자료 농림축산식품부 안심식당 공공데이터 · 기준일 ${esc(idx.updated)}</p>`;
  view.querySelectorAll('.sido-card').forEach(b =>
    b.addEventListener('click', () => openSido(b.dataset.slug)));
  window.scrollTo(0,0);
}

async function openSido(slug){
  const meta = state.index.sido.find(s => s.slug === slug);
  state.sido = meta; state.gu='전체'; state.cat='전체'; state.q=''; state.shown=PAGE;
  backBtn.hidden = false;
  sub.textContent = meta.sido + ' · ' + nf(meta.count) + '곳';
  view.innerHTML = '<div class="skeleton">'+Array(6).fill('<div class="sk"></div>').join('')+'</div>';
  window.scrollTo(0,0);
  try{
    const r = await fetch('data/'+slug+'.json');
    const d = await r.json();
    state.rows = d.rows;
  }catch(e){
    view.innerHTML = '<div class="empty"><div class="ico">⚠</div><p>지역 데이터를 불러오지 못했습니다.</p></div>';
    return;
  }
  renderRegion();
}

// 현재 필터 적용 결과
function filtered(){
  const q = state.q.trim().toLowerCase();
  return state.rows.filter(r => {
    if(state.gu !== '전체' && r[1] !== state.gu) return false;
    if(state.cat !== '전체' && r[2] !== state.cat) return false;
    if(q && !(r[0].toLowerCase().includes(q) || r[3].toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderRegion(){
  const meta = state.sido;
  // 시군구 칩
  const guChips = ['<button class="chip" data-gu="전체" aria-pressed="'+(state.gu==='전체')+'">전체<span class="n">'+nf(meta.count)+'</span></button>']
    .concat(meta.gus.map(g =>
      '<button class="chip" data-gu="'+esc(g.nm)+'" aria-pressed="'+(state.gu===g.nm)+'">'+esc(g.nm)+'<span class="n">'+nf(g.n)+'</span></button>')).join('');
  // 업종 칩 (현재 시도에 존재하는 업종만)
  const catSet = {};
  state.rows.forEach(r => { catSet[r[2]] = (catSet[r[2]]||0)+1; });
  const cats = Object.keys(catSet).sort((a,b)=>catSet[b]-catSet[a]);
  const catChips = ['<button class="cat" data-cat="전체" aria-pressed="'+(state.cat==='전체')+'">전체</button>']
    .concat(cats.map(c => {
      const m = catMeta(c);
      return '<button class="cat" data-cat="'+esc(c)+'" aria-pressed="'+(state.cat===c)+'" style="--g:'+m.c+'"><span class="dot"></span>'+esc(m.label)+'</button>';
    })).join('');

  view.innerHTML =
    `<div class="controls">
       <div class="search">
         ${icon.search}
         <input id="q" type="search" inputmode="search" enterkeyhint="search"
                placeholder="${esc(meta.sido)} 식당·주소 검색" value="${esc(state.q)}" autocomplete="off">
         <button class="clr ${state.q?'on':''}" id="clr" aria-label="지우기">×</button>
       </div>
       <div class="chips" id="guChips">${guChips}</div>
       <div class="cats" id="catChips">${catChips}</div>
     </div>
     <div id="results"></div>`;

  // 이벤트
  const qin = $('#q'), clr = $('#clr');
  qin.addEventListener('input', () => {
    state.q = qin.value; state.shown = PAGE;
    clr.classList.toggle('on', !!state.q);
    renderResults();
  });
  clr.addEventListener('click', () => { state.q=''; qin.value=''; clr.classList.remove('on'); state.shown=PAGE; renderResults(); qin.focus(); });
  $('#guChips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if(!b) return;
    state.gu = b.dataset.gu; state.shown = PAGE;
    $('#guChips').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c===b));
    b.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
    renderResults();
  });
  $('#catChips').addEventListener('click', e => {
    const b = e.target.closest('.cat'); if(!b) return;
    state.cat = b.dataset.cat; state.shown = PAGE;
    $('#catChips').querySelectorAll('.cat').forEach(c => c.setAttribute('aria-pressed', c===b));
    b.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
    renderResults();
  });

  renderResults();
}

function cardHtml(r){
  const [nm,gu,gb,ad,tel,dt] = r;
  const m = catMeta(gb);
  // 공공데이터는 휴대폰 번호를 010-****-**** 로 마스킹한다. 걸 수 없으므로 숨김.
  const dial = (tel && !tel.includes('*')) ? tel.replace(/[^0-9+]/g,'') : '';
  const telBtn = dial.length >= 8
    ? `<a class="act tel" href="tel:${esc(dial)}">${icon.phone}전화</a>`
    : '';
  return `<article class="card">
    <div class="row1">
      <h3 class="name">${esc(nm)}</h3>
      <span class="tag" style="--g:${m.c}"><span class="dot"></span>${esc(m.label)}</span>
    </div>
    <p class="addr">${icon.pin}<span>${esc(ad)||'주소 미등록'}</span></p>
    <div class="foot">
      ${telBtn}
      <a class="act photo" href="${naverPhotoUrl(nm,gu)}" target="_blank" rel="noopener">${icon.photo}사진</a>
      <a class="act naver" href="${naverUrl(nm,gu)}" target="_blank" rel="noopener">${icon.ext}네이버</a>
    </div>
  </article>`;
}

function renderResults(){
  const box = $('#results');
  const all = filtered();
  const total = all.length;
  const slice = all.slice(0, state.shown);
  const note = state.gu==='전체' ? state.sido.sido : state.sido.sido+' '+state.gu;

  let html = `<div class="meta">
      <span class="count"><b>${nf(total)}</b>곳</span>
      <span class="note">${esc(note)}${state.cat!=='전체'?' · '+esc(state.cat):''}</span>
    </div>`;

  if(total === 0){
    html += `<div class="empty"><div class="ico">🔍</div><p>조건에 맞는 안심식당이 없습니다.<br>검색어나 필터를 바꿔 보세요.</p></div>`;
    box.innerHTML = html; return;
  }
  html += '<div class="list">' + slice.map(cardHtml).join('') + '</div>';
  if(state.shown < total){
    html += `<button class="more" id="more">${nf(total-state.shown)}곳 더 보기</button>`;
  }
  box.innerHTML = html;
  const more = $('#more');
  if(more) more.addEventListener('click', () => { state.shown += PAGE; renderResults(); });
}

backBtn.addEventListener('click', renderHome);
boot();
