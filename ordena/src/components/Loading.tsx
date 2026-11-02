import { TopicIcon } from './TopicIcon';

/** The site's flat indicator bars, pulsing in sequence. */
export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <span className="ld" role="status" aria-live="polite">
      <span className="ld-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <span className="ld-t">{label}</span>
    </span>
  );
}

/** Thin progress line plus an empty card with the pulsing bars, so the page does not jump when content arrives. */
export function Loading({ variant = 'page', slug, titulo, preguntas }: { variant?: 'page' | 'tema'; slug?: string; titulo?: string; preguntas?: number }) {
  if (variant === 'tema') {
    return (
      <div aria-busy="true">
        <div className="qstrip">
          {slug ? <TopicIcon slug={slug} size={44} /> : null}
          <span className="qstrip-t">
            <span className="k">{titulo ?? 'Tema'}</span>
            <strong>{preguntas ? `${preguntas} ${preguntas === 1 ? 'pregunta' : 'preguntas'} · ${Math.max(1, Math.round(preguntas * 0.6))} min` : 'Preparando'}</strong>
          </span>
        </div>
        <div className="ld-line" aria-hidden="true"><b /></div>
        <div className="qscreen"><div className="card ld-card"><Spinner label={preguntas ? `Preparando la pregunta 1 de ${preguntas}` : 'Preparando las preguntas'} /></div></div>
      </div>
    );
  }
  return (
    <div aria-busy="true">
      <div className="ld-line" aria-hidden="true"><b /></div>
      <div className="wrap ld-page"><Spinner /></div>
    </div>
  );
}
