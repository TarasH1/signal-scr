import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import fs from 'fs';
import chokidar from 'chokidar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let currentWatcher: chokidar.FSWatcher | null = null;
let watcherStatus: 'idle' | 'running' | 'error' = 'idle';
let watcherLogs: { time: string; type: 'info' | 'send' | 'error'; msg: string }[] = [];

function addLog(type: 'info' | 'send' | 'error', msg: string) {
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  watcherLogs = [{ time, type, msg }, ...watcherLogs].slice(0, 50);
}

async function handleFile(filePath: string, bridgeUrl: string, account: string, recipient: string) {
  if (!filePath.match(/\.(png|jpe?g|gif|webp|bmp)$/i)) return;
  addLog('info', `Detected image update: ${path.basename(filePath)}`);
  
  try {
    const fileData = fs.readFileSync(filePath);
    const base64Data = fileData.toString('base64');

    const signalResponse = await fetch(`${bridgeUrl}/v2/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: account,
        recipients: [recipient],
        base64_attachments: [base64Data],
        message: `File updated: ${path.basename(filePath)} at ${new Date().toLocaleString()}`,
      }),
    });

    if (!signalResponse.ok) {
      const errorText = await signalResponse.text();
      addLog('error', `Signal Bridge Error: ${errorText}`);
    } else {
      addLog('send', `Transmitted successfully to: ${recipient}`);
    }
  } catch (err: any) {
    console.error('Signal send failed:', err);
    addLog('error', `Transmission failed: ${err.message}`);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.post('/api/start-watcher', async (req, res) => {
    const { folderPath, bridgeUrl, account, recipient } = req.body;

    if (!folderPath || !bridgeUrl || !account || !recipient) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      if (!fs.existsSync(folderPath)) {
        return res.status(400).json({ error: 'Directory does not exist on the server filesystem' });
      }
      
      const stats = fs.statSync(folderPath);
      if (!stats.isDirectory()) {
         return res.status(400).json({ error: 'The provided path is not a directory' });
      }

      if (currentWatcher) {
        await currentWatcher.close();
      }

      currentWatcher = chokidar.watch(folderPath, {
        persistent: true,
        ignoreInitial: true,
        depth: 0,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        }
      });

      currentWatcher.on('add', (filePath) => handleFile(filePath, bridgeUrl, account, recipient));
      currentWatcher.on('change', (filePath) => handleFile(filePath, bridgeUrl, account, recipient));
      currentWatcher.on('error', (error) => addLog('error', `Watcher error: ${error}`));

      watcherStatus = 'running';
      addLog('info', `Started monitoring: ${folderPath}`);
      res.json({ success: true });
    } catch (err: any) {
      addLog('error', `Failed to start watcher: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/stop-watcher', async (req, res) => {
    if (currentWatcher) {
      await currentWatcher.close();
      currentWatcher = null;
    }
    watcherStatus = 'idle';
    addLog('info', 'Monitoring paused');
    res.json({ success: true });
  });

  app.get('/api/watcher-status', (req, res) => {
    res.json({ status: watcherStatus, logs: watcherLogs });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
