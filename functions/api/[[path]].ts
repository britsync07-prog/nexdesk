const api = "https://nexdesk-api.mehedy303.workers.dev";

export async function onRequest(context: { request: Request }) {
  const url = new URL(context.request.url);
  const upstream = new Request(`${api}${url.pathname}${url.search}`, context.request);
  upstream.headers.set("x-nexdesk-origin", url.origin);
  const result = await fetch(upstream);
  const headers = new Headers(result.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(result.body, { status: result.status, headers });
}
