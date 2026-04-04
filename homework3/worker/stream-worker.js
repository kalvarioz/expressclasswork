export default {
  async fetch(request, env) {

    // Basic auth check Express app sends a secret header
    const authHeader = request.headers.get("X-Stream-Token");
    if (authHeader !== env.STREAM_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    // Pull the object key from the URL path
    // e.g. /stream/movies/interstellar.mp4 = movies/interstellar.mp4
    const url = new URL(request.url);
    const key = url.pathname.replace("/stream/", "");

    // Get the object from R2, forwarding the Range header if present
    // This is what allows video seeking, the browser requests specific byte ranges
    const rangeHeader = request.headers.get("Range");

    const object = await env.MOVIE_BUCKET.get(key, {
      range: rangeHeader ? parseRange(rangeHeader) : undefined,
    });

    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", "video/mp4");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "no-store");

    // If a range was requested, respond with 206 Partial Content
    if (rangeHeader && object.range) {
      const { offset, length } = object.range;
      const total = object.size;
      headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${total}`);
      headers.set("Content-Length", String(length));
      return new Response(object.body, { status: 206, headers });
    }

    headers.set("Content-Length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  }
};

function parseRange(rangeHeader) {
  // "bytes=0-1048575" = { offset: 0, length: 1048576 }
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) return undefined;
  const offset = parseInt(match[1]);
  const end = match[2] ? parseInt(match[2]) : undefined;
  return end !== undefined
    ? { offset, length: end - offset + 1 }: { offset, suffix: undefined };
}