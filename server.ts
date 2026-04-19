import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route to send to Signal
  app.post('/api/send-signal', async (req, res) => {
    const { image, bridgeUrl, account, recipient } = req.body;

    if (!image || !bridgeUrl || !account || !recipient) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      // image is base64: data:image/png;base64,...
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');

      // Note: signal-cli-rest-api usually expects a POST to /v2/send
      // We will proxy this.
      // For images, it often expects base64 attachments in the body or multipart.
      // Assuming version 2 of the API: https://bbernhard.github.io/signal-cli-rest-api/
      
      const signalResponse = await fetch(`${bridgeUrl}/v2/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: account,
          recipients: [recipient],
          base64_attachments: [base64Data],
          message: `Screenshot captured at ${new Date().toLocaleString()}`,
        }),
      });

      if (!signalResponse.ok) {
        const errorText = await signalResponse.text();
        throw new Error(`Signal bridge error: ${errorText}`);
      }

      const result = await signalResponse.json();
      res.json({ success: true, result });
    } catch (err: any) {
      console.error('Signal send failed:', err);
      res.status(500).json({ error: err.message });
    }
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
