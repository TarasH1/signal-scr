/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Send, Settings, CheckCircle2, X, Terminal, LayoutDashboard, Database, Activity, Cpu, FolderOpen } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    bridgeUrl: localStorage.getItem('signal_bridge_url') || '',
    account: localStorage.getItem('signal_account') || '',
    recipient: localStorage.getItem('signal_recipient') || '',
    folderPath: localStorage.getItem('signal_watcher_path') || 'C:\\Images',
  });

  const [logs, setLogs] = useState<{time: string, type: 'info' | 'send' | 'error', msg: string}[]>([]);

  useEffect(() => {
    localStorage.setItem('signal_bridge_url', config.bridgeUrl);
    localStorage.setItem('signal_account', config.account);
    localStorage.setItem('signal_recipient', config.recipient);
    localStorage.setItem('signal_watcher_path', config.folderPath);
  }, [config]);

  // Poll server for watcher status and logs
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/watcher-status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          setLogs(data.logs);
        }
      } catch (e) {
        setStatus('error');
      }
    };
    
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const startWatcher = async () => {
    if (!config.folderPath || !config.bridgeUrl || !config.account || !config.recipient) {
      setShowConfig(true);
      return;
    }
    
    try {
      const response = await fetch('/api/start-watcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start watching');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const stopWatcher = async () => {
    try {
      await fetch('/api/stop-watcher', { method: 'POST' });
    } catch (e) {
      // Ignored
    }
  };

  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen flex overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900/50 border-r border-slate-800 p-8 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <FolderOpen className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase flex-1 leading-none">DIR-SHOT</span>
        </div>

        <nav className="space-y-8 flex-1">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">Navigation</p>
            <button 
              onClick={() => setShowConfig(false)}
              className={`w-full px-4 py-2.5 rounded-lg flex items-center gap-3 border transition-all ${!showConfig ? 'bg-slate-800/50 text-blue-400 border-slate-700/50' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
            >
              {!showConfig && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>}
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            <button 
              onClick={() => setShowConfig(true)}
              className={`w-full px-4 py-2.5 rounded-lg flex items-center gap-3 border transition-all ${showConfig ? 'bg-slate-800/50 text-blue-400 border-slate-700/50' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
            >
              {showConfig && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>}
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Configuration</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">Service Status</p>
            <div className="space-y-3">
              <div className="flex justify-between text-xs uppercase tracking-tighter">
                <span className="text-slate-500 flex items-center gap-1.5"><Activity className="w-3 h-3"/> Watcher Loop</span>
                <span className={`font-mono ${status === 'error' ? 'text-red-400' : status === 'running' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-xs uppercase tracking-tighter">
                <span className="text-slate-500 flex items-center gap-1.5"><Cpu className="w-3 h-3"/> Active Bridge</span>
                <span className="text-slate-300 font-mono truncate max-w-[100px]" title={config.bridgeUrl}>
                  {config.bridgeUrl ? new URL(config.bridgeUrl).hostname : 'NONE'}
                </span>
              </div>
            </div>
          </div>
        </nav>

        {config.recipient && (
          <div className="mt-auto p-4 bg-slate-900 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Target Destination</p>
            <p className="text-sm text-white font-medium truncate">{config.recipient}</p>
            <p className="text-[10px] text-blue-500 font-mono">ACCOUNT: {config.account || 'NOT_SET'}</p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 flex flex-col gap-8 max-h-screen overflow-y-auto">
        {/* Header Bar */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-white leading-none mb-2">
              Directory <span className="font-bold">{status === 'idle' ? 'Ready' : 'Monitoring'}</span>
            </h1>
            <p className="text-slate-500 text-sm">Automated transmission node for file system events.</p>
          </div>
          <div className="flex gap-4">
            <div className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Logs Buffered</p>
              <p className="text-2xl font-mono text-white">{logs.length}</p>
            </div>
          </div>
        </header>

        {/* Action Grid */}
        <section className="grid grid-cols-1 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-lg font-semibold text-white">Monitoring Control</h3>
              <span className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase ${status === 'running' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' : status === 'error' ? 'bg-red-600/20 text-red-400 border-red-600/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                {status === 'running' ? 'Active' : status}
              </span>
            </div>

            <div className="mt-8 relative z-10">
              {errorMessage && (
                <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-4 rounded-xl mb-6 text-sm flex justify-between items-center">
                   <span>{errorMessage}</span>
                   <button onClick={() => setErrorMessage('')} className="p-1 hover:bg-red-500/20 rounded-md">
                     <X className="w-4 h-4"/>
                   </button>
                </div>
              )}

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                 <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Target Directory</p>
                    <p className="font-mono text-blue-400">{config.folderPath}</p>
                 </div>
                 
                 {status === 'running' ? (
                   <button 
                     onClick={stopWatcher}
                     className="bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold px-8 py-3 rounded-xl border border-red-500/20 transition-all uppercase text-sm"
                   >
                     Stop Monitoring
                   </button>
                 ) : (
                    <button 
                      onClick={startWatcher}
                      className="bg-blue-600 text-white hover:bg-blue-500 font-bold px-8 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all uppercase text-sm"
                    >
                      Start Monitoring
                    </button>
                 )}
              </div>
            </div>

            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <FolderOpen className="w-32 h-32 text-white" />
            </div>
          </div>
        </section>

        {/* Configuration Pane (Conditional Overlayish) */}
        <AnimatePresence>
          {showConfig && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Node Environment Config</h3>
                  <p className="text-slate-500 text-sm">Configure your Signal REST API bridge, identities, and target directories.</p>
                </div>
                <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Bridge Endpoint</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={config.bridgeUrl}
                      onChange={(e) => setConfig({...config, bridgeUrl: e.target.value})}
                      placeholder="http://127.0.0.1:8080"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all pl-10"
                    />
                    <Terminal className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Directory Path (Windows/Linux)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={config.folderPath}
                      onChange={(e) => setConfig({...config, folderPath: e.target.value})}
                      placeholder="C:\Screenshots OR /home/user/images"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all pl-10"
                    />
                    <FolderOpen className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Source Signal Account</label>
                  <input 
                    type="text" 
                    value={config.account}
                    onChange={(e) => setConfig({...config, account: e.target.value})}
                    placeholder="+380... OR +123..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Recipient ID</label>
                  <input 
                    type="text" 
                    value={config.recipient}
                    onChange={(e) => setConfig({...config, recipient: e.target.value})}
                    placeholder="Group ID or Phone"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Console / Logs Section */}
        <section className="flex-1 min-h-[200px] bg-black/40 border border-slate-800 rounded-3xl p-8 font-mono text-xs overflow-hidden flex flex-col mb-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
            <span className="ml-4 text-slate-500 uppercase tracking-widest text-[10px]">Security Node Stream Logs</span>
          </div>
          
          <div className="flex-1 space-y-2 overflow-y-auto pr-4 scrollbar-hide">
            {logs.length === 0 && (
              <p className="text-slate-600 italic">No activity recorded for current session.</p>
            )}
            {logs.map((log, i) => (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={i} 
                className="text-slate-500"
              >
                <span className="text-slate-700">[{log.time}]</span>{' '}
                <span className={
                  log.type === 'send' ? 'text-emerald-400' : 
                  log.type === 'info' ? 'text-blue-400' : 'text-red-400'
                }>
                  {log.type.toUpperCase()}
                </span>{' '}
                {log.msg}
              </motion.p>
            ))}
            {status === 'idle' && logs.length > 0 && (
              <p className="text-blue-500 animate-pulse mt-4">[SYSTEM] STANDBY... AWAITING COMMAND</p>
            )}
            {status === 'running' && (
              <p className="text-emerald-500 animate-pulse mt-4">[SYSTEM] MONITORING DIRECTORY...</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


