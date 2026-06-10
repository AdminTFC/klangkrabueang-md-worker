export default {
  async fetch(request) {
    const accept = request.headers.get('Accept') || '';
    if (!accept.includes('text/markdown')) return fetch(request);

    const response = await fetch(request);
    const ct = (response.headers.get('Content-Type') || '');
    if (!ct.includes('text/html')) return response;

    const html = await response.text();

    let msg = '';
    try {
      const doc = new DOMParser().parseFromString('<p>test</p>', 'text/html');
      msg = 'DOMParser OK, body: "' + doc.body.textContent.trim() + '"';
    } catch (e) {
      msg = 'DOMParser failed: ' + e.message;
    }

    return new Response('# Test\n\n' + msg + '\n\nHTML length: ' + html.length, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  },
};