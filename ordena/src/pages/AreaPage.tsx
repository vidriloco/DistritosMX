import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { Dots100 } from '../components/Graphics';
import { QuestionFlow } from '../components/QuestionFlow';
import { api } from '../lib/api';
import { CitaLink } from '../components/DocViewer';
import { useFetch } from '../lib/useFetch';
import { firstSentence, useSeo } from '../lib/seo';
import { Loading } from '../components/Loading';

/** Pull the first percentage or number out of a finding so it can be shown big and, for shares, drawn. */
function figureOf(texto: string): { num: string; pct: number | null } {
  const pct = texto.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pct) return { num: `${pct[1]} %`, pct: parseFloat(pct[1].replace(',', '.')) };
  const n = texto.match(/(\d+(?:[.,]\d+)?)\s*(millones|mil|h\b|horas|M\b)/i);
  if (n) return { num: `${n[1]} ${n[2]}`.replace(/\s(h|horas)$/i, ' h'), pct: null };
  const any = texto.match(/\d[\d,.]*/);
  return { num: any ? any[0] : '·', pct: null };
}

export function AreaPage() {
  const { slug = '' } = useParams();
  const { hash } = useLocation();
  const { data: area, error } = useFetch(() => api.area(slug), [slug]);
  const { data: areas } = useFetch(api.areas, []);
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  useSeo(`/area/${slug}`, area ? { title: `${area.titulo}: qué propone el POZMVM · Opine`, description: firstSentence(area.resumen) } : null);
  useEffect(() => {
    if (area && hash === '#contexto') document.getElementById('contexto')?.scrollIntoView({ behavior: 'smooth' });
  }, [area, hash]);

  if (error) return <p className="wrap error">No se pudo cargar el tema: {error}</p>;
  if (!area) { const r = areas?.find((x) => x.slug === slug); return <Loading variant="tema" slug={slug} titulo={r?.titulo} preguntas={r?.num_preguntas} />; }


  return (
    <article className="tema">
      <h1 className="sr-only">{area.titulo}</h1>
      <QuestionFlow area={area} areas={areas ?? undefined} titulo={area.titulo} />

      <div className="tema-below" id="contexto">
        <section>
          <h2 className="h-light h2">Por qué <strong>se pregunta</strong></h2>
          <div className="hallazgos">
            {area.diagnostico.map((c, i) => {
              const f = figureOf(c.texto);
              return (
                <div key={i} className="hallazgo">
                  <div>
                    <strong className="num">{f.num}</strong>
                    <p>{c.texto}</p>
                    <CitaLink pagina={c.pagina} cita={c.cita} origen="diagnostico" className="pg">POZMVM p. {c.pagina}</CitaLink>
                  </div>
                  {f.pct !== null ? <Dots100 pct={f.pct} on="var(--violet)" off="#dcd7cd" label={`${f.num} de cada 100`} /> : null}
                </div>
              );
            })}
          </div>
        </section>
        <section>
          <h2 className="h-light h2">Lo que el plan <strong>propone</strong></h2>
          <div className="ruled">
            {area.propuestas.map((c, i) => (
              <div key={i}><span>{c.texto}</span><span className="tags">{c.clave ? <span className="clave">{c.clave}</span> : null}<CitaLink pagina={c.pagina} cita={c.cita} origen="propuesta" className="pg-link" /></span></div>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
