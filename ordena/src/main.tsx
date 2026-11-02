import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import App from './App';
import { PageError } from './components/PageError';
import { lazyPage } from './lib/lazyPage';
import { DocViewerProvider } from './components/DocViewer';
import '@fontsource-variable/inter-tight';
import './index.css';
import { AreaPage } from './pages/AreaPage';
import { Inicio } from './pages/Inicio';
import { Temas } from './pages/Temas';
import { Loading } from './components/Loading';
import { initAnalytics } from './lib/analytics';

const Instrumento = lazyPage(() => import('./pages/Instrumento').then((m) => m.Instrumento));
const QuienPaga = lazyPage(() => import('./pages/QuienPaga').then((m) => m.QuienPaga));
const Resumen = lazyPage(() => import('./pages/Resumen').then((m) => m.Resumen));
const Resultados = lazyPage(() => import('./pages/Resultados').then((m) => m.Resultados));
const fallback = <Loading />;
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DocViewerProvider>
      <Routes>
        <Route element={<PageError><App /></PageError>}>
          <Route index element={<Inicio />} />
          <Route path="temas" element={<Temas />} />
          <Route path="area/:slug" element={<AreaPage />} />
          <Route path="quien-paga" element={<Suspense fallback={fallback}><QuienPaga /></Suspense>} />
          <Route path="quien-paga/:slug" element={<Suspense fallback={fallback}><Instrumento /></Suspense>} />
          <Route path="mi-opinion" element={<Suspense fallback={fallback}><Resumen /></Suspense>} />
          <Route path="resultados" element={<Suspense fallback={fallback}><Resultados /></Suspense>} />
        </Route>
      </Routes>
      </DocViewerProvider>
    </BrowserRouter>
  </StrictMode>,
);
