import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuggestionsController, suggestionControls } from '../../src/goals/suggestions.ts';
import type { ShrinkResult } from '../src/goals/service.ts';
import type { Steps } from '../src/goals/contracts.ts';

const suggested: Steps = { tiny: 'Open a book.', small: 'Read five minutes.', full: 'Read twenty minutes.' };
const manual: Steps = { tiny: '  Find my library card.  ', small: 'Browse the library.', full: 'Visit the library.' };
const empty: Steps = { tiny: '', small: '', full: '' };
const ready = (): ShrinkResult => ({
  verdict: 'ok', steps: { ...suggested }, source: 'model', judgeSource: 'decisions', sizeHints: {},
});
const support = (): ShrinkResult => ({ verdict: 'needs_support', steps: null, source: 'model', judgeSource: 'decisions' });
const failed = (): ShrinkResult => ({ verdict: null, steps: null, source: 'fallback', error: 'suggestions_unavailable' });
function deferred() {
  let resolve: (result: ShrinkResult) => void = () => { throw new Error('Uninitialized fixture'); };
  let reject: (error: unknown) => void = () => { throw new Error('Uninitialized fixture'); };
  const promise = new Promise<ShrinkResult>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function controller(draft?: Steps) {
  return createSuggestionsController({ goalId: 'read', goalText: 'Read more', draft });
}

test('an untouched initial result fills editable fields without an approval/save operation', async () => {
  const c = controller();
  assert.equal((await c.begin(Promise.resolve(ready())).settled).status, 'ready');
  assert.deepEqual(c.getState().draft, suggested);
  assert.equal(c.getState().panel, 'none');
  assert.equal('approve' in c || 'save' in c || 'sync' in c, false);
});

test('manual entry keeps the shared request alive and offers its late result separately', async () => {
  const c = controller(); const request = deferred();
  const started = c.begin(request.promise);
  c.writeManually();
  for (const size of ['tiny', 'small', 'full'] as const) c.editDraft(size, manual[size]);
  assert.equal(c.getState().status, 'loading');
  assert.equal(c.getState().requestId, started.requestId);
  const original = ready(); request.resolve(original);
  assert.equal(await request.promise, original); // Other privacy consumers retain the original promise/result.
  assert.equal((await started.settled).status, 'ready');
  assert.deepEqual(c.getState().draft, manual);
  assert.deepEqual(c.getState().suggestions?.steps, suggested);
  assert.equal(c.getState().panel, 'ready');
});

test('existing manual text needs one explicit Replace confirmation, then still needs Approve', async () => {
  const c = controller(manual);
  await c.begin(Promise.resolve(ready())).settled;
  assert.equal(c.viewSuggestions(), true);
  assert.deepEqual(c.useSuggestions(), { status: 'confirmation_required' });
  assert.deepEqual(c.getState().draft, manual);
  assert.equal(c.getState().panel, 'confirm_replace');
  assert.equal(suggestionControls.confirmation, 'Replace the steps you wrote?');
  assert.equal(suggestionControls.replace, 'Replace');
  assert.equal(suggestionControls.keep, 'Keep mine');
  assert.deepEqual(c.confirmReplace(), { status: 'applied', requiresApproval: true });
  assert.deepEqual(c.getState().draft, suggested);
  assert.equal(c.getState().panel, 'none');
  assert.deepEqual(c.confirmReplace(), { status: 'unavailable' });
});

test('the separate result exposes the exact approved ready/view/use labels', () => {
  assert.equal(suggestionControls.ready, 'Suggestions are ready');
  assert.equal(suggestionControls.view, 'View');
  assert.equal(suggestionControls.use, 'Use these steps');
});

test('Keep mine from the preview or confirmation preserves manual text exactly', async () => {
  for (const confirm of [false, true]) {
    const c = controller(manual);
    await c.begin(Promise.resolve(ready())).settled;
    c.viewSuggestions();
    if (confirm) c.useSuggestions();
    assert.equal(c.keepMine(), true);
    assert.deepEqual(c.getState().draft, manual);
    assert.equal(c.getState().panel, 'none');
    assert.deepEqual(c.confirmReplace(), { status: 'unavailable' });
  }
});

test('an empty manual draft needs no replacement confirmation but still needs Approve', async () => {
  const c = controller(); c.writeManually();
  await c.begin(Promise.resolve(ready())).settled;
  c.viewSuggestions();
  assert.deepEqual(c.useSuggestions(), { status: 'applied', requiresApproval: true });
  assert.deepEqual(c.getState().draft, suggested);
});

test('edits after a replacement prompt invalidate that prompt before any overwrite', async () => {
  const c = controller(manual);
  await c.begin(Promise.resolve(ready())).settled;
  c.viewSuggestions(); c.useSuggestions();
  c.editDraft('tiny', 'Use the card in my wallet.');
  assert.deepEqual(c.confirmReplace(), { status: 'unavailable' });
  assert.equal(c.getState().draft.tiny, 'Use the card in my wallet.');
  assert.deepEqual(c.useSuggestions(), { status: 'confirmation_required' });
  assert.deepEqual(c.confirmReplace(), { status: 'applied', requiresApproval: true });
});

test('failure or rejection preserves the manual draft and exposes no raw exception', async () => {
  for (const reject of [false, true]) {
    const c = controller(manual); const request = deferred();
    const started = c.begin(request.promise);
    if (reject) request.reject(new Error('PRIVATE PROVIDER BODY'));
    else request.resolve(failed());
    assert.equal((await started.settled).status, 'failed');
    assert.deepEqual(c.getState().draft, manual);
    assert.equal(c.getState().suggestions, null);
    assert.doesNotMatch(JSON.stringify(c.getState()), /PRIVATE PROVIDER BODY/);
    assert.equal(c.viewSuggestions(), false);
  }
});

test('needs_support is a distinct settlement for the privacy flow and never changes manual fields', async () => {
  const c = controller(manual); const request = deferred();
  const started = c.begin(request.promise); request.resolve(support());
  assert.deepEqual(await started.settled, { requestId: started.requestId, status: 'needs_support' });
  assert.deepEqual(c.getState().draft, manual);
  assert.equal(c.getState().suggestions, null);
  assert.equal(c.getState().panel, 'none');
  assert.equal((await request.promise).verdict, 'needs_support');
});

test('an older request cannot replace a newer result or apply an older support verdict', async () => {
  const c = controller(manual); const oldRequest = deferred(); const newRequest = deferred();
  const old = c.begin(oldRequest.promise); const current = c.begin(newRequest.promise);
  assert.notEqual(old.requestId, current.requestId);
  newRequest.resolve(ready()); await current.settled;
  oldRequest.resolve(support());
  assert.equal((await old.settled).status, 'stale');
  assert.equal(c.getState().status, 'ready');
  assert.deepEqual(c.getState().draft, manual);
  assert.deepEqual(c.getState().suggestions?.steps, suggested);
});

test('a changed goal identity or title invalidates its pending result', async () => {
  for (const [goalId, goalText] of [['other', 'Walk outside'], ['read', 'Read poetry']]) {
    const c = controller(manual); const request = deferred();
    const started = c.begin(request.promise);
    c.setGoal(goalId, goalText, empty);
    request.resolve(ready());
    assert.equal((await started.settled).status, 'stale');
    assert.equal(c.getState().goalText, goalText);
    assert.equal(c.getState().status, 'idle');
    assert.deepEqual(c.getState().draft, empty);
    assert.equal(c.getState().suggestions, null);
  }
});

test('a newer request invalidates an already-visible replacement confirmation', async () => {
  const c = controller(manual);
  await c.begin(Promise.resolve(ready())).settled;
  c.viewSuggestions(); c.useSuggestions();
  const next = deferred(); const started = c.begin(next.promise);
  assert.deepEqual(c.confirmReplace(), { status: 'unavailable' });
  assert.deepEqual(c.getState().draft, manual);
  next.resolve(failed()); await started.settled;
});

test('caller mutations cannot alter the draft or suggestions awaiting confirmation', async () => {
  const input = { ...manual }; const c = controller(input); const result = ready();
  await c.begin(Promise.resolve(result)).settled;
  input.tiny = 'Changed outside the controller.';
  if (result.steps) result.steps.tiny = 'Changed provider response.';
  const snapshot = c.getState();
  snapshot.draft.tiny = 'Changed snapshot.';
  if (snapshot.suggestions) snapshot.suggestions.steps.tiny = 'Changed suggestions snapshot.';
  assert.deepEqual(c.getState().draft, manual);
  c.viewSuggestions(); c.useSuggestions(); c.confirmReplace();
  assert.deepEqual(c.getState().draft, suggested);
});
