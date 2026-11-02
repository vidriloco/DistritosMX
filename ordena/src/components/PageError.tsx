import { Component, type ReactNode } from 'react';
import { track } from '../lib/analytics';

/** Last line of defence: if a page crashes, say so and offer a reload instead of showing a blank screen. */
export class PageError extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(e: unknown) { console.error(e); track('error_pagina', { mensaje: String(e).slice(0, 200) }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="wrap" style={{ padding: '48px 16px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
        <h1 className="h-light" style={{ margin: 0, fontSize: 30 }}>Algo no <strong>cargó bien</strong></h1>
        <p className="muted" style={{ margin: 0 }}>Puede ser una versión nueva del sitio o la conexión. Tus respuestas siguen guardadas en tu teléfono.</p>
        <button type="button" className="btn" style={{ width: 'auto' }} onClick={() => { track('error_recargar'); window.location.reload(); }}>Volver a cargar</button>
      </div>
    );
  }
}
