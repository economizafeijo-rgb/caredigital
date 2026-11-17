/* NextVita — app shell.
   - A casca do app (ícones, manifesto, tela de apoio e a própria página inicial) é guardada no aparelho,
     então o app abre na hora e mostra a interface mesmo com conexão ruim.
   - Arquivos estáticos (scripts, estilos, imagens) usam cache com atualização em segundo plano.
   - Dados de saúde (Supabase e demais origens) NUNCA são guardados: sempre vêm da rede. */
const VERSION = "v3";
const SHELL = `nextvita-shell-${VERSION}`;
const STATIC = `nextvita-static-${VERSION}`;
const SHELL_URLS = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/caredigital-icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL).then(cache => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== SHELL && key !== STATIC).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function putCopy(cacheName, request, response) {
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(cacheName).then(cache => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase e terceiros: sempre rede, sem cache

  // Navegação: rede primeiro (dados e versão novos); sem conexão, abre a casca guardada.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => putCopy(SHELL, request, response))
        .catch(() => caches.match(request).then(cached => cached || caches.match("/")).then(cached => cached || caches.match("/offline.html"))),
    );
    return;
  }

  const isStatic = url.pathname.startsWith("/assets/") || url.pathname.startsWith("/images/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/loja/") || url.pathname.startsWith("/screenshots/");
  if (!isStatic) return;

  // Estáticos: mostra o cache na hora e atualiza em segundo plano (stale-while-revalidate).
  event.respondWith(
    caches.open(STATIC).then(cache =>
      cache.match(request).then(cached => {
        const network = fetch(request).then(response => putCopy(STATIC, request, response)).catch(() => cached);
        return cached || network;
      }),
    ),
  );
});

self.addEventListener("message", event => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
