import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

export const aiProxyRouter = Router();

const target = process.env.AI_SERVICE_URL;

if (!target) {
  // Provide a friendly message if AI_SERVICE_URL is missing
  aiProxyRouter.use((req, res) => {
    res.status(500).json({ error: 'AI_SERVICE_URL is not configured on the backend' });
  });
} else {
  aiProxyRouter.use(
    '/',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      // Remove the /ai prefix when forwarding to the AI service
      pathRewrite: { '^/ai': '' },
      onError(err, _req, res) {
        res.status(502).json({ error: 'AI service unavailable', detail: String(err?.message || err) });
      },
    })
  );
}


