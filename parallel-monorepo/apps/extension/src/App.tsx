import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, AlertTriangle, Loader2, DollarSign, ExternalLink, RefreshCw } from 'lucide-react';

function App() {
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'READY' | 'IMPORTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [itemData, setItemData] = useState<any>(null);
  const [apiResult, setApiResult] = useState<any>(null);
  const [apiConnected, setApiConnected] = useState(false);

  const API_URL = 'https://parallel-production-e4b6.up.railway.app';

  useEffect(() => {
    const checkApi = async () => {
      console.log('Checking API:', `${API_URL}/health`);
      try {
        const res = await fetch(`${API_URL}/health`);
        console.log('API Status:', res.status, res.statusText);
        setApiConnected(res.ok);
      } catch (e) {
        console.error('API Connection Failed:', e);
        setApiConnected(false);
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 5000);
    return () => clearInterval(interval);
  }, []);

  const scanPage = async () => {
    setStatus('SCANNING');
    setErrorMsg('');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id || !tab?.url?.includes('ebay.com/itm/')) {
      setStatus('ERROR');
      setErrorMsg('Navigate to an eBay Item Page first.');
      return;
    }

    try {
      chrome.tabs.sendMessage(tab.id, { action: "SCRAPE_PAGE" }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus('ERROR');
          setErrorMsg('Refresh the page and try again.');
          return;
        }

        if (response && response.status === "SUCCESS") {
          setItemData(response.payload);
          setStatus('READY');
        } else {
          setStatus('ERROR');
          setErrorMsg('Could not read item data.');
        }
      });
    } catch (e) {
      setStatus('ERROR');
      setErrorMsg('Connection failed.');
    }
  };

  const confirmImport = async () => {
    setStatus('IMPORTING');
    try {
      const res = await fetch(`${API_URL}/api/v1/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      const data = await res.json();
      if (res.ok) {
        setApiResult(data);
        setStatus('SUCCESS');
      } else {
        setStatus('ERROR');
        setErrorMsg(data.message || 'Import failed.');
      }
    } catch (e) {
      setStatus('ERROR');
      setErrorMsg('API Disconnected (Is it running?)');
    }
  };

  return (
    <div className="w-[350px] h-[500px] bg-midnight text-white font-sans flex flex-col selection:bg-lime selection:text-midnight">
      {/* Navbar */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-5 bg-midnight/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2 font-mono font-bold tracking-tighter text-lg">
          <span className="text-lime">//</span> PARALLEL
        </div>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-lime animate-pulse' : 'bg-red-500'}`}></div>
           <span className="text-[10px] font-mono text-dim tracking-widest">{apiConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 overflow-y-auto">
        
        {/* STATE: IDLE */}
        {status === 'IDLE' && (
          <div className="h-full flex flex-col justify-center items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-2xl bg-surface border border-white/10 flex items-center justify-center mb-6 shadow-2xl shadow-lime/5">
               <RefreshCw className="text-lime w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Inventory Sync</h2>
            <p className="text-dim text-sm mb-8 px-4 leading-relaxed">
              Navigate to any eBay listing to mirror it to your Parallel store.
            </p>
            <button 
              onClick={scanPage}
              className="w-full bg-lime text-midnight font-bold py-4 rounded-lg hover:bg-lime/90 transition flex items-center justify-center gap-2 group"
            >
              <span>Scan Active Page</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* STATE: LOADING */}
        {(status === 'SCANNING' || status === 'IMPORTING') && (
           <div className="h-full flex flex-col justify-center items-center text-center">
             <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-white/10 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-lime border-t-transparent rounded-full animate-spin"></div>
             </div>
             <p className="text-lime font-mono text-xs uppercase tracking-widest animate-pulse">
               {status === 'SCANNING' ? 'Parsing DOM...' : 'Calculating Logic...'}
             </p>
           </div>
        )}

        {/* STATE: READY (Preview) */}
        {status === 'READY' && itemData && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-xs font-mono text-dim mb-2 uppercase tracking-widest">Target Detected</div>
            
            {/* Item Card */}
            <div className="bg-surface border border-white/10 rounded-xl p-4 mb-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-lime"></div>
              <div className="flex gap-4">
                <div className="relative w-20 h-20 shrink-0">
                   <img src={itemData.images?.[0] || 'https://via.placeholder.com/150'} className="w-full h-full rounded-lg object-cover bg-black border border-white/5" />
                   <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur font-mono">
                      {itemData.images?.length || 0}
                   </div>
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <h3 className="font-bold text-sm leading-tight mb-2 line-clamp-2">{itemData.title}</h3>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <div>
                        <span className="text-dim block text-[10px]">SOURCE</span>
                        <span className="text-white">${itemData.price_source}</span>
                    </div>
                    <div className="w-px h-6 bg-white/10"></div>
                    <div>
                        <span className="text-dim block text-[10px]">RATING</span>
                        <span className={`${itemData.seller_rating_score >= 80 ? 'text-lime' : 'text-red-400'}`}>
                           {itemData.seller_rating_score}%
                        </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Preview */}
            <div className="border border-white/10 rounded-lg p-3 mb-6 bg-white/5">
                <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-dim">Est. Parallel Price</span>
                    <span className="font-mono text-lime font-bold">
                        ${(itemData.price_source * 0.95).toFixed(2)}
                    </span>
                </div>
                <div className="text-[10px] text-dim text-right">Includes estimated shipping adjustment</div>
            </div>

            <button 
              onClick={confirmImport}
              className="w-full bg-lime text-midnight font-bold py-4 rounded-lg hover:bg-lime/90 transition flex items-center justify-center gap-2"
            >
              <DollarSign size={18} />
              Confirm & Sync
            </button>
            <button onClick={() => setStatus('IDLE')} className="w-full mt-3 text-xs text-dim hover:text-white py-2">Cancel</button>
          </div>
        )}

        {/* STATE: SUCCESS */}
        {status === 'SUCCESS' && apiResult && (
          <div className="h-full flex flex-col justify-center items-center text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-lime text-midnight flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(163,230,53,0.3)]">
               <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-1 text-white">Sync Complete</h2>
            <div className="text-xs font-mono text-dim bg-surface px-3 py-1 rounded border border-white/10 mb-8">
               ID: {apiResult.id.split('-')[0]}...
            </div>

            <div className="w-full bg-surface border border-white/10 rounded-xl p-5 mb-6">
              <div className="flex justify-between items-end border-b border-white/10 pb-4 mb-4">
                <div className="text-left">
                    <div className="text-xs text-dim uppercase tracking-wider mb-1">Your Net</div>
                    <div className="text-2xl font-mono font-bold text-white">
                        ${(apiResult.pricing_strategy.parallelListPrice * 0.90).toFixed(2)}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-dim uppercase tracking-wider mb-1">Buyer Saves</div>
                    <div className="text-lg font-mono font-bold text-lime">
                        ${apiResult.pricing_strategy.savings}
                    </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-dim justify-center">
                 <span className="w-1.5 h-1.5 rounded-full bg-lime"></span> Live on Dashboard
              </div>
            </div>

            <button 
              onClick={() => setStatus('IDLE')}
              className="w-full border border-white/20 text-white font-bold py-3 rounded-lg hover:bg-white/10 transition"
            >
              Scan Another Item
            </button>
          </div>
        )}

        {/* STATE: ERROR */}
        {status === 'ERROR' && (
          <div className="h-full flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500 text-red-500 flex items-center justify-center mb-4">
               <AlertTriangle size={32} />
            </div>
            <h2 className="text-lg font-bold mb-2">Sync Failed</h2>
            <p className="text-red-400 text-sm mb-8 px-4">{errorMsg}</p>
            <button 
              onClick={() => setStatus('IDLE')}
              className="w-full border border-white/20 text-white font-bold py-3 rounded-lg hover:bg-white/5 transition"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="py-3 text-center border-t border-white/5 bg-midnight">
         <p className="text-[10px] text-dim font-mono flex items-center justify-center gap-1 opacity-50">
           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
           SECURED BY STRIPE
         </p>
      </div>
    </div>
  );
}

export default App;
