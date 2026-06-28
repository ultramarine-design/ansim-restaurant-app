// 안심식당 서비스워커 — 앱 셸 + 받은 지역 데이터 오프라인 캐시
const SHELL = 'ansim-shell-v2';
const DATA  = 'ansim-data-v2';
const SHELL_FILES = [
  './', './index.html', './app.css', './app.js',
  './manifest.webmanifest', './data/index.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== SHELL && k !== DATA).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET' || url.origin !== location.origin) return;

  // 지역 데이터: 캐시 우선, 없으면 받아서 저장 (오프라인 재방문 대비)
  if(url.pathname.includes('/data/sido-')){
    e.respondWith(
      caches.open(DATA).then(c => c.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; })
      ))
    );
    return;
  }
  // 앱 셸: 캐시 우선, 네트워크 폴백
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
