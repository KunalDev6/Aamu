// Read-only discovery using the event key. No generation, persistence, SDK or key output.
const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  process.stderr.write('GEMINI_API_KEY is not available. No provider request was made.\n');
  process.exitCode = 2;
} else {
  try {
    const models = [];
    const seenTokens = new Set();
    let pageToken;
    let pages = 0;
    do {
      const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
      url.searchParams.set('pageSize', '1000');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const response = await fetch(url, {
        headers: { 'x-goog-api-key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error(`ListModels returned HTTP ${response.status}. No availability result is inferred.`);
      const body = await response.json();
      if (!body || typeof body !== 'object' || (body.models !== undefined && !Array.isArray(body.models))) {
        throw new Error('ListModels returned an unexpected response shape.');
      }
      for (const model of body.models ?? []) {
        if (!model || typeof model.name !== 'string') throw new Error('ListModels returned an invalid model entry.');
        models.push(model);
      }
      pages += 1;
      pageToken = body.nextPageToken;
      if (pageToken && (typeof pageToken !== 'string' || seenTokens.has(pageToken))) {
        throw new Error('ListModels returned an invalid or repeated page token.');
      }
      if (pageToken) seenTokens.add(pageToken);
    } while (pageToken);

    const unique = [...new Map(models.map(model => [model.name, model])).values()];
    const pick = family => unique
      .filter(model => family.test([model.name, model.baseModelId, model.displayName].filter(Boolean).join(' ')))
      .map(model => ({
        name: model.name,
        displayName: model.displayName ?? null,
        supportedGenerationMethods: model.supportedGenerationMethods ?? [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    process.stdout.write(JSON.stringify({
      checkedAt: new Date().toISOString(),
      source: 'Authenticated Gemini API ListModels',
      pages,
      totalModels: unique.length,
      gemma: pick(/gemma/i),
      lyria: pick(/lyria/i),
      scope: 'Models returned by this key. Listing does not prove generation quota or successful audio/text generation.',
    }, null, 2) + '\n');
  } catch (error) {
    // Do not print provider error bodies, request headers, keys, or arbitrary thrown text.
    const message = error instanceof Error && /^ListModels /.test(error.message)
      ? error.message : 'ListModels failed before a complete result was obtained. No availability result is inferred.';
    process.stderr.write(message + '\n');
    process.exitCode = 1;
  }
}
