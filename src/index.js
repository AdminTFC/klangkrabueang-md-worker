export default {
  async fetch(request) {
    const accept = request.headers.get('Accept') || '';

    if (!accept.includes('text/markdown')) {
      return fetch(request);
    }

    const response = await fetch(request);

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    const html = await response.text();
    const markdown = `# Test\n\nPage fetched OK, length: ${html.length} chars`;

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    });
  },
};