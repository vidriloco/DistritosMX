// Runs after `vite build`. Writes one static HTML file per route with its own title, description,
// canonical, social tags, structured data and a crawlable text version of the page inside #root
// (React replaces it on load). Also writes sitemap.xml and robots.txt.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const SITE = (process.env.VITE_SITE_URL || 'https://ordena.laciudad.mx').replace(/\/$/, '');
const contentPath = [process.env.CONTENT_JSON, '../geodjango/consulta/content/pozmvm.json', '/content/pozmvm.json'].find((p) => p && fs.existsSync(p));
if (!contentPath) throw new Error('pozmvm.json not found for the SEO build');
const data = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
let shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const first = (t, max = 158) => { const s = t.split(/(?<=\.)\s/)[0]; return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : s; };
const today = new Date().toISOString().slice(0, 10);
const cierre = new Date(data.consulta.cierre + 'T12:00:00-06:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

const org = { '@type': 'Organization', '@id': 'https://tallerdeapps.mx/#org', name: 'TallerdeApps', url: 'https://tallerdeapps.mx' };
const website = { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: '¿Qué opinas? · Consulta del Valle de México', inLanguage: 'es-MX', creator: { '@id': org['@id'] }, publisher: { '@id': org['@id'] } };
const crumbs = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + url })) });

const areas = data.areas;
const temasList = areas.map((a) => `<li><a href="${a.slug === 'quien-paga' ? '/quien-paga' : '/area/' + a.slug}">${esc(a.titulo)}</a>: ${esc(first(a.resumen, 200))}</li>`).join('');
const routes = [
  { url: '/', title: '¿Qué opinas? · Consulta pública del plan del Valle de México (POZMVM)', description: `Entiende el plan del Valle de México a 2050 por temas, responde preguntas cortas y arma tu opinión con citas para la consulta pública de SEDATU, abierta hasta el ${cierre}.`, priority: '1.0',
    body: `<h1>¿Qué opinas? Tu opinión sobre el plan del Valle de México a 2050</h1><p>El gobierno decide cómo será el Valle de México en 2050. El ${esc(data.consulta.nombre)} está en consulta pública hasta el ${cierre}. Aquí lo resumimos por tema, te preguntamos qué piensas y armamos tu carta con las páginas del documento.</p><h2>Los temas</h2><ul>${temasList}</ul>` },
  { url: '/temas', title: 'Los nueve temas del POZMVM · ¿Qué opinas?', description: 'Agua, movilidad, vivienda, residuos, riesgos, empleo, campo, gobernanza y financiamiento: cada tema con su cifra clave, sus preguntas y la página del plan.', priority: '0.9',
    body: `<h1>Los nueve temas del plan del Valle de México</h1><ul>${temasList}</ul>`, crumbs: [['Inicio', '/'], ['Temas', '/temas']] },
  ...areas.filter((a) => a.slug !== 'quien-paga').map((a) => ({
    url: '/area/' + a.slug, title: `${a.titulo}: qué propone el POZMVM · ¿Qué opinas?`, description: first(a.resumen), priority: '0.8',
    body: `<h1>${esc(a.titulo)}</h1><p>${esc(a.resumen)}</p><h2>Lo que encontró el plan</h2><ul>${a.diagnostico.map((c) => `<li>${esc(c.texto)} (p. ${c.pagina})</li>`).join('')}</ul><h2>Lo que propone</h2><ul>${a.propuestas.map((c) => `<li>${esc(c.texto)} (p. ${c.pagina})</li>`).join('')}</ul><h2>Las preguntas</h2><ul>${a.preguntas.map((q) => `<li>${esc(q.texto)}</li>`).join('')}</ul>`,
    crumbs: [['Inicio', '/'], ['Temas', '/temas'], [a.titulo, '/area/' + a.slug]],
  })),
  { url: '/quien-paga', title: '¿Quién paga el plan del Valle de México? · ¿Qué opinas?', description: 'El POZMVM no trae ninguna cifra de costo. Siete formas de recaudar, un fideicomiso común y lo que te afectaría según tu situación, con las páginas del plan.', priority: '0.9',
    body: `<h1>¿Quién paga todo esto?</h1><p>${esc(areas.find((a) => a.slug === 'quien-paga')?.resumen ?? '')}</p><h2>De dónde saldría el dinero</h2><ul>${data.financiamiento.fuentes.map((f) => `<li>${esc(f.nombre)}: ${esc(f.detalle)} (p. ${f.pagina})</li>`).join('')}</ul>`, crumbs: [['Inicio', '/'], ['¿Quién paga?', '/quien-paga']] },
  ...[['baldios', 'Impuesto al desperdicio urbano'], ['plusvalias', 'Captura de plusvalías'], ['mejoras', 'Contribución de mejoras'], ['predial-fideicomiso', 'Predial y Fideicomiso Metropolitano']].map(([slug, name]) => ({
    url: '/quien-paga/' + slug, title: `${name}: cómo funcionaría · ¿Qué opinas?`, description: `Cómo funcionaría el instrumento "${name}" que propone el POZMVM, a quién afectaría y qué puedes pedir en la consulta pública.`, priority: '0.6',
    body: `<h1>${esc(name)}</h1><p>Cómo funcionaría este instrumento del plan del Valle de México, a quién afectaría y qué puedes pedir en la consulta.</p>`, crumbs: [['Inicio', '/'], ['¿Quién paga?', '/quien-paga'], [name, '/quien-paga/' + slug]] })),
  { url: '/mi-opinion', title: 'Tu opinión para la consulta del POZMVM · ¿Qué opinas?', description: 'Tu carta para SEDATU, armada con tus respuestas y las páginas del plan que respaldan cada punto. Cópiala o envíala por correo.', priority: '0.5',
    body: `<h1>Tu opinión, lista para enviar</h1><p>Responde las preguntas de los temas y aquí aparece tu carta para enviarla a ${esc(data.consulta.correo)} antes del ${cierre}.</p>` },
  { url: '/resultados', title: 'Qué opinan otras personas sobre el POZMVM · ¿Qué opinas?', description: 'Lo más elegido por tema entre quienes han usado este sitio para opinar sobre el plan del Valle de México.', priority: '0.5',
    body: '<h1>Qué opinan otras personas</h1><p>Lo más elegido por tema entre quienes han usado este sitio. Es una muestra, no una encuesta representativa.</p>' },
];

for (const r of routes) {
  const url = SITE + (r.url === '/' ? '/' : r.url);
  const graph = [website, org, { '@type': 'WebPage', '@id': url + '#page', url, name: r.title, description: r.description, inLanguage: 'es-MX', isPartOf: { '@id': website['@id'] }, about: { '@type': 'CreativeWork', name: data.consulta.nombre, url: data.consulta.sitio } }];
  if (r.crumbs) graph.push(crumbs(r.crumbs));
  const head = [
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(r.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`, `<meta property="og:site_name" content="¿Qué opinas? · Consulta del Valle de México">`, `<meta property="og:locale" content="es_MX">`,
    `<meta property="og:title" content="${esc(r.title)}">`, `<meta property="og:description" content="${esc(r.description)}">`, `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${SITE}/og.png">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`, `<meta property="og:image:alt" content="Silueta de la Ciudad de México y el título Opine">`,
    `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:title" content="${esc(r.title)}">`, `<meta name="twitter:description" content="${esc(r.description)}">`, `<meta name="twitter:image" content="${SITE}/og.png">`,
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');
  let html = shell.replace(/<title>[\s\S]*?<\/title>/, '').replace(/<meta name="description"[^>]*>/, '');
  html = html.replace('</head>', `    ${head}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root"><main class="seo-static">${r.body}<p><a href="/temas">Ver los temas</a> · <a href="/quien-paga">¿Quién paga?</a> · <a href="/mi-opinion">Mi opinión</a></p></main></div>`);
  const out = r.url === '/' ? path.join(dist, 'index.html') : path.join(dist, r.url.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((r) => `  <url><loc>${SITE}${r.url === '/' ? '/' : r.url}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${r.priority}</priority></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`SEO: ${routes.length} routes, site ${SITE}`);
