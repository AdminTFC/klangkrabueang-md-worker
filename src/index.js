import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
});

const ORIGIN_HOST = 'xn--12cfjb8g6bl2ezag5e8e9e.com';

export default {
  async fetch(request) {
    const accept = request.headers.get('Accept') || '';

    if (!accept.includes('text/markdown')) {
      return fetch(request);
    }

    const url = new URL(request.url);
    const originUrl = `${url.protocol}//${ORIGIN_HOST}${url.pathname}${url.search}`;
    const originReq = new Request(originUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow',
    });
    originReq.headers.set('Accept', 'text/html');

    const response = await fetch(originReq, {
      cf: { resolveOverride: ORIGIN_HOST },
    });

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    const html = await response.text();
    const markdown = turndown.turndown(html);

    const mdTokens = Math.round(markdown.length / 4);
    const htmlTokens = Math.round(html.length / 4);

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'x-markdown-tokens': String(mdTokens),
        'x-original-tokens': String(htmlTokens),
      },
    });
  },
};
