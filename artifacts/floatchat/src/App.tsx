import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  ChevronRight,
  Database,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  Send,
  Waves,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type FloatRecord = {
  id: string;
  type: string;
  lat: string;
  lon: string;
  depth: string;
  temp: string;
  salinity: string;
  status: string;
  x: string;
  y: string;
};

const floats: FloatRecord[] = [
  { id: 'WMO 2902746', type: 'BGC-ARGO', lat: '14.22° S', lon: '68.90° E', depth: '1,997 m', temp: '26.4°C', salinity: '35.21 PSU', status: 'transmitting', x: '37%', y: '44%' },
  { id: 'WMO 2902751', type: 'ARGO', lat: '4.88° S', lon: '77.30° E', depth: '1,802 m', temp: '27.1°C', salinity: '35.04 PSU', status: 'transmitting', x: '55%', y: '38%' },
  { id: 'WMO 2902838', type: 'BGC-ARGO', lat: '8.62° S', lon: '84.18° E', depth: '1,005 m', temp: '26.8°C', salinity: '34.88 PSU', status: 'surfacing', x: '67%', y: '52%' },
  { id: 'WMO 2902914', type: 'ARGO', lat: '18.04° S', lon: '73.81° E', depth: '1,454 m', temp: '24.9°C', salinity: '35.48 PSU', status: 'transmitting', x: '45%', y: '67%' },
  { id: 'WMO 2903012', type: 'BGC-ARGO', lat: '2.17° S', lon: '91.44° E', depth: '742 m', temp: '28.0°C', salinity: '34.77 PSU', status: 'delayed', x: '78%', y: '30%' },
];

const stages = [
  { title: 'Intent mapped', detail: 'The question is translated into a spatio-temporal search: Indian Ocean · upper 500 m · 2018–2024 · oxygen minimum signal.', data: ['4 dimensions', '2 constraints', '0.8s'], progress: 22 },
  { title: 'Float field narrowed', detail: 'Float trajectories intersecting the Arabian Sea oxygen minimum zone are being ranked against quality-controlled observations.', data: ['127 floats', '8,402 profiles', '96.4% QC'], progress: 48 },
  { title: 'Signal compared', detail: 'Temperature, salinity, dissolved oxygen and chlorophyll-a are aligned to reveal the seasonal structure beneath monsoon mixing.', data: ['42 variables', '3 seasons', '11 anomalies'], progress: 76 },
  { title: 'Answer grounded', detail: 'The result is ready with citations to profile IDs, retrieval timestamps and the exact measurements that support the claim.', data: ['6 sources', '14 passages', 'ready'], progress: 100 },
];

const suggestions = [
  'Show oxygen minimum zones in 2022',
  'Compare salinity near Seychelles',
  'Which floats crossed a cyclone path?',
];

function useReveal() {
  return {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.22 },
    transition: { duration: 0.7, ease: 'easeOut' as const },
  };
}

function Home() {
  const reveal = useReveal();
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [filter, setFilter] = useState('All floats');
  const [selectedFloat, setSelectedFloat] = useState<FloatRecord>(floats[0]);
  const [depth, setDepth] = useState(210);
  const [activeStage, setActiveStage] = useState(2);

  const visibleFloats = useMemo(() => {
    if (filter === 'BGC-ARGO') return floats.filter((float) => float.type === 'BGC-ARGO');
    if (filter === 'ARGO') return floats.filter((float) => float.type === 'ARGO');
    return floats;
  }, [filter]);

  const submitQuery = (event?: FormEvent) => {
    event?.preventDefault();
    const cleanQuery = query.trim() || suggestions[0];
    setQuery(cleanQuery);
    setAnswer(`Across 127 quality-controlled profiles, the strongest signal appears between 8°–14° N at ${depth} m. Dissolved oxygen is 18% below the 2010–2020 seasonal baseline, with the anomaly tracking west along the monsoon current.`);
  };

  const chooseSuggestion = (value: string) => {
    setQuery(value);
    setAnswer('');
  };

  return (
    <main className="fc-page">
      <nav className="fc-nav" aria-label="Primary navigation">
        <a className="fc-brand" href="#top" data-testid="link-home">
          <span className="brand-mark" aria-hidden="true" />
          FloatChat
        </a>
        <div className="nav-links">
          <a href="#query" data-testid="link-query">Ask the ocean</a>
          <a href="#atlas" data-testid="link-atlas">Atlas</a>
          <a href="#descent" data-testid="link-descent">Profiles</a>
          <a href="#graph" data-testid="link-graph">Knowledge graph</a>
        </div>
        <div className="nav-live"><span className="live-dot" /> Live field / 14:32 UTC</div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-abyss" />
        <div className="hero-orbit" aria-hidden="true">
          <div className="float-swarm"><i className="float-node" /><i className="float-node" /><i className="float-node" /><i className="float-node" /><i className="float-node" /></div>
        </div>
        <motion.div className="hero-content" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: .15 }}>
          <div className="eyebrow"><span className="eyebrow-line" /> Indian Ocean / 4D intelligence</div>
          <h1>The ocean<br /><em>is the interface.</em></h1>
          <p className="hero-copy">FloatChat turns thousands of drifting instruments into a living field of evidence. Ask a question. Descend through the measurements. Follow the signal until it becomes clear.</p>
          <div className="hero-actions">
            <a className="btn-primary" href="#query" data-testid="link-begin-exploration">Begin an exploration <ArrowDown size={14} /></a>
            <a className="btn-ghost" href="#atlas" data-testid="link-open-atlas">Open the atlas <ArrowUpRight size={14} /></a>
          </div>
        </motion.div>
        <div className="hero-meta"><span>12.4m observations indexed / v0.7.2</span><div className="scroll-cue"><span /> descend to query</div></div>
      </section>

      <motion.section className="section query-section" id="query" {...reveal}>
        <div className="section-kicker">01 / conversational retrieval</div>
        <h2 className="section-title">Start with a hunch.<br /><span>Leave with a field of evidence.</span></h2>
        <p className="section-intro">FloatChat resolves natural language against trajectories, profiles, climatologies and peer-reviewed context. Nothing is returned without its coordinates.</p>
        <div className="query-layout">
          <form className="query-console" onSubmit={submitQuery}>
            <div className="console-head"><span><Search size={12} /> query console</span><span className="console-signal">● grounded mode</span></div>
            <div className="query-input-wrap">
              <input className="query-input" aria-label="Ask FloatChat a question" data-testid="input-ocean-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask about a place, depth, or signal…" />
              <button className="query-send" type="submit" aria-label="Submit ocean query" data-testid="button-submit-query"><Send size={20} /></button>
            </div>
            <div className="suggestions">
              {suggestions.map((suggestion) => <button className="suggestion" type="button" key={suggestion} onClick={() => chooseSuggestion(suggestion)} data-testid={`button-suggestion-${suggestion.slice(0, 8).replaceAll(' ', '-').toLowerCase()}`}>{suggestion}</button>)}
            </div>
            <AnimatePresence mode="wait">
              {answer && <motion.p className="query-answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="text-query-answer"><strong>Signal found.</strong> {answer} <br /><span>Sources: WMO 2902746 · WMO 2902751 · Indian Ocean Atlas 2023</span></motion.p>}
            </AnimatePresence>
          </form>
          <aside className="query-side">
            <h3>What gets searched</h3>
            <div className="source-list">
              <div className="source-item"><Database size={14} className="source-icon" /><span>ARGO &amp; BGC-ARGO<br />12,403,822 profiles</span></div>
              <div className="source-item"><Waves size={14} className="source-icon" /><span>Multi-parameter field<br />T / S / O₂ / Chl-a</span></div>
              <div className="source-item"><Activity size={14} className="source-icon" /><span>Climatologies &amp; events<br />1998 — present</span></div>
              <div className="source-item"><Radio size={14} className="source-icon" /><span>Live ingestion<br />last packet 14:31 UTC</span></div>
            </div>
          </aside>
        </div>
      </motion.section>

      <motion.section className="section atlas" id="atlas" {...reveal}>
        <div className="atlas-head">
          <div><div className="section-kicker">02 / living atlas</div><h2 className="section-title">Every dot is<br /><span>an instrument in motion.</span></h2></div>
          <div className="atlas-controls" role="group" aria-label="Float type filters">
            {['All floats', 'BGC-ARGO', 'ARGO'].map((option) => <button className={`filter-btn ${filter === option ? 'active' : ''}`} type="button" key={option} onClick={() => setFilter(option)} data-testid={`button-filter-${option.toLowerCase().replace('-', '')}`}>{option}</button>)}
            <button className="filter-btn" type="button" onClick={() => setIsPlaying((playing) => !playing)} data-testid="button-toggle-atlas">{isPlaying ? <Pause size={12} /> : <Play size={12} />} {isPlaying ? 'Pause field' : 'Play field'}</button>
          </div>
        </div>
        <p className="section-intro">A 30-day trace of the Indian Ocean observing network. Select a float to inspect its latest transmission and profile state.</p>
        <div className="atlas-map" data-testid="visual-float-atlas">
          <div className="map-coast" aria-hidden="true" /><div className="track one" /><div className="track two" /><div className="track three" />
          <span className="map-label indian">INDIAN OCEAN</span><span className="map-label arabian">ARABIAN SEA</span><span className="map-label bay">BAY OF BENGAL</span><span className="map-label sumatra">SUMATRA</span>
          {visibleFloats.map((float) => <button className={`map-float ${selectedFloat.id === float.id ? 'selected' : ''}`} type="button" key={float.id} data-id={float.id.slice(4)} style={{ left: float.x, top: float.y }} onClick={() => setSelectedFloat(float)} aria-label={`Inspect ${float.id}`} data-testid={`button-float-${float.id.slice(4)}`} />)}
          <AnimatePresence mode="wait">
            <motion.div className="float-card" key={selectedFloat.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} data-testid="card-selected-float">
              <h3>{selectedFloat.id}</h3><p>{selectedFloat.type} / {selectedFloat.status}</p>
              <dl><div><dt>position</dt><dd>{selectedFloat.lat}<br />{selectedFloat.lon}</dd></div><div><dt>pressure</dt><dd>{selectedFloat.depth}</dd></div><div><dt>temperature</dt><dd>{selectedFloat.temp}</dd></div><div><dt>salinity</dt><dd>{selectedFloat.salinity}</dd></div></dl>
            </motion.div>
          </AnimatePresence>
          <div className="map-legend"><span className="legend-item"><i className="legend-dot" /> transmitting</span><span className="legend-item"><i className="legend-dot orange" /> selected</span><span className="legend-item">{visibleFloats.length} visible</span></div>
        </div>
      </motion.section>

      <motion.section className="section descent" id="descent" {...reveal}>
        <div className="section-kicker">03 / vertical section</div>
        <h2 className="section-title">Scroll is a descent.<br /><span>Depth changes the story.</span></h2>
        <p className="section-intro">Scrub through a single BGC-ARGO profile. Thermal layers, haloclines and oxygen shadows emerge as the surface falls away.</p>
        <div className="descent-grid">
          <div className="depth-ruler" aria-label="Profile depth scale">
            {[0, 100, 200, 300, 400, 500, 600, 700].map((mark) => <span className={`depth-mark ${Math.abs(depth - mark) < 80 ? 'active' : ''}`} key={mark} style={{ top: `${(mark / 700) * 100}%` }}>{mark} m</span>)}
          </div>
          <div className="profile-visual" data-testid="visual-depth-profile">
            <div className="profile-area" /><div className="profile-line" />
            <div className="profile-readout"><strong>{depth} m</strong> temperature {depth > 450 ? '12.8' : '26.4'} °C<br />oxygen {depth > 450 ? '78' : '214'} μmol kg⁻¹</div>
          </div>
          <aside className="profile-note">
            <h3>Upper ocean<br />to oxygen shadow.</h3>
            <p>Profile WMO 2902746 · 18 Sep 2024. Drag the section marker to read the water column as an instrument does.</p>
            <input className="depth-slider" type="range" min="0" max="700" step="10" value={depth} onChange={(event) => setDepth(Number(event.target.value))} aria-label="Profile depth" data-testid="input-depth-slider" />
            <div className="metric-row"><span>temperature</span><b>{depth > 450 ? '12.8' : '26.4'} °C</b></div>
            <div className="metric-row"><span>salinity</span><b>{depth > 450 ? '35.46' : '34.91'} PSU</b></div>
            <div className="metric-row"><span>oxygen anomaly</span><b className="console-signal">{depth > 450 ? '−18.2%' : '+4.1%'}</b></div>
          </aside>
        </div>
      </motion.section>

      <motion.section className="section stages" id="stages" {...reveal}>
        <div className="section-kicker">04 / retrieval trace</div>
        <h2 className="section-title">Watch the answer<br /><span>earn its certainty.</span></h2>
        <div className="stages-layout">
          <div className="stage-list" role="tablist" aria-label="Retrieval stages">
            {stages.map((stage, index) => <button className={`stage-item ${index === activeStage ? 'active' : ''}`} type="button" role="tab" aria-selected={index === activeStage} key={stage.title} onClick={() => setActiveStage(index)} data-testid={`button-stage-${index + 1}`}><span className="stage-index">0{index + 1}</span><span className="stage-name">{stage.title}</span><ChevronRight size={16} /></button>)}
          </div>
          <AnimatePresence mode="wait">
            <motion.div className="stage-detail" key={activeStage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid="panel-retrieval-stage">
              <h3>{stages[activeStage].title}</h3><p>{stages[activeStage].detail}</p>
              <div className="progress-bar"><span style={{ width: `${stages[activeStage].progress}%` }} /></div><div className="progress-caption"><span>retrieval trace</span><span>{stages[activeStage].progress}%</span></div>
              <div className="stage-data">{stages[activeStage].data.map((value, index) => <div key={value}><b>{value}</b><span>{['scope', 'records', 'latency'][index]}</span></div>)}</div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>

      <motion.section className="section graph-section" id="graph" {...reveal}>
        <div className="section-kicker">05 / knowledge graph</div>
        <h2 className="section-title">A float is never<br /><span>just a float.</span></h2>
        <div className="graph-wrap">
          <div className="graph" data-testid="visual-knowledge-graph">
            <svg viewBox="0 0 700 420" aria-hidden="true"><line className="graph-link" x1="350" y1="210" x2="120" y2="100" /><line className="graph-link" x1="350" y1="210" x2="580" y2="95" /><line className="graph-link" x1="350" y1="210" x2="120" y2="325" /><line className="graph-link" x1="350" y1="210" x2="570" y2="325" /><line className="graph-link" x1="120" y1="100" x2="580" y2="95" /></svg>
            <div className="graph-node central" style={{ left: '50%', top: '50%' }}>WMO 2902746<small>BGC-ARGO</small></div><div className="graph-node" style={{ left: '17%', top: '24%' }}>Arabian Sea<small>region</small></div><div className="graph-node" style={{ left: '83%', top: '23%' }}>Monsoon jet<small>event</small></div><div className="graph-node" style={{ left: '17%', top: '77%' }}>Oxygen minimum<small>signal</small></div><div className="graph-node" style={{ left: '82%', top: '77%' }}>Sep 2024<small>temporal</small></div>
          </div>
          <aside className="graph-aside"><h3>Context is<br />another dimension.</h3><p>FloatChat connects each measurement to the currents, climate events and biological signals around it. Explore the relationships behind <code>12,403,822</code> observations.</p><button className="btn-ghost" type="button" onClick={() => setAnswer('Knowledge graph expanded: 31 connected entities across 4 dimensions.')} data-testid="button-expand-graph">Expand relationships <ArrowUpRight size={14} /></button></aside>
        </div>
      </motion.section>

      <footer className="footer">
        <div><div className="section-kicker">Indian Ocean observing system</div><h2>Stay curious<br />below the <span>surface.</span></h2><a className="btn-primary" href="#query" data-testid="link-ask-another">Ask another question <RotateCcw size={14} /></a></div>
        <div className="footer-bottom"><span>FloatChat / an open field notebook for a changing ocean</span><span>Data window 1998—2024 / research prototype</span></div>
      </footer>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;