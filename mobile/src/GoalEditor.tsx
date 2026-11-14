import React, { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { uuid } from 'expo';
import { router } from 'expo-router';
import { apiPost } from './api';
import { goalSynchronizer } from './GoalSyncCoordinator';
import { markGoalSyncPending } from '../../src/goals/sync';
import { useStore, sizeLabels } from './store';
import { AppText, Card, Field, PillButton } from './ui';
import { createGoalClient } from '../../src/goals/client';
import { approveGoal, beginGoalCheck, finishGoalCheck, type ApprovalPorts, type LocalGoal } from '../../src/goals/approval';
import { createSuggestionsController } from '../../src/goals/suggestions';
import { goalAdvisory, goalCopy, stepHintLine } from '../../src/goals/copy';
import { LadderPlaceholder, LadderRung, ladderIntro } from './StepLadder';
import { TextAction } from './TextAction';
import { colors } from '../../src/theme';
import { hasAnyIntentPhrase } from '../../shared/safety/checker.mjs';
import type { Steps, StepSize, StepHints } from '../../api/src/goals/contracts';
import type { HintResult, ShrinkResult } from '../../api/src/goals/service';
type ShrinkSuccess = Extract<ShrinkResult, { steps: Steps }>;

const sizes: StepSize[] = ['tiny', 'small', 'full'];
const emptySteps = (): Steps => ({ tiny: '', small: '', full: '' });
const supportLine = 'You can change the wording, or write your own steps.';
const privateGoal = (goal: LocalGoal) => goal.localOnly || goal.latestVerdict === 'needs_support' || hasAnyIntentPhrase(goal.goalText);
type Store = ReturnType<typeof useStore>;
type LocalDraft = { title: string; draft: Steps; working: LocalGoal; showSteps: boolean; supportSeen: boolean };
type StoredGoal = LocalGoal & { editorDraft?: LocalDraft };

// Keep a single in-flight request/controller alive while Help is pushed over the
// editor. Only draft text/coordination is persisted, never provider probabilities.
type Session = ReturnType<typeof createSession>;
const sessions = new Map<string, Session>();
const editorBindings = new Map<string, string>();
const sessionListeners = new Set<() => void>();
let sessionVersion = 0;
const getSessionVersion = () => sessionVersion;
const subscribeSessions = (listener: () => void) => { sessionListeners.add(listener); return () => { sessionListeners.delete(listener); }; };
function notifySessions() { sessionVersion++; for (const listener of sessionListeners) listener(); }
function createSession(id: string, original: StoredGoal, store: Pick<Store, 'read' | 'update'>) {
  const restored = original.editorDraft;
  const { editorDraft: _draft, ...originalGoal } = original;
  let working: LocalGoal = restored?.working ?? originalGoal;
  const interrupted = working.goalCheck?.state === 'pending' || working.hintCheckRevision !== undefined;
  // A process restart has no surviving request. Release its pending marker as a
  // technical interruption; the person can explicitly try again from this editor.
  if (working.goalCheck?.state === 'pending') working = { ...working, goalCheck: { ...working.goalCheck, state: 'complete' } };
  working = { ...working, hintCheckRevision: undefined };
  const controller = createSuggestionsController({ goalId: id, goalText: restored?.title ?? original.goalText,
    draft: restored?.draft ?? original.steps });
  const listeners = new Set<() => void>();
  let showSteps = restored?.showSteps ?? Object.values(original.steps).some(Boolean);
  let supportSeen = restored?.supportSeen ?? privateGoal(original);
  let hints: StepHints = {};
  let manualBlocked = false;
  let saved = false;
  let approvalPending = false;
  let titleChoice = false;
  let changedTitleDecision: string | null = null;
  let finishingOriginal = false;
  let requestCounter = 0;

  function persist() {
    const view = controller.getState();
    const editorDraft: LocalDraft = { title: view.goalText, draft: view.draft, working, showSteps, supportSeen };
    store.update(state => ({ ...state, goals: state.goals.map(goal => goal.id === id ? { ...goal, editorDraft } : goal) }));
  }
  function emit() { persist(); for (const listener of listeners) listener(); notifySessions(); }
  function help() { router.push('/help?from=goal'); }
  const ports: ApprovalPorts = {
    allGoals: () => store.read().goals.map(goal => goal.id === id ? working : goal),
    saveLocal(value) {
      working = value;
      store.update(state => {
        const next: ReturnType<Store['read']> = { ...state, goals: state.goals.map(goal => {
        if (goal.id !== id) return goal;
        if (value.approved) return { ...value, editorDraft: (goal as StoredGoal).editorDraft };
        // A fresh title/draft does not overwrite an approved goal before Approve.
        // A privacy result still removes its previously synced text immediately.
        return privateGoal(value) ? { ...goal, localOnly: true, latestVerdict: 'needs_support', supportEvidence: value.supportEvidence } : goal;
        }) };
        return value.approved || privateGoal(value) ? markGoalSyncPending(next) : next;
      });
      emit();
    },
    requestHints: (body, signal) => apiPost<HintResult>('/goals/hints', body, signal),
    async syncGoals() {
      await goalSynchronizer(store).flush();
      emit();
    },
    showHelp() {
      const returnInline = finishingOriginal && supportSeen;
      supportSeen = true; showSteps = false; hints = {};
      emit();
      if (!returnInline) help();
    },
  };
  const client = createGoalClient({
    shrink: (body, signal) => apiPost<ShrinkResult>('/goals/shrink', body, signal),
    hints: (body, signal) => apiPost<HintResult>('/goals/hints', body, signal),
  });

  function setWorkingTitle(title: string) {
    if (title !== working.goalText) working = { ...working, goalText: title, approved: false,
      revision: working.revision + 1, goalCheck: undefined, hintCheckRevision: undefined };
  }
  async function runCheck(regenerate = false) {
    const view = controller.getState();
    if (!view.goalText.trim() || view.status === 'loading') return;
    const committed = store.read().goals.find(goal => goal.id === id);
    if (!regenerate && committed?.approved && view.goalText !== committed.goalText && changedTitleDecision !== view.goalText) {
      titleChoice = true; emit(); return;
    }
    titleChoice = false;
    setWorkingTitle(view.goalText);
    if (regenerate) {
      changedTitleDecision = view.goalText;
      controller.setGoal(id, view.goalText, emptySteps()); showSteps = false;
    }
    saved = false; manualBlocked = false; hints = {};
    const requestId = `${id}:${++requestCounter}:${Date.now()}`;
    beginGoalCheck(id, requestId, ports);
    // A single promise feeds both independent coordinators; manual entry does
    // not cancel it, start another request, or overwrite a later manual draft.
    const request = client.shrink(view.goalText);
    const suggestions = controller.begin(request);
    emit();
    void suggestions.settled.then(settlement => {
      if (settlement.status === 'ready') {
        const next = controller.getState(); showSteps = true;
        if (next.editing === 'suggestions') hints = next.suggestions?.sizeHints ?? {};
      }
      if (settlement.status === 'failed') { showSteps = true; controller.writeManually(); }
      emit();
    });
    const result = await request;
    finishingOriginal = true;
    const finished = finishGoalCheck(id, requestId, result, ports);
    finishingOriginal = false;
    await finished;
    emit();
  }

  function changeTitle(title: string) {
    const view = controller.getState();
    controller.setGoal(id, title, view.draft);
    saved = false; titleChoice = false; manualBlocked = false; hints = {};
    // Invalidate stale checks by their captured title without sending draft text.
    if (working.goalCheck?.state === 'pending') {
      working = { ...working, goalCheck: undefined };
    }
    emit();
  }
  function keepStepsForTitle() {
    const view = controller.getState();
    changedTitleDecision = view.goalText; titleChoice = false;
    setWorkingTitle(view.goalText); controller.writeManually(); showSteps = true;
    if (hasAnyIntentPhrase(view.goalText)) {
      const requestId = `${id}:local:${++requestCounter}`;
      beginGoalCheck(id, requestId, ports); finishingOriginal = true;
      void finishGoalCheck(id, requestId, { verdict: 'needs_support', source: 'model', judgeSource: 'phrase_list', steps: null }, ports);
      finishingOriginal = false;
    }
    emit();
  }
  function manual() {
    const view = controller.getState();
    if (privateGoal(working) && view.editing === 'suggestions') controller.setGoal(id, view.goalText, emptySteps());
    controller.writeManually(); showSteps = true; saved = false; emit();
  }
  function edit(size: StepSize, text: string) {
    controller.editDraft(size, text); manualBlocked = false; saved = false; hints = {}; emit();
  }
  async function approve(onApproved: () => void) {
    const view = controller.getState();
    if (!view.goalText.trim() || !sizes.every(size => view.draft[size].trim() && view.draft[size].length <= 60)) return;
    if (saved && working.goalText === view.goalText && sizes.every(size => working.steps[size] === view.draft[size])) return;
    const committed = store.read().goals.find(goal => goal.id === id);
    if (committed?.approved && view.goalText !== committed.goalText && changedTitleDecision !== view.goalText) {
      titleChoice = true; emit(); return;
    }
    setWorkingTitle(view.goalText);
    if (hasAnyIntentPhrase(view.goalText) && !working.localOnly) {
      const requestId = `${id}:local:${++requestCounter}`;
      beginGoalCheck(id, requestId, ports); finishingOriginal = true;
      const done = finishGoalCheck(id, requestId, { verdict: 'needs_support', source: 'model', judgeSource: 'phrase_list', steps: null }, ports);
      finishingOriginal = false; await done; return;
    }
    approvalPending = true; manualBlocked = false;
    const resultPromise = approveGoal(working, view.draft, view.editing === 'manual', ports);
    // approveGoal saves synchronously before its first await. Navigation/Continue
    // eligibility must not wait for optional post-approval hints.
    if (working.approved && sizes.every(size => working.steps[size] === view.draft[size])) {
      saved = true; onApproved();
    }
    emit();
    const result = await resultPromise;
    approvalPending = false;
    if (result.status === 'blocked_manual_step') { manualBlocked = true; saved = false; }
    const currentDraft = controller.getState();
    if (currentDraft.goalText === view.goalText && sizes.every(size => currentDraft.draft[size] === view.draft[size]) &&
      (result.status === 'approved_with_hints' || result.status === 'approved_deferred') && result.hints?.status === 'ready') hints = result.hints.sizeHints;
    emit();
  }
  if (interrupted) ports.saveLocal(working);
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getState: () => ({ view: controller.getState(), working, showSteps, supportSeen, hints, manualBlocked, saved, approvalPending, titleChoice }),
    changeTitle, runCheck, manual, edit, approve, keepStepsForTitle, help,
    viewSuggestions() { controller.viewSuggestions(); emit(); },
    useSuggestions() { controller.useSuggestions(); saved = false; showSteps = true; hints = controller.getState().suggestions?.sizeHints ?? {}; emit(); },
    replace() { controller.confirmReplace(); saved = false; showSteps = true; hints = controller.getState().suggestions?.sizeHints ?? {}; emit(); },
    keepMine() { controller.keepMine(); emit(); },
  };
}

/** Starting points for someone who can't think of a goal. Choosing one fills the
 * goal and finds its steps straight away; the person can still change both. */
const goalIdeas = ['Get outside more', 'Call my friends more often', 'Cook real meals again',
  'Move my body a little each day', 'Read more', 'Get back to a hobby I used to love'];
function GoalIdeas({ onChoose }: { onChoose(goal: string): void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <TextAction label="Not sure what to choose? See some ideas" onPress={() => setOpen(true)} />;
  return <Card tone="protected" padding={20} style={{ gap: 12 }}>
    <AppText variant="label">Some places to start</AppText>
    <AppText tone="secondary">Pick one that feels a little bit true. You can change it afterwards.</AppText>
    {goalIdeas.map(idea => <PillButton key={idea} label={idea} variant="secondary" outlined onPress={() => { setOpen(false); onChoose(idea); }} />)}
    <TextAction label="Close" onPress={() => setOpen(false)} />
  </Card>;
}

const durationNames = ['under 2 minutes', '2 to 10 minutes', '10 to 30 minutes', 'more than 30 minutes'];
const verdictNames = { ok: 'a clear place to start', too_big: 'a big goal, so the steps are a starting point', too_vague: 'a broad goal, so the steps are a starting point' };
/** Demo-mode only (the server omits these numbers otherwise): what each model contributed. */
function ModelDetails({ details }: { details: NonNullable<ShrinkSuccess['underTheHood']> }) {
  const [open, setOpen] = useState(false);
  if (!open) return <TextAction label="How the AI checked these steps" onPress={() => setOpen(true)} />;
  return <Card tone="protected" padding={20} style={{ gap: 12 }}>
    <AppText variant="label">How the AI checked these steps</AppText>
    <AppText tone="secondary">Gemini Decision sorted the goal into a kind of activity, which sets the research-based rules. Gemma wrote the three steps under those rules. Gemini Decision then estimated how long each step takes.</AppText>
    <AppText tone="secondary">{`Goal: ${verdictNames[details.goalVerdict]}.`}</AppText>
    {details.durationProbabilities && sizes.map(size => {
      const odds = details.durationProbabilities![size]; const best = odds.indexOf(Math.max(...odds));
      return <View key={size} style={{ gap: 6 }}>
        <AppText variant="caption">{`${sizeLabels[size]}: most likely ${durationNames[best]} (${Math.round(odds[best] * 100)}%)`}</AppText>
        <View style={{ flexDirection: 'row', gap: 4, height: 8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {odds.map((value, index) => <View key={index} style={{ flex: Math.max(0.02, value), borderRadius: 4,
            backgroundColor: index === best ? colors.textSecondary : colors.lineQuiet }} />)}
        </View>
      </View>;
    })}
    <TextAction label="Hide" onPress={() => setOpen(false)} />
  </Card>;
}

export function GoalEditor({ onApproved, goalId }: { onApproved: () => void; goalId?: string }) {
  const store = useStore();
  const binding = useId();
  useSyncExternalStore(subscribeSessions, getSessionVersion, getSessionVersion);
  useEffect(() => {
    const bound = editorBindings.get(binding);
    if (!store.ready || (bound && (!goalId || bound === goalId))) return;
    const existing = goalId ? store.read().goals.find(goal => goal.id === goalId)
      : store.read().goals.find(goal => !goal.approved);
    if (!existing && store.read().goals.length >= 3) return;
    const id = existing?.id ?? uuid.v4();
    const goal: StoredGoal = existing ?? { id, goalText: '', steps: emptySteps(), localOnly: false,
      latestVerdict: null, revision: 0, approved: false };
    if (!existing) store.update(state => ({ ...state, goals: [...state.goals, goal] }));
    if (!sessions.has(id)) sessions.set(id, createSession(id, goal, store));
    editorBindings.set(binding, id);
    notifySessions();
  }, [store, goalId, binding]);
  useEffect(() => () => { editorBindings.delete(binding); }, [binding]);
  const id = editorBindings.get(binding);
  const editor = id ? sessions.get(id) : undefined;
  if (!editor) return <AppText tone="secondary">{store.read().goals.length >= 3 ? 'You have three goals.' : 'Opening your goal…'}</AppText>;
  const state = editor.getState(); const { view } = state;
  const support = state.working.latestVerdict === 'needs_support' || state.manualBlocked;
  const valid = Boolean(view.goalText.trim()) && sizes.every(size => Boolean(view.draft[size].trim()) && view.draft[size].length <= 60);
  const advisory = view.suggestions ? goalAdvisory(view.suggestions.verdict) : null;
  return <View style={{ gap: 20 }}>
    <AppText variant="title">One thing you want to do</AppText>
    <AppText tone="secondary">{ladderIntro}</AppText>
    <Field label="Your goal" value={view.goalText} onChangeText={editor.changeTitle}
      placeholder="Something that matters to you" multiline />
    {state.titleChoice ? <Card>
      <AppText>Would you like new steps for this goal, or keep your steps?</AppText>
      <PillButton label="Make new steps" onPress={() => { void editor.runCheck(true); }} />
      <PillButton label="Keep my steps" variant="secondary" onPress={editor.keepStepsForTitle} />
    </Card> : null}
    {support ? <View style={{ gap: 12 }}>
      <AppText tone="secondary">{supportLine}</AppText>
      <PillButton label="Need help now?" variant="quiet" onPress={editor.help} />
      <PillButton label="Check again" variant="secondary" disabled={!view.goalText.trim() || view.status === 'loading'} onPress={() => { void editor.runCheck(); }} />
      <PillButton label="Write my own steps" variant="secondary" onPress={editor.manual} />
    </View> : view.status === 'loading' ? <View style={{ gap: 12 }}>
      <AppText accessibilityLiveRegion="polite" tone="secondary">{goalCopy.waiting}</AppText>
      <Card padding={20}><LadderPlaceholder /></Card>
      <PillButton label="Write my own steps" variant="secondary" onPress={editor.manual} />
    </View> : view.status === 'failed' ? <View style={{ gap: 12 }}>
      <AppText tone="secondary">{goalCopy.failure}</AppText>
      <PillButton label="Try again" onPress={() => { void editor.runCheck(); }} />
      <PillButton label="Write my own steps" variant="secondary" onPress={editor.manual} />
    </View> : view.status === 'idle' && !state.saved ? (state.showSteps
      ? <PillButton label="Suggest steps again" variant="quiet" outlined disabled={!view.goalText.trim()} onPress={() => { void editor.runCheck(); }} />
      : <View style={{ gap: 12 }}>
        <PillButton label="Find my steps" disabled={!view.goalText.trim()} onPress={() => { void editor.runCheck(); }} />
        <GoalIdeas onChoose={idea => { editor.changeTitle(idea); void editor.runCheck(); }} />
        <PillButton label="Write my own steps" variant="quiet" disabled={!view.goalText.trim()} onPress={editor.manual} />
      </View>) : null}
    {view.panel === 'ready' ? <Card>
      <AppText accessibilityLiveRegion="polite">{goalCopy.suggestionsReady}</AppText>
      <PillButton label={goalCopy.view} variant="secondary" onPress={editor.viewSuggestions} />
    </Card> : null}
    {(view.panel === 'view' || view.panel === 'confirm_replace') && view.suggestions ? <Card tone="raised">
      <AppText variant="label">{goalCopy.suggestionsReady}</AppText>
      {advisory ? <AppText tone="secondary">{advisory}</AppText> : null}
      <View>{sizes.map((size, index) => <LadderRung key={size} size={size} last={index === sizes.length - 1}>
        <AppText>{view.suggestions!.steps[size]}</AppText>
      </LadderRung>)}</View>
      {view.panel === 'confirm_replace' ? <>
        <AppText>{goalCopy.replaceQuestion}</AppText>
        <PillButton label={goalCopy.replace} onPress={editor.replace} />
      </> : <PillButton label={goalCopy.useTheseSteps} onPress={editor.useSuggestions} />}
      <PillButton label={goalCopy.keepMine} variant="secondary" onPress={editor.keepMine} />
    </Card> : null}
    {state.showSteps ? <View style={{ gap: 20 }}>
      {view.editing === 'suggestions' && advisory ? <AppText tone="secondary">{advisory}</AppText> : null}
      <Card padding={20}>{sizes.map((size, index) => <LadderRung key={size} size={size} last={index === sizes.length - 1}>
        <Field accessibilityLabel={`${sizeLabels[size]} step`} value={view.draft[size]} maxLength={60} multiline
          style={{ minHeight: 62 }} placeholder={`Write your ${sizeLabels[size].toLowerCase()} step`}
          onChangeText={text => editor.edit(size, text)} hint={stepHintLine(size, state.hints[size]) ?? undefined} />
      </LadderRung>)}</Card>
      <AppText variant="caption" tone="secondary">You can change any step. Finishing a step lets the next one grow a size.</AppText>
      <PillButton label="Approve" disabled={!valid || state.saved} onPress={() => { void editor.approve(onApproved); }} />
      {view.editing === 'suggestions' && view.suggestions?.basis ? <Card tone="protected" padding={20} style={{ gap: 8 }}>
        <AppText variant="label">Why these steps</AppText>
        <AppText tone="secondary">{view.suggestions.basis.why}</AppText>
        <AppText variant="caption" tone="secondary">{`Source: ${view.suggestions.basis.source}. General research, not personal medical advice.`}</AppText>
      </Card> : null}
      {view.editing === 'suggestions' && view.suggestions?.underTheHood ? <ModelDetails details={view.suggestions.underTheHood} /> : null}
    </View> : null}
    {state.saved ? <AppText accessibilityLiveRegion="polite" tone="secondary">Your steps are saved.</AppText> : null}
  </View>;
}

export default GoalEditor;
