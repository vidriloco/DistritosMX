import { TOPIC_COLOR, TOPIC_ICON } from '../lib/topics';

/** Line icon for a topic on a tile in the topic's own color. */
export function TopicIcon({ slug, size = 48 }: { slug: string; size?: number }) {
  const c = TOPIC_COLOR[slug] ?? { bg: 'var(--violet)', soft: '#c9b8ff' };
  return (
    <span className="topic-icon" aria-hidden="true" style={{ width: size, height: size, background: c.bg, color: c.soft }}>
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d={TOPIC_ICON[slug] ?? ''} /></svg>
    </span>
  );
}
