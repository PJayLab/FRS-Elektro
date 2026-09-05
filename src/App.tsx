import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, MapPin, Info, ChevronRight, Loader2, Zap, Box, Database, Power, LogOut, ChevronUp, ChevronDown, X, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapBounds, MapStyle, NetworkResult, NearbyObject, SearchResult } from './types';
import { areaQuery, inBounds, objectLabels, resultType } from './lib/map';
import { ObjectSymbol } from './components/ObjectSymbol';
import { MapView } from './components/MapView';
import { Login } from './components/Login';
import { cn } from './lib/utils';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('feuewehr_token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('feuewehr_username'));
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<NetworkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [nearbyObjects, setNearbyObjects] = useState<NearbyObject[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [objectLocation, setObjectLocation] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [showBuildings, setShowBuildings] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>(() => {
    const saved = localStorage.getItem('elektro_map_style');
    return saved === 'dark' || saved === 'satellite' ? saved : 'light';
  });
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyStatus, setNearbyStatus] = useState<string | null>(null);
  const nearbyRequest = useRef(0);
  const selectionRequest = useRef(0);
  const searchRequest = useRef(0);
  useEffect(() => { localStorage.setItem('elektro_map_style', mapStyle); }, [mapStyle]);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportRemarks, setReportRemarks] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('feuewehr_token', token);
    } else {
      localStorage.removeItem('feuewehr_token');
    }
  }, [token]);

  useEffect(() => {
    if (username) {
      localStorage.setItem('feuewehr_username', username);
    } else {
      localStorage.removeItem('feuewehr_username');
    }
  }, [username]);

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  }, [token]);

  const handleLogin = (newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    nearbyRequest.current++;
    selectionRequest.current++;
    searchRequest.current++;
    setNearbyObjects([]);
    setUserLocation(null);
    setNearbyStatus(null);
    setNearbyLoading(false);
    setToken(null);
    setObjectLocation(null);
    setLoading(false);
    setUsername(null);
    setSelectedResult(null);
    setResults([]);
    setSearchQuery('');
    setIsSelecting(false);
    setIsUserMenuOpen(false);
  };

  const handleReportIssue = async () => {
    if (!selectedResult?.connection) return;
    setIsSubmittingReport(true);
    try {
      const response = await authenticatedFetch(`/api/search/connection/${selectedResult.connection.uuid}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: username || 'patrick',
          remarks: reportRemarks
        })
      });
      
      if (response.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportSuccess(false);
          setIsReporting(false);
          setReportRemarks('');
        }, 3000);
      } else {
        throw new Error('Report failed');
      }
    } catch (err) {
      setError('Fehler beim Senden des Berichts');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const clearSearch = () => {
    searchRequest.current++;
    selectionRequest.current++;
    setLoading(false);
    setIsSelecting(false);
    setSearchQuery('');
    setResults([]);
    setSelectedResult(null);
    setError(null);
  };

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim().length < 3) return;
    if (isSelecting) return;
    const request = ++searchRequest.current;

    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(`/api/search/connection?q=${encodeURIComponent(searchQuery)}`);
      if (request !== searchRequest.current) return;
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      if (request !== searchRequest.current) return;
      setResults(Array.isArray(data) ? data : []);
      if (data && data.length === 0) setError('Keine Resultate gefunden');
    } catch (err) {
      if (request !== searchRequest.current) return;
      console.error(err);
      setError('Fehler bei der Suche');
    } finally {
      if (request === searchRequest.current) setLoading(false);
    }
  }, [searchQuery, authenticatedFetch, isSelecting]);

  // Debounced search effect
  useEffect(() => {
    if (isSelecting) return;
    
    if (searchQuery.trim().length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch, isSelecting]);

  const selectResult = async (res: SearchResult) => {
    const request = ++selectionRequest.current;
    searchRequest.current++;
    nearbyRequest.current++;
    setNearbyLoading(false);
    setNearbyObjects([]);
    setNearbyStatus(null);
    setUserLocation(null);
    setObjectLocation(null);
    setIsSelecting(true);
    setLoading(true);
    setResults([]); // Close search list immediately
    setSearchQuery(res.address);
    setSelectedResult(null);
    setError(null);
    if (resultType(res) !== 'connection') {
      if (res.location && typeof res.location === 'object' && Number.isFinite(res.location.lat) && Number.isFinite(res.location.lon)) {
        setNearbyObjects([{ uuid: res.uuid, name: res.address, address: res.address, type: res.type as NearbyObject['type'], ...res.location }]);
        setObjectLocation([res.location.lat, res.location.lon]);
        if (res.type === 'building') setShowBuildings(true);
      } else {
        setError('Dieses Objekt enthält noch keine Kartenkoordinaten.');
      }
      setLoading(false);
      return;
    }
    try {
      if (!res.connection_uuid && !res.uuid) throw new Error('Verbindungs-ID fehlt');
      const response = await authenticatedFetch(`/api/search/connection/${encodeURIComponent(res.connection_uuid || res.uuid)}`);
      if (request !== selectionRequest.current) return;
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (!response.ok) throw new Error('Details konnten nicht geladen werden');
      const data = await response.json();
      if (request !== selectionRequest.current) return;
      setSelectedResult(data);
      setIsDetailsExpanded(true);
    } catch (err) {
      if (request !== selectionRequest.current) return;
      console.error(err);
      setError('Details Fehler');
    } finally {
      if (request === selectionRequest.current) setLoading(false);
    }
  };

  const beginNearby = () => {
    const request = ++nearbyRequest.current;
    selectionRequest.current++;
    searchRequest.current++;
    setLoading(false);
    setNearbyLoading(true);
    setError(null);
    setSelectedResult(null);
    setNearbyObjects([]);
    setNearbyStatus(null);
    setResults([]);
    setSearchQuery('');
    setIsSelecting(false);
    setIsDetailsExpanded(false);
    setObjectLocation(null);
    return request;
  };

  const fetchNearby = async (query: { lat: number; lon: number; radius: number }, request: number, bounds?: MapBounds) => {
    try {
      const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
      const response = await authenticatedFetch('/api/search/nearby?' + params);
      if (request !== nearbyRequest.current) return;
      if (response.status === 401) { handleLogout(); return; }
      if (!response.ok) throw new Error('Objektabfrage fehlgeschlagen (' + response.status + '). Bitte erneut versuchen.');
      const data = await response.json();
      if (request !== nearbyRequest.current) return;
      if (!Array.isArray(data)) throw new Error('Die API hat keine gültige Objektliste geliefert.');
      const objects = data.filter((o): o is NearbyObject => o && Object.hasOwn(objectLabels, o.type) && o.type !== 'connection' && typeof o.lat === 'number' && typeof o.lon === 'number' && Number.isFinite(o.lat) && Number.isFinite(o.lon));
      const visible = bounds ? objects.filter(o => inBounds(o, bounds)) : objects;
      setNearbyObjects(visible);
      setNearbyStatus(visible.length ? (bounds ? 'Objekte im abgefragten Ausschnitt' : 'Objekte im Umkreis von 500 m') : 'Keine Objekte gefunden');
    } catch (err) {
      if (request === nearbyRequest.current) setError(err instanceof Error ? err.message : 'Objekte konnten nicht geladen werden.');
    } finally {
      if (request === nearbyRequest.current) setNearbyLoading(false);
    }
  };

  const searchArea = () => {
    if (!mapBounds) return;
    const query = areaQuery(mapBounds);
    // Avoid unintentionally querying an entire country via the radius endpoint.
    if (query.radius > 10000) { setError('Bitte näher heranzoomen: Der Suchbereich darf höchstens 10 km Radius umfassen.'); return; }
    const request = beginNearby();
    setUserLocation(null);
    void fetchNearby(query, request, mapBounds);
  };

  const showNearby = () => {
    if (!navigator.geolocation) { setError('Dieser Browser unterstützt keine Standortbestimmung.'); return; }
    const request = beginNearby();
    navigator.geolocation.getCurrentPosition(position => {
      if (request !== nearbyRequest.current) return;
      const { latitude: lat, longitude: lon } = position.coords;
      setUserLocation([lat, lon]);
      void fetchNearby({ lat, lon, radius: 500 }, request);
    }, err => {
      if (request !== nearbyRequest.current) return;
      setNearbyLoading(false);
      setError(err.code === 1 ? 'Standortzugriff verweigert. Du kannst stattdessen im Kartenausschnitt suchen.' : 'Standort konnte nicht bestimmt werden. Bitte im Kartenausschnitt suchen.');
    }, { timeout: 15000, maximumAge: 30000 });
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 z-50 shadow-xl">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Zap className="text-red-600 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <h1 className="hidden md:block font-bold text-lg tracking-tight uppercase whitespace-nowrap italic">Feuerwehr Elektro</h1>
        </div>

        <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-sm relative">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { searchRequest.current++; setLoading(false); setResults([]); setIsSelecting(false); setSearchQuery(e.target.value); }}
              placeholder="Nach Adresse suchen..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-red-600 transition-all text-base placeholder:text-slate-600 shadow-inner"
            />
            {searchQuery && !loading && (
              <button 
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-full transition-colors"
                title="Suche löschen"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            )}
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />}
          </div>
          
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 ring-1 ring-white/5"
              >
                <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden py-1">
                  {results.map((res) => (
                    <button
                      type="button"
                      key={`${resultType(res)}-${res.connection_uuid || res.uuid || res.address}`}
                      onClick={() => selectResult(res)}
                      className="w-full px-5 py-4 text-left hover:bg-slate-800/80 border-b border-slate-800/50 last:border-none flex items-center justify-between group active:bg-slate-700/50"
                    >
                      <ObjectSymbol type={resultType(res)} className="mr-3" />
                      <div className="flex flex-col min-w-0 flex-1">
                        {/* Cutting result ... text-sm font-bold truncate pr-4 text-slate-200 */}
                        <span className="text-sm font-bold text-slate-200 break-words whitespace-normal">{res.address}</span>
                        <span className="text-xs text-slate-400">{objectLabels[resultType(res)]}{typeof res.location === 'string' && res.location ? ` · ${res.location}` : ''}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-red-500 shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title="Einstellungen"
            aria-label="Einstellungen"
            aria-expanded={isUserMenuOpen}
            className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-red-500 hover:border-red-500 transition-all shadow-lg active:scale-95 uppercase"
          >
            {username?.charAt(0) || 'U'}
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsUserMenuOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-3 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                >
                  <div className="px-4 py-3 border-b border-slate-800 mb-2">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Angemeldet als</p>
                    <p className="text-sm font-bold text-white capitalize">{username || 'Unbekannt'}</p>
                  </div>
                  
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-xs font-bold text-slate-400 mb-2">Kartenansicht</p>
                    <div className="flex gap-1" role="group" aria-label="Kartenansicht">
                      {(['light', 'dark', 'satellite'] as MapStyle[]).map(style => <button key={style} onClick={() => setMapStyle(style)} aria-pressed={mapStyle === style} className={cn('flex-1 rounded-lg py-2 text-xs font-bold', mapStyle === style ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300')}>{({ light: 'Hell', dark: 'Dunkel', satellite: 'Satellit' })[style]}</button>)}
                    </div>
                  </div>
                  <button onClick={() => setShowBuildings(!showBuildings)} aria-pressed={showBuildings} className="w-full px-4 py-3 text-left text-sm hover:bg-slate-800">Gebäude in Umgebung: <strong>{showBuildings ? 'Ein' : 'Aus'}</strong></button>
                  <button
                    aria-pressed={showConnections}
                    onClick={() => setShowConnections(!showConnections)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Power className={cn("w-4 h-4", showConnections ? "text-red-500" : "text-slate-500")} />
                      <span className="text-sm font-bold">Verbindungen</span>
                    </div>
                    <div className={cn(
                      "w-8 h-4 rounded-full relative transition-colors",
                      showConnections ? "bg-red-600" : "bg-slate-700"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-2 h-2 rounded-full bg-white transition-all",
                        showConnections ? "left-5" : "left-1"
                      )} />
                    </div>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-950/20 text-red-500 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-bold">Abmelden</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noreferrer" className="absolute bottom-0 right-0 z-[45] rounded-tl bg-slate-900/90 px-2 py-0.5 text-[10px] text-slate-200">© swisstopo</a>
        {/* Map View - Always Full Background */}
        <section className="absolute inset-0 z-0">
          <MapView 
            selectedResult={selectedResult} 
            nearbyObjects={nearbyObjects}
            userLocation={userLocation}
            objectLocation={objectLocation}
            showConnections={showConnections}
            showBuildings={showBuildings}
            mapStyle={mapStyle}
            onBoundsChange={setMapBounds}
          />

          <div className="absolute top-4 left-4 right-20 z-[500] flex flex-col items-start gap-2 pointer-events-none">
            <button onClick={searchArea} disabled={nearbyLoading || !mapBounds} className="pointer-events-auto px-4 py-3 rounded-2xl bg-slate-900/95 text-white shadow-xl border border-slate-700 text-sm font-bold disabled:opacity-60 flex items-center gap-2">
              {nearbyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}In diesem Bereich suchen
            </button>
            {nearbyStatus && <div role="status" className="rounded-xl bg-slate-900/95 px-3 py-2 text-xs text-slate-200 max-w-xs">{nearbyStatus} · {nearbyObjects.filter(o => showBuildings || o.type !== 'building').length} sichtbar{!showBuildings && ' · Gebäude ausgeblendet'}</div>}
          </div>

          <button
            onClick={showNearby}
            disabled={nearbyLoading}
            className="absolute bottom-8 right-4 sm:bottom-8 sm:right-6 z-[500] w-12 h-12 bg-slate-900/90 backdrop-blur-xl text-slate-400 rounded-2xl flex items-center justify-center shadow-2xl hover:text-white transition-all active:scale-90 border border-slate-700/50 ring-1 ring-white/5 disabled:opacity-50"
            title="Infrastruktur in der Nähe"
          >
            <MapPin className="w-5 h-5" />
          </button>
        </section>

        {/* Global Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs"
            >
              <div className="bg-red-600 text-white p-3 rounded-xl shadow-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider py-4">
                <Info className="w-4 h-4" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-2 underline opacity-70">Schliessen</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swipe-up Bottom Sheet (Mobile-First approach) */}
        <AnimatePresence>
          {selectedResult && (
            <motion.div
              initial={{ y: "85%" }}
              animate={{ y: isDetailsExpanded ? "0%" : "85%" }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute left-0 right-0 bottom-0 z-40 bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col h-[85vh] sm:h-[70vh] ring-1 ring-white/5"
            >
              {/* Drag Handle Area */}
              <div 
                className="w-full flex flex-col items-center py-4 cursor-pointer active:bg-slate-800/30 rounded-t-[2.5rem]"
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              >
                <div className="w-12 h-1.5 bg-slate-800 rounded-full mb-4"></div>
                <div className="flex items-center justify-between w-full px-8">
                  <div className="flex items-center gap-3">
                    <Box className="w-5 h-5 text-red-500" />
                    <div>
                      <h2 className="text-lg font-black text-white italic tracking-tighter uppercase leading-none">Gebäude Details</h2>
                      <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1 truncate max-w-[200px]">{selectedResult.building.address}</p>
                    </div>
                  </div>
                  <div className="bg-slate-800 p-2 rounded-full text-slate-400">
                    {isDetailsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 pb-12 scrollbar-hide">
                <div className="space-y-8 max-w-2xl mx-auto">
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 border-b border-slate-800 pb-2 ml-1">Netzwerk-Architektur</h3>
                    <div className="space-y-8 relative ml-4">
                      <div className="absolute left-[15px] top-8 bottom-8 w-px bg-gradient-to-b from-blue-600 via-yellow-500 to-slate-700"></div>
                      
                      <div className="flex gap-6 items-start relative">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/50 ring-4 ring-slate-900">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div className="pt-1 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">Transformator</div>
                            {selectedResult.connection && (
                              <div className="bg-blue-500/10 text-blue-500 text-[10px] font-black px-2 py-0.5 rounded border border-blue-500/20 italic">
                                ABGANG: {selectedResult.connection.source_outgoing.join(', ') || '-'}
                              </div>
                            )}
                          </div>
                          <div className="font-bold text-slate-100 text-lg leading-tight">{selectedResult.transformer?.address || '---'}</div>
                        </div>
                      </div>

                      <div className="flex gap-6 items-start relative">
                        <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center shrink-0 shadow-lg shadow-yellow-900/50 ring-4 ring-slate-900">
                          <Database className="w-5 h-5 text-white" />
                        </div>
                        <div className="pt-1 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">Verteilkabine</div>
                            {selectedResult.connection && (
                              <div className="bg-yellow-500/10 text-yellow-500 text-[10px] font-black px-2 py-0.5 rounded border border-yellow-500/20 italic">
                                ABGANG: {selectedResult.connection.disconnect_point_outgoing.join(', ') || '-'}
                              </div>
                            )}
                          </div>
                          <div className="font-bold text-slate-100 text-lg leading-tight">{selectedResult.distribution_box?.address || '---'}</div>
                        </div>
                      </div>

                      {selectedResult.disconnect_point && (
                        <div className="flex gap-6 items-start relative">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 shadow-lg ring-4 ring-slate-900">
                            <Power className="w-5 h-5 text-white" />
                          </div>
                          <div className="pt-1">
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">Trennstelle</div>
                            <div className="font-bold text-slate-100 text-lg leading-tight">{selectedResult.disconnect_point.address}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {selectedResult.connection && selectedResult.connection.connection_notes.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 border-b border-slate-800 pb-2 ml-1">Hinweise</h3>
                      <div className="p-6 bg-red-950/20 rounded-[2rem] border border-red-900/30">
                        <div className="text-[10px] text-red-500 uppercase font-black mb-4 italic tracking-[0.2em] flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                           Einsatz-Hinweise
                        </div>
                        <ul className="space-y-4">
                          {selectedResult.connection.connection_notes.map((note, i) => (
                            <li key={i} className="flex items-start gap-4 bg-red-950/40 p-4 rounded-2xl border border-red-900/20">
                              <Info className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                              <span className="text-lg font-bold text-slate-100 leading-[1.2]">{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>
                  )}

                  <section className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 shadow-lg">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4 ml-1">Gebäude Details</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Addresse</span>
                        <span className="font-bold text-xl leading-tight text-slate-100">{selectedResult.building.address}</span>
                      </div>
                      {selectedResult.building.location && (
                        <div className="flex flex-col gap-1 pt-4 border-t border-slate-800/50">
                          <span className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Ort</span>
                          <span className="font-bold text-slate-300">{selectedResult.building.location}</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1 pt-4 border-t border-slate-800/50 text-slate-300">
                        <span className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Koordinaten</span>
                        <span className="font-mono text-xs mt-1">
                          {selectedResult.building.lat?.toFixed(6)}, {selectedResult.building.lon?.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  </section>
                  
                  {/* Report Issue Section */}
                  <section className="pt-4">
                    {!isReporting ? (
                      <button 
                        onClick={() => setIsReporting(true)}
                        className="w-full py-4 px-6 bg-slate-800/50 hover:bg-slate-800 text-slate-400 border border-slate-700/50 rounded-2xl flex items-center justify-center gap-3 transition-all text-sm font-bold active:scale-95"
                      >
                        <Info className="w-4 h-4" />
                        Netzwerk-Fehler melden
                      </button>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Netzwerk-Fehler melden</span>
                          <button onClick={() => setIsReporting(false)} className="text-slate-500 hover:text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {reportSuccess ? (
                          <div className="py-8 text-center space-y-2">
                            <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Zap className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-white uppercase tracking-tighter">Bericht gesendet!</p>
                            <p className="text-xs text-slate-500">Vielen Dank für deine Mithilfe.</p>
                          </div>
                        ) : (
                          <>
                            <textarea 
                              value={reportRemarks}
                              onChange={(e) => setReportRemarks(e.target.value)}
                              placeholder="Beschreibe das Problem (z.B. falscher Abgang, falsche Kabine, etc)"
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 min-h-[120px] focus:ring-2 focus:ring-red-600 outline-none resize-none transition-all"
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setIsReporting(false)}
                                className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all border border-slate-800"
                              >
                                Abbrechen
                              </button>
                              <button 
                                onClick={handleReportIssue}
                                disabled={isSubmittingReport || !reportRemarks.trim()}
                                className="flex-[2] py-3 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                              >
                                {isSubmittingReport ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Sende...
                                  </>
                                ) : (
                                  'Bericht senden'
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </section>
                  
                  <div className="pt-6 flex justify-center">
                    <button 
                      onClick={() => setSelectedResult(null)}
                      className="px-8 py-4 bg-slate-950 hover:bg-slate-900 text-slate-500 font-black uppercase tracking-widest text-[10px] border border-slate-800 rounded-2xl transition-all"
                    >
                      Objekt Schliessen
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Legend - Floating */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
           <MapLegend 
             showConnections={showConnections && !!selectedResult}
             isOpen={isLegendOpen} 
             onToggle={() => setIsLegendOpen(!isLegendOpen)} 
           />
        </div>
      </main>
    </div>
  );
}

function MapLegend({ showConnections, isOpen, onToggle }: { showConnections: boolean; isOpen: boolean; onToggle: () => void }) {
  return <div className="flex flex-col items-end gap-2">
    <button onClick={onToggle} aria-expanded={isOpen} aria-label="Kartenlegende" className="w-12 h-12 bg-slate-900/95 rounded-2xl border border-slate-700 shadow-xl flex items-center justify-center text-slate-200" title="Kartenlegende"><Layers className="w-5 h-5" /></button>
    {isOpen && <div className="bg-slate-900/95 p-4 rounded-2xl border border-slate-700 shadow-xl w-64 max-w-[calc(100vw-2rem)] space-y-3">
      <h2 className="font-bold text-sm">Objekte auf der Karte</h2>
      {(['transformer', 'distribution_box', 'disconnect_point', 'building'] as const).map(type => <div key={type} className="flex items-center gap-3 text-sm"><ObjectSymbol type={type} /><span>{objectLabels[type]}</span></div>)}
      {showConnections && <p className="text-xs text-slate-300 border-t border-slate-700 pt-3 leading-relaxed">Pfeile zeigen die Stromrichtung von der Trafostation über die Zwischenobjekte zum Gebäude. Der Verlauf ist schematisch.</p>}
    </div>}
  </div>;
}
