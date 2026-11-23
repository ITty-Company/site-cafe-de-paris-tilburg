# http.server с поддержкой Range (как Cloudflare) — для проверки скраб-видео: python3 serve.py <dir> <port>
import http.server, os, sys, functools
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def send_head(self):
        rng = self.headers.get('Range'); path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path): return super().send_head()
        size = os.path.getsize(path); a, b = rng.replace('bytes=', '').split('-')
        a = int(a) if a else 0; b = int(b) if b else size - 1; b = min(b, size - 1)
        f = open(path, 'rb'); f.seek(a); self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path)); self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {a}-{b}/{size}'); self.send_header('Content-Length', str(b - a + 1)); self.end_headers()
        self._left = b - a + 1; return f
    def copyfile(self, src, dst):
        n = getattr(self, '_left', None)
        if n is None: return super().copyfile(src, dst)
        while n > 0:
            c = src.read(min(65536, n));
            if not c: break
            dst.write(c); n -= len(c)
        self._left = None
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(H, directory=sys.argv[1])).serve_forever()
