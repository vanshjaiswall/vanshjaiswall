// Local preview server for the profile README assets (not pushed): node github-profile/serve.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml" };
createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  if (path === "/") path = "/preview.html";
  try { const body = await readFile(join(root, path)); res.writeHead(200, { "Content-Type": types[extname(path)] || "text/plain" }); res.end(body); }
  catch { res.writeHead(404); res.end("Not found"); }
}).listen(Number(process.env.PORT) || 4420, function () { console.log("Preview on http://localhost:" + this.address().port); });
