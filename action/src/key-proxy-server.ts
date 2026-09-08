// A local forwarding proxy that holds the provider key so the agent process
// and every tool subprocess it spawns never see it. The CLI is pointed at
// http://127.0.0.1:<port> with a placeholder key; this process rewrites the
// auth header on the way out.
//
//   node key-proxy-server.ts <upstream-origin> <header-name> <key-source> [prefix]
//
// <key-source> is `-` to read the key from stdin (what proxy.ts does: the
// key then never appears in this process's environment block), or the name
// of an environment variable (for tests). Prints the port it chose on
// stdout, once, then serves until killed.
import { createServer, request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

const [upstream, headerName, keySource, prefix = ""] = process.argv.slice(2);
let key = "";
if (keySource === "-") {
  try {
    key = readFileSync(0, "utf8").trim();
  } catch {
    key = "";
  }
} else if (keySource) {
  key = process.env[keySource] ?? "";
}
if (!upstream || !headerName || !key) {
  console.error("usage: key-proxy-server.ts <upstream-origin> <header-name> <-|ENV_VAR> [prefix]");
  process.exit(2);
}
const up = new URL(upstream);
const client = up.protocol === "https:" ? httpsRequest : httpRequest;

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://placeholder");
  // Some SDKs put the key in the query string; never forward whatever the
  // agent set there, and never forward its placeholder header either.
  url.searchParams.delete("key");
  const headers: IncomingHttpHeaders = { ...req.headers };
  delete headers.host;
  delete headers["x-api-key"];
  delete headers["x-goog-api-key"];
  delete headers.authorization;
  headers[headerName] = prefix + key;
  headers.host = up.host;

  const out = client(
    {
      protocol: up.protocol,
      hostname: up.hostname,
      port: up.port || (up.protocol === "https:" ? 443 : 80),
      method: req.method,
      path: (up.pathname.replace(/\/$/, "") + url.pathname).replace(/\/{2,}/g, "/") + url.search,
      headers,
    },
    (upRes) => {
      res.writeHead(upRes.statusCode ?? 502, upRes.headers);
      upRes.pipe(res);
    },
  );
  out.on("error", (err) => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end("keyproxy: upstream error: " + err.message);
  });
  req.pipe(out);
});

server.listen(0, "127.0.0.1", () => {
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  process.stdout.write(`${port}\n`);
});
