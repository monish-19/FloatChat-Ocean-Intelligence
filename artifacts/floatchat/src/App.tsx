import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  ChevronRight,
  Database,
  Radio,
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
  {
    id: 'WMO 2902746',
    type: 'BGC-ARGO',
    lat: '14.22° S',
    lon: '68.90° E',
    depth: '1,997 m',
    temp: '26.4°C',
    salinity: '35.21 PSU',
    status: 'transmitting',
    x: '37%',
    y: '44%',
  },
  {
    id: 'WMO 2902751',
    type: 'ARGO',
    lat: '4.88° S',
    lon: '77.30° E',
    depth: '1,802 m',
    temp: '27.1°C',
    salinity: '35.04 PSU',
    status: 'transmitting',
    x: '55%',
    y: '38%',
  },
  {
    id: 'WMO 2902838',
    type: 'BGC-ARGO',
    lat: '8.62° S',
    lon: '84.18° E',
    depth: '1,005 m',
    temp: '26.8°C',
    salinity: '34.88 PSU',
    status: 'surfacing',
    x: '67%',
    y: '52%',
  },
  {
    id: 'WMO 2902914',
    type: 'ARGO',
    lat: '18.04° S',
    lon: '73.81° E',
    depth: '1,454 m',
    temp: '24.9°C',
    salinity: '35.48 PSU',
    status: 'transmitting',
    x: '45%',
    y: '67%',
  },
  {
    id: 'WMO 2903012',
    type: 'BGC-ARGO',
    lat: '2.17° S',
    lon: '91.44° E',
    depth: '742 m',
    temp: '28.0°C',
    salinity: '34.77 PSU',
    status: 'delayed',
    x: '78%',
    y: '30%',
  },
];

const suggestions = [
  'Where is the Arabian Sea warmest right now?',
  'Show oxygen minimum zones in 2022',
  'Which floats crossed a cyclone path?',
];

const pipeline = [
  { name: 'Interpret query', meta: 'intent / variables' },
  { name: 'Semantic retrieval', meta: 'concept match' },
  { name: 'Spatial filter', meta: 'region / depth' },
  { name: 'ARGO observations', meta: 'quality controlled' },
  { name: 'Grounded answer', meta: 'evidence linked' },
];

const particles = Array.from({ length: 52 }, (_, index) => ({
  left: `${(index * 37 + 7) % 97}%`,
  top: `${(index * 61 + 11) % 92}%`,
  size: `${index % 4 === 0 ? 3 : index % 3 === 0 ? 2 : 1}px`,
  depth: `${(index % 5) + 1}`,
  delay: `${(index % 9) * -0.7}s`,
}));

function useReveal() {
  return {
    initial: { opacity: 0, y: 24, filter: 'blur(8px)' },
    whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
    viewport: { once: true, amount: 0.18 },
    transition: { duration: 0.8, ease: 'easeOut' as const },
  };
}

function Home() {
  const reveal = useReveal();
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryStage, setQueryStage] = useState(0);
  const [selectedFloat, setSelectedFloat] = useState<FloatRecord | null>(null);
  const [cameraTarget, setCameraTarget] = useState<'idle' | string>('idle');
  const [hasPointer, setHasPointer] = useState(false);
  const [cursor, setCursor] = useState({
    x: 0,
    y: 0,
    label: 'MOVE THROUGH THE FIELD',
  });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [descentDepth, setDescentDepth] = useState(0);

  useEffect(() => {
    const updateDepth = () => {
      const scrollRange = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const progress = Math.min(1, window.scrollY / scrollRange);
      setScrollProgress(progress);
      setDescentDepth(Math.round(progress * 1000));
    };

    updateDepth();
    window.addEventListener('scroll', updateDepth, { passive: true });
    return () => window.removeEventListener('scroll', updateDepth);
  }, []);

  useEffect(() => {
    if (!isQuerying) return;
    const interval = window.setInterval(() => {
      setQueryStage((stage) => Math.min(stage + 1, pipeline.length - 1));
    }, 620);
    return () => window.clearInterval(interval);
  }, [isQuerying]);

  useEffect(() => {
    if (!isQuerying || queryStage < pipeline.length - 1) return;
    const finish = window.setTimeout(() => {
      setIsQuerying(false);
      setAnswer(
        'The warmest recent surface signal resolves in the Arabian Sea, centered near 08.7° N / 67.3° E at 29.4°C. The pattern is supported by seven quality-controlled ARGO profiles.',
      );
    }, 680);
    return () => window.clearTimeout(finish);
  }, [isQuerying, queryStage]);

  const cameraFocus = useMemo(() => {
    if (cameraTarget === 'answer') {
      return { x: -8, y: 4, zoom: 1.12 };
    }
    if (selectedFloat) {
      const x = Number.parseFloat(selectedFloat.x);
      const y = Number.parseFloat(selectedFloat.y);
      return { x: (50 - x) * 0.08, y: (50 - y) * 0.06, zoom: 1.06 };
    }
    return { x: 0, y: 0, zoom: 1 };
  }, [cameraTarget, selectedFloat]);

  const stageStyle = {
    '--pointer-x': `${cursor.x}%`,
    '--pointer-y': `${cursor.y}%`,
    '--camera-x': `${cameraFocus.x}%`,
    '--camera-y': `${cameraFocus.y}%`,
    '--camera-zoom': cameraFocus.zoom,
    '--depth-progress': scrollProgress,
  } as CSSProperties;

  const selectFloat = (float: FloatRecord) => {
    setSelectedFloat(float);
    setCameraTarget(float.id);
    setAnswer('');
    setCursor((current) => ({ ...current, label: 'ARGO FLOAT / INSPECT' }));
  };

  const submitQuery = (event?: FormEvent) => {
    event?.preventDefault();
    const cleanQuery = query.trim() || suggestions[0];
    setQuery(cleanQuery);
    setAnswer('');
    setQueryStage(0);
    setIsQuerying(true);
    setCameraTarget('answer');
  };

  const setCursorLabel = (label: string) =>
    setCursor((current) => ({ ...current, label }));

  return (
    <main
      className="fc-page focused-flow"
      onMouseMove={(event) =>
        (() => {
          setHasPointer(true);
          setCursor((current) => ({
            ...current,
            x: (event.clientX / window.innerWidth) * 100,
            y: (event.clientY / window.innerHeight) * 100,
          }));
        })()
      }
    >
      <div className={`cursor-orbit ${hasPointer ? 'is-visible' : ''}`} style={{ left: cursor.x, top: cursor.y }}>
        <span className="cursor-dot" />
        <span className="cursor-halo" />
        <span className="cursor-label">{cursor.label}</span>
      </div>

      <div className="ocean-stage" style={stageStyle}>
        <div className="stage-atmosphere" />
        <div className="stage-grid" />
        <div className="stage-contours contour-a" />
        <div className="stage-contours contour-b" />
        <svg className="stage-trajectories" viewBox="0 0 1000 760" aria-hidden="true">
          <path className="trajectory trajectory-a" d="M92 590 C230 500 202 245 420 314 S700 545 930 175" />
          <path className="trajectory trajectory-b" d="M75 182 C282 85 371 442 604 340 S800 210 965 475" />
          <path className="trajectory trajectory-c" d="M154 682 C356 558 417 250 670 272 S790 370 950 600" />
        </svg>
        <div className="stage-particles" aria-hidden="true">
          {particles.map((particle, index) => (
            <i
              key={index}
              style={{
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                zIndex: Number(particle.depth),
                animationDelay: particle.delay,
              }}
            />
          ))}
        </div>
        <div className="stage-anomaly" aria-hidden="true" />
        <div className="stage-floats" aria-label="Interactive ARGO floats">
          {floats.map((float, index) => (
            <button
              className={`stage-float ${selectedFloat?.id === float.id ? 'is-selected' : ''} ${cameraTarget === 'answer' ? 'is-answering' : ''}`}
              key={float.id}
              type="button"
              style={{
                left: float.x,
                top: float.y,
                animationDelay: `${index * -1.1}s`,
              }}
              onClick={() => selectFloat(float)}
              onMouseEnter={() => setCursorLabel('ARGO FLOAT / INSPECT')}
              onMouseLeave={() => setCursorLabel('MOVE THROUGH THE FIELD')}
              aria-label={`Inspect ${float.id}`}
            >
              <span className="float-beacon" />
              <span className="float-id">{float.id.replace('WMO ', '')}</span>
            </button>
          ))}
        </div>
        <div className="stage-vignette" />
      </div>

      <nav className="fc-nav" aria-label="Primary navigation">
        <a
          className="fc-brand"
          href="#top"
          onMouseEnter={() => setCursorLabel('RETURN TO SURFACE')}
          onMouseLeave={() => setCursorLabel('MOVE THROUGH THE FIELD')}
        >
          <span className="brand-mark" aria-hidden="true" />
          FloatChat
        </a>
        <div className="nav-links">
          <a href="#descent">Descent</a>
          <a href="#atlas">Float field</a>
          <a href="#chat">Ask the ocean</a>
        </div>
        <div className="nav-live">
          <span className="live-dot" /> Live field / 14:32 UTC
        </div>
      </nav>

      <div className="depth-hud" aria-live="polite">
        <span>depth</span>
        <strong>{String(descentDepth).padStart(3, '0')}M</strong>
        <i />
        <small>{descentDepth > 650 ? 'deep field' : descentDepth > 250 ? 'water column' : 'surface field'}</small>
      </div>

      <section className="flow-hero" id="top">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.08, ease: 'easeOut' }}
        >
          <div className="eyebrow">
            <span className="eyebrow-line" /> Indian Ocean / 4D intelligence
          </div>
          <h1>
            <motion.span initial={{ y: 18 }} animate={{ y: 0 }} transition={{ delay: 0.28 }}>
              The ocean
            </motion.span>
            <motion.span initial={{ y: 25 }} animate={{ y: 0 }} transition={{ delay: 0.42 }}>
              is the
            </motion.span>
            <motion.em initial={{ y: 32 }} animate={{ y: 0 }} transition={{ delay: 0.56 }}>
              interface.
            </motion.em>
          </h1>
          <p className="hero-copy">
            A conversational instrument for following Indian Ocean observations through space, depth, and time.
          </p>
          <div className="hero-actions">
            <a className="btn-primary" href="#descent">
              Begin descent <ArrowDown size={14} />
            </a>
            <a
              className="btn-ghost"
              href="#atlas"
              onMouseEnter={() => setCursorLabel('OPEN FLOAT FIELD')}
              onMouseLeave={() => setCursorLabel('MOVE THROUGH THE FIELD')}
            >
              Meet the network <ArrowUpRight size={14} />
            </a>
          </div>
        </motion.div>
        <div className="hero-instrument">
          <span className="instrument-line" />
          <span>cursor field / live</span>
          <strong>05</strong>
          <small>active instruments in view</small>
        </div>
        <div className="hero-meta">
          <span>12.4m observations indexed / research prototype</span>
          <div className="scroll-cue">
            <span /> scroll to descend
          </div>
        </div>
      </section>

      <motion.section className="flow-section descent-section" id="descent" {...reveal}>
        <div className="section-kicker">01 / scroll is descent</div>
        <div className="descent-copy">
          <h2>
            Every scroll takes you
            <span> deeper into the signal.</span>
          </h2>
          <p>
            The field darkens as the water column opens. Surface observations become profiles, profiles become patterns, and the instruments begin to separate from the noise.
          </p>
        </div>
        <div className="descent-readout">
          <span>current layer</span>
          <strong>{descentDepth > 700 ? 'DEEP OCEAN' : descentDepth > 350 ? 'MESOPELAGIC' : 'SURFACE MIXED LAYER'}</strong>
          <div className="readout-track"><i style={{ width: `${Math.max(5, scrollProgress * 100)}%` }} /></div>
          <small>scroll position mapped to water depth</small>
        </div>
      </motion.section>

      <motion.section className="flow-section atlas-section" id="atlas" {...reveal}>
        <div className="section-kicker">02 / float interaction</div>
        <div className="atlas-heading">
          <div>
            <h2>
              Select an instrument.
              <span> Follow its path.</span>
            </h2>
            <p>These are demonstration observations. Select a glowing float in the field or from the network below to move the camera toward its latest transmission.</p>
          </div>
          <div className="atlas-status"><span className="live-dot" /> 05 instruments / moving</div>
        </div>
        <div className="float-network">
          <div className="network-chrome">
            <span>ARGO NETWORK / INDIAN OCEAN</span>
            <span>TRAJECTORIES ONLINE</span>
          </div>
          <div className="network-map">
            <span className="map-region region-arabian">ARABIAN SEA</span>
            <span className="map-region region-bay">BAY OF BENGAL</span>
            <span className="map-region region-indian">INDIAN OCEAN</span>
            <span className="map-region region-sri">SRI LANKA</span>
            {floats.map((float) => (
              <button
                key={float.id}
                className={`network-float ${selectedFloat?.id === float.id ? 'is-selected' : ''}`}
                type="button"
                style={{ left: float.x, top: float.y }}
                onClick={() => selectFloat(float)}
                onMouseEnter={() => setCursorLabel('ARGO FLOAT / INSPECT')}
                onMouseLeave={() => setCursorLabel('MOVE THROUGH THE FIELD')}
                aria-label={`Focus ${float.id}`}
              >
                <span />
              </button>
            ))}
            <svg viewBox="0 0 800 460" aria-hidden="true">
              <path d="M92 342 C220 260 166 132 332 174 S523 331 735 105" />
              <path d="M44 105 C206 49 286 311 481 252 S652 138 770 356" />
              <path d="M112 418 C268 364 339 160 505 183 S612 279 756 409" />
            </svg>
          </div>
          <AnimatePresence mode="wait">
            {selectedFloat ? (
              <motion.aside
                className="float-hud"
                key={selectedFloat.id}
                initial={{ opacity: 0, x: 16, filter: 'blur(5px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              >
                <span className="hud-kicker">instrument selected</span>
                <h3>{selectedFloat.id}</h3>
                <p>{selectedFloat.type} / {selectedFloat.status}</p>
                <dl>
                  <div><dt>position</dt><dd>{selectedFloat.lat}<br />{selectedFloat.lon}</dd></div>
                  <div><dt>depth</dt><dd>{selectedFloat.depth}</dd></div>
                  <div><dt>temperature</dt><dd>{selectedFloat.temp}</dd></div>
                  <div><dt>salinity</dt><dd>{selectedFloat.salinity}</dd></div>
                </dl>
                <div className="hud-foot"><span>trajectory locked</span><i /></div>
              </motion.aside>
            ) : (
              <aside className="float-hud empty-hud">
                <span className="hud-kicker">instrument field</span>
                <h3>Hover a signal.</h3>
                <p>Click any float to bring its trajectory into focus.</p>
              </aside>
            )}
          </AnimatePresence>
          <div className="network-legend"><span><i className="legend-dot" /> transmitting</span><span><i className="legend-dot orange" /> selected</span><span>prototype values</span></div>
        </div>
      </motion.section>

      <motion.section className="flow-section chat-section" id="chat" {...reveal}>
        <div className="section-kicker">03 / ask the ocean</div>
        <div className="chat-heading">
          <h2>
            Turn a question into
            <span> a camera move.</span>
          </h2>
          <p>The ocean stays visible while FloatChat interprets the question, retrieves the evidence, and brings the answer into focus.</p>
        </div>
        <div className={`chat-console ${isQuerying ? 'is-querying' : ''} ${answer ? 'has-answer' : ''}`}>
          <div className="chat-console-head">
            <span><Search size={12} /> grounded query / demonstration mode</span>
            <span className="console-signal"><i /> environment linked</span>
          </div>
          <form onSubmit={submitQuery}>
            <label htmlFor="ocean-query">Ask anything about the Indian Ocean</label>
            <div className="chat-input-wrap">
              <input
                id="ocean-query"
                aria-label="Ask FloatChat a question"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (answer) setAnswer('');
                }}
                onFocus={() => setCursorLabel('ASK THE OCEAN')}
                onBlur={() => setCursorLabel('MOVE THROUGH THE FIELD')}
                placeholder="Where is the Arabian Sea warmest right now?"
              />
              <button type="submit" aria-label="Submit ocean query"><Send size={19} /></button>
            </div>
          </form>
          <div className="suggestions">
            {suggestions.map((suggestion) => (
              <button
                className="suggestion"
                type="button"
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  setAnswer('');
                  setCursorLabel('READY TO ASK');
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="pipeline" aria-live="polite">
            {pipeline.map((stage, index) => (
              <div className={`pipeline-step ${isQuerying && index <= queryStage ? 'is-active' : ''} ${answer && index === pipeline.length - 1 ? 'is-complete' : ''}`} key={stage.name}>
                <span className="pipeline-index">0{index + 1}</span>
                <span className="pipeline-name">{stage.name}</span>
                <small>{stage.meta}</small>
                {index < pipeline.length - 1 && <ChevronRight size={14} />}
              </div>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {answer && (
              <motion.div
                className="answer-hud"
                initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              >
                <div className="answer-signal"><span /> grounded answer / camera locked</div>
                <h3>Arabian Sea <em>thermal maximum</em></h3>
                <strong>29.4°C</strong>
                <div className="answer-coordinates"><span>08.7° N</span><span>67.3° E</span><span>07 ARGO FLOATS</span><span>18:42 UTC</span></div>
                <p>{answer}</p>
                <div className="answer-sources"><Database size={13} /> Sources / WMO 2902746 · WMO 2902751 · Indian Ocean Atlas 2023</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="chat-proof">
          <div><Database size={14} /><span>ARGO + BGC-ARGO<br /><b>12,403,822 profiles</b></span></div>
          <div><Waves size={14} /><span>FIELD VARIABLES<br /><b>T / S / O₂ / Chl-a</b></span></div>
          <div><Radio size={14} /><span>LAST PACKET<br /><b>14:31 UTC</b></span></div>
          <div><Activity size={14} /><span>ACTIVE SIGNAL<br /><b>{cameraTarget === 'answer' ? 'ARABIAN SEA' : 'INDIAN OCEAN'}</b></span></div>
        </div>
      </motion.section>

      <footer className="flow-footer">
        <div>
          <div className="section-kicker">return to surface</div>
          <h2>Ask the ocean.<br /><span>Let the data answer.</span></h2>
          <a className="btn-primary" href="#chat">Ask another question <ArrowUpRight size={14} /></a>
        </div>
        <div className="footer-bottom"><span>FloatChat / research prototype</span><span>Depth window 000—1000M / demonstration data</span></div>
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