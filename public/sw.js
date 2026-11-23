/* NextVita — funcionamento offline.
   - Casca do app (páginas visitadas, scripts, estilos, imagens) fica no aparelho: o app abre sem internet.
   - Leituras do banco (Supabase REST, GET): rede primeiro; sem conexão, mostra a última cópia guardada.
     Essa cópia fica só neste aparelho e é apagada ao sair da conta.
   - Registros feitos sem internet (água, bebidas, refeições, atividades…) entram numa fila e são
     enviados sozinhos quando a conexão volta, com o horário real do registro quando o servidor aceita. */
const VERSION = "v4";
const SHELL = `nextvita-shell-${VERSION}`;
const STATIC = `nextvita-static-${VERSION}`;
const DATA = "nextvita-data-v1";
const SHELL_URLS = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/caredigital-icon.svg"];
const APP_ROUTES = ["/cliente", "/hidratacao", "/medicamentos", "/peso", "/treinos", "/sono", "/metricas", "/dietas", "/biblioteca-alimentar", "/suplementos", "/prontuario", "/entrar"];

// Registros que podem esperar na fila (todos com identificador próprio ou idempotentes).
const QUEUEABLE = new Set([
  "care_log_unscheduled_intake",
  "care_log_food_portion",
  "care_save_food_meal",
  "care_log_client_activity_v2",
  "care_record_water_decision",
  "care_resolve_pending_task",
]);

/* ---------- fila em IndexedDB ---------- */
function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("nextvita-offline", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction("queue", mode);
    const out = fn(t.objectStore("queue"));
    t.oncomplete = () => resolve(out && "result" in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
  });
}
const queueAdd = item => tx("readwrite", s => s.add(item));
const queueAll = () => tx("readonly", s => s.getAll());
const queueDel = id => tx("readwrite", s => s.delete(id));
const queueClear = () => tx("readwrite", s => s.clear());

async function broadcast(msg) {
  const list = await self.clients.matchAll({ includeUncontrolled: true });
  list.forEach(c => c.postMessage(msg));
}
async function queueCount() {
  try { return (await queueAll()).length; } catch { return 0; }
}

let flushing = false;
async function flush(token) {
  if (flushing) return;
  flushing = true;
  let sent = 0;
  try {
    const items = await queueAll();
    for (const item of items) {
      const headers = new Headers(item.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      let res;
      try {
        res = await fetch(item.url, { method: "POST", headers, body: item.body });
      } catch {
        break; // ainda sem conexão
      }
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 408 && res.status !== 429)) {
        // Enviado, ou recusado definitivamente pelo servidor (não adianta tentar de novo).
        await queueDel(item.id);
        if (res.ok) sent++;
      } else break;
    }
  } finally {
    flushing = false;
  }
  await broadcast({ type: "nv-offline-queue", count: await queueCount(), sent });
}

/* ---------- ciclo de vida ---------- */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL)
      .then(cache => cache.addAll(SHELL_URLS).then(() => Promise.all(APP_ROUTES.map(u => cache.add(u).catch(() => undefined)))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== SHELL && key !== STATIC && key !== DATA).map(key => caches.delete(key))))
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

function json(body, extra) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "x-nv-offline": "1", ...(extra || {}) },
  });
}

async function handleRpc(request, name) {
  const body = await request.clone().text();
  try {
    return await fetch(request);
  } catch {
    // Sem conexão: guarda para enviar depois.
    let payload = body;
    const queuedAt = new Date().toISOString();
    try {
      const obj = JSON.parse(body || "{}");
      if (name === "care_log_unscheduled_intake" && !obj.p_consumed_at) obj.p_consumed_at = queuedAt;
      payload = JSON.stringify(obj);
    } catch { /* corpo não é JSON: envia como está */ }
    const headers = {};
    request.headers.forEach((v, k) => { headers[k] = v; });
    await queueAdd({ url: request.url, headers, body: payload, name, queuedAt });
    const count = await queueCount();
    await broadcast({ type: "nv-offline-queue", count, queued: name });
    if (self.registration.sync) self.registration.sync.register("nv-flush").catch(() => undefined);
    if (name === "care_log_unscheduled_intake") return json(queuedAt);
    return json({ queued: true, offline: true, id: null, happened_at: queuedAt });
  }
}

async function handleRead(request) {
  // A chave inclui o formato pedido (lista ou objeto único) para não misturar respostas.
  const accept = request.headers.get("Accept") || "";
  const key = request.url + (request.url.includes("?") ? "&" : "?") + "__nv=" + encodeURIComponent(accept.includes("object") ? "obj" : "list");
  try {
    const res = await fetch(request);
    if (res.ok) {
      const copy = res.clone();
      caches.open(DATA).then(c => c.put(key, copy)).catch(() => undefined);
    }
    return res;
  } catch {
    const cached = await caches.open(DATA).then(c => c.match(key));
    if (cached) {
      const h = new Headers(cached.headers);
      h.set("x-nv-offline", "1");
      return new Response(await cached.blob(), { status: 200, headers: h });
    }
    return Response.error(); // nada guardado: a tela trata como falta de conexão
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Banco de dados (Supabase): leituras com cópia offline e registros com fila.
  if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/v1/")) {
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z0-9_]+)$/);
    if (request.method === "POST" && rpc && QUEUEABLE.has(rpc[1])) {
      event.respondWith(handleRpc(request, rpc[1]));
      return;
    }
    if (request.method === "GET" && request.headers.get("Authorization")) {
      event.respondWith(handleRead(request));
    }
    return;
  }

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Navegação: rede primeiro; sem conexão, abre a página guardada (ou a inicial).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => putCopy(SHELL, request, response))
        .catch(() =>
          caches.match(request, { ignoreSearch: true })
            .then(cached => cached || caches.match("/"))
            .then(cached => cached || caches.match("/offline.html")),
        ),
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/assets/") || url.pathname.startsWith("/images/") || url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/loja/") || url.pathname.startsWith("/screenshots/") || /\.(?:js|css|woff2?|webp|png|svg|jpg)$/.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.open(STATIC).then(cache =>
      cache.match(request).then(cached => {
        const network = fetch(request).then(response => putCopy(STATIC, request, response)).catch(() => cached);
        return cached || network;
      }),
    ),
  );
});

self.addEventListener("sync", event => {
  if (event.tag === "nv-flush") event.waitUntil(flush(null));
});

self.addEventListener("message", event => {
  const data = event.data;
  if (data === "skipWaiting") return void self.skipWaiting();
  if (!data || typeof data !== "object") return;
  if (data.type === "nv-flush") event.waitUntil(flush(data.token || null));
  if (data.type === "nv-count") event.waitUntil(queueCount().then(count => broadcast({ type: "nv-offline-queue", count, sent: 0 })));
  if (data.type === "nv-signed-out") event.waitUntil(Promise.all([caches.delete(DATA), queueClear().catch(() => undefined)]));
  // Pré-carrega os arquivos que a página já usou, para abrirem sem internet.
  if (data.type === "nv-warm" && Array.isArray(data.urls)) {
    event.waitUntil(caches.open(STATIC).then(c => Promise.all(data.urls.slice(0, 200).map(u => c.match(u).then(hit => hit || c.add(u).catch(() => undefined))))));
  }
});
