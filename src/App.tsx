/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Send, Settings, Clock, CheckCircle2, AlertCircle, X, Shield, Terminal, LayoutDashboard, Database, Activity, Cpu } from 'lucide-react';

export default function App() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'countdown' | 'capturing' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [timeoutSec, setTimeoutSec] = useState(5);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    bridgeUrl: localStorage.getItem('signal_bridge_url') || '',
    account: localStorage.getItem('signal_account') || '',
    recipient: localStorage.getItem('signal_recipient') || '',
  });

  const [logs, setLogs] = useState<{time: string, type: 'info' | 'send' | 'wait', msg: string}[]>([]);

  const addLog = (type: 'info' | 'send' | 'wait', msg: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLogs(prev => [{ time, type, msg }, ...prev].slice(0, 10));
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    localStorage.setItem('signal_bridge_url', config.bridgeUrl);
    localStorage.setItem('signal_account', config.account);
    localStorage.setItem('signal_recipient', config.recipient);
  }, [config]);

  const startProcess = async () => {
    if (!config.bridgeUrl || !config.account || !config.recipient) {
      setShowConfig(true);
      return;
    }

    try {
      addLog('info', 'Requesting display media permission...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }

      setStatus('countdown');
      setCountdown(timeoutSec);
      addLog('info', `Countdown initiated: ${timeoutSec}s`);
    } catch (err) {
      console.error('Failed to get display media:', err);
      setStatus('error');
      setErrorMessage('Permission denied or capture failed.');
      addLog('wait', 'Capture aborted by user or system.');
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'countdown' && countdown !== null) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(prev => (prev !== null ? prev - 1 : 0)), 1000);
      } else {
        captureFrame();
      }
    }
    return () => clearTimeout(timer);
  }, [status, countdown]);

  const captureFrame = () => {
    setStatus('capturing');
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setScreenshot(dataUrl);
        addLog('info', `Capture successful. Size: ${(dataUrl.length / 1024 / 1.33).toFixed(1)}KB`);
        
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        
        setStatus('idle');
      }
    }
  };

  const sendToSignal = async () => {
    if (!screenshot) return;
    setStatus('sending');
    addLog('info', 'Encrypting and transmitting packet...');

    try {
      const response = await fetch('/api/send-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: screenshot,
          bridgeUrl: config.bridgeUrl,
          account: config.account,
          recipient: config.recipient,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send to Signal');
      }

      setStatus('success');
      addLog('send', `Post successful to Signal: ${config.recipient}`);
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message);
      addLog('wait', `Transmission failure: ${err.message}`);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen flex overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900/50 border-r border-slate-800 p-8 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase">SIG-SHOT</span>
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
                <span className="text-slate-500 flex items-center gap-1.5"><Activity className="w-3 h-3"/> State</span>
                <span className={`font-mono ${status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {status === 'idle' ? 'STANDBY' : status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-xs uppercase tracking-tighter">
                <span className="text-slate-500 flex items-center gap-1.5"><Cpu className="w-3 h-3"/> Active Bridge</span>
                <span className="text-slate-300 font-mono truncate max-w-[100px]">
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
              Monitoring <span className="font-bold">{status === 'idle' ? 'Ready' : 'In Progress'}</span>
            </h1>
            <p className="text-slate-500 text-sm">Signal secure capture and transmission node.</p>
          </div>
          <div className="flex gap-4">
            <div className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Logs Buffered</p>
              <p className="text-2xl font-mono text-white">{logs.length}</p>
            </div>
            {screenshot && (
              <button 
                onClick={() => setScreenshot(null)}
                className="px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold transition-all"
              >
                ABORT CAPTURE
              </button>
            )}
          </div>
        </header>

        {/* Action Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Capture Controls */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-lg font-semibold text-white">Capture Interface</h3>
              <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-bold rounded-full border border-blue-600/30 uppercase">
                {status === 'countdown' ? 'Active' : 'Standby'}
              </span>
            </div>

            {!screenshot && status !== 'countdown' ? (
              <div className="mt-8 space-y-6 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Countdown Sequence</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="1" max="30"
                        value={timeoutSec}
                        onChange={(e) => setTimeoutSec(Number(e.target.value))}
                        className="flex-1 accent-blue-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                      />
                      <span className="text-3xl font-mono text-white w-12 text-right">{timeoutSec}s</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={startProcess}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3"
                >
                  <Camera className="w-5 h-5" />
                  INITIALIZE SCREEN CAPTURE
                </button>
              </div>
            ) : status === 'countdown' ? (
              <div className="flex flex-col items-center justify-center py-6 relative z-10">
                <motion.div 
                  key={countdown}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-7xl font-mono text-white mb-2"
                >
                  {countdown}s
                </motion.div>
                <div className="w-full max-w-[200px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: timeoutSec, ease: 'linear' }}
                    className="h-full bg-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-4 uppercase tracking-[0.2em] animate-pulse">Navigating to target window...</p>
              </div>
            ) : (
              <div className="mt-8 flex items-center justify-center py-6 relative z-10">
                <div className="text-center">
                  <CheckCircle2 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <p className="text-white font-bold">FRAME_CAPTURED_V1</p>
                  <p className="text-xs text-slate-500 mt-1">Ready for transmission</p>
                </div>
              </div>
            )}

            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Camera className="w-32 h-32 text-white" />
            </div>
          </div>

          {/* Preview / Transmission Section */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col min-h-[300px]">
            <h3 className="text-lg font-semibold text-white mb-4">Transmission Payload</h3>
            <div className="flex-1 flex flex-col justify-center gap-4">
              {!screenshot ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
                  <div className="text-center p-6">
                    <Database className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Null Payload</p>
                    <p className="text-xs text-slate-600">No screenshot in buffer</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-700 aspect-video bg-black">
                     <img 
                      src={screenshot} 
                      alt="Capture Preview" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-[10px] text-white uppercase tracking-[0.3em] font-bold">PREVIEW_NODE_01</p>
                    </div>
                  </div>
                  <button 
                    onClick={sendToSignal}
                    disabled={status === 'sending'}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all"
                  >
                    {status === 'sending' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        TRANSMITTING...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        SEND TO SIGNAL GROUP
                      </>
                    )}
                  </button>
                </>
              )}
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
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Signal Bridge Environment</h3>
                  <p className="text-slate-500 text-sm">Configure your REST API endpoint and account credentials.</p>
                </div>
                <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Source Account</label>
                  <input 
                    type="text" 
                    value={config.account}
                    onChange={(e) => setConfig({...config, account: e.target.value})}
                    placeholder="+380XXXXXXXXX"
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
                  log.type === 'info' ? 'text-blue-400' : 'text-slate-400'
                }>
                  {log.type.toUpperCase()}
                </span>{' '}
                {log.msg}
              </motion.p>
            ))}
            {status === 'idle' && logs.length > 0 && (
              <p className="text-blue-500 animate-pulse mt-4">[SYSTEM] STANDBY... AWAITING COMMAND</p>
            )}
          </div>
        </section>
      </main>

      {/* Media elements */}
      <video ref={videoRef} className="hidden" muted />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}


