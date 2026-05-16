import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import type { RequestHandler } from "express";
import type { ServerResponse } from "node:http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { logger } from "./logger";

const httpAgent = new HttpAgent({ keepAlive: true, maxSockets: 100 });
const httpsAgent = new HttpsAgent({ keepAlive: true, maxSockets: 100 });

export function createUpstreamProxy(target: string, timeoutMs: number, pathRewrite?: Record<string, string>): RequestHandler {
  const agent = target.startsWith("https://") ? httpsAgent : httpAgent;

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    timeout: timeoutMs,
    proxyTimeout: timeoutMs,
    agent,
    pathRewrite,
    on: {
      error(err, _req, res) {
        logger.error({ err, target }, "upstream proxy error");
        if (res && "headersSent" in res && !(res as ServerResponse).headersSent) {
          (res as ServerResponse)
            .writeHead(502, { "Content-Type": "application/json" })
            .end(
              JSON.stringify({
                success: false,
                error: { code: "BAD_GATEWAY", message: "Upstream unavailable" },
              })
            );
        }
      },
    },
  });
}
