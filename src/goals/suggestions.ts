// Framework-independent draft/result state. Approval and persistence belong to
// the separate approval/privacy flow; no action here saves or syncs a goal.
import type { Steps, StepSize } from '../../api/src/goals/contracts.ts';
import type { ShrinkResult } from '../../api/src/goals/service.ts';
import { goalCopy } from './copy.ts';

type SuccessfulResult = Extract<ShrinkResult, { steps: Steps }>;
export type SuggestionsStatus = 'idle' | 'loading' | 'ready' | 'failed' | 'needs_support';
export type SuggestionsPanel = 'none' | 'ready' | 'view' | 'confirm_replace';
export type SuggestionsState = {
  goalId: string;
  goalText: string;
  draft: Steps;
  editing: 'suggestions' | 'manual';
  status: SuggestionsStatus;
  panel: SuggestionsPanel;
  requestId: number | null;
  suggestions: SuccessfulResult | null;
};
export type SuggestionSettlement = {
  requestId: number;
  status: 'ready' | 'failed' | 'needs_support' | 'stale';
};
export type UseSuggestionsResult =
  | { status: 'unavailable' | 'confirmation_required' }
  | { status: 'applied'; requiresApproval: true };

export const suggestionControls = {
  ready: goalCopy.suggestionsReady,
  view: goalCopy.view,
  use: goalCopy.useTheseSteps,
  keep: goalCopy.keepMine,
  confirmation: goalCopy.replaceQuestion,
  replace: goalCopy.replace,
} as const;

const emptySteps = (): Steps => ({ tiny: '', small: '', full: '' });
const hasText = (steps: Steps): boolean => Object.values(steps).some(text => text.trim().length > 0);

function copyResult(result: SuccessfulResult): SuccessfulResult {
  // The transport contract contains only JSON values. Copy them so callers
  // cannot mutate a pending replacement through a state snapshot or response.
  return {
    verdict: result.verdict,
    steps: { ...result.steps },
    source: result.source,
    judgeSource: result.judgeSource,
    sizeHints: Object.fromEntries(Object.entries(result.sizeHints).map(([size, hint]) => [size, { ...hint }])),
    ...(result.underTheHood ? {
      underTheHood: {
        goalVerdict: result.underTheHood.goalVerdict,
        ...(result.underTheHood.durationProbabilities ? {
          durationProbabilities: {
            tiny: [...result.underTheHood.durationProbabilities.tiny],
            small: [...result.underTheHood.durationProbabilities.small],
            full: [...result.underTheHood.durationProbabilities.full],
          },
        } : {}),
      },
    } : {}),
  };
}

export function createSuggestionsController(initial: { goalId: string; goalText: string; draft?: Steps }) {
  let identity = 0;
  let state: SuggestionsState = {
    goalId: initial.goalId,
    goalText: initial.goalText,
    draft: { ...(initial.draft ?? emptySteps()) },
    editing: initial.draft && hasText(initial.draft) ? 'manual' : 'suggestions',
    status: 'idle',
    panel: 'none',
    requestId: null,
    suggestions: null,
  };

  function snapshot(): SuggestionsState {
    return { ...state, draft: { ...state.draft }, suggestions: state.suggestions ? copyResult(state.suggestions) : null };
  }

  function applySuggestions(): UseSuggestionsResult {
    if (!state.suggestions || state.status !== 'ready') return { status: 'unavailable' };
    state = { ...state, draft: { ...state.suggestions.steps }, editing: 'suggestions', panel: 'none' };
    // U21: replacing editable fields is not approval. The caller must still
    // use the ordinary Approve action before saving these suggested steps.
    return { status: 'applied', requiresApproval: true };
  }

  return {
    getState: snapshot,

    // A changed goal invalidates outstanding results without cancelling the
    // shared promise. The caller supplies the draft to keep for that goal.
    setGoal(goalId: string, goalText: string, draft: Steps): void {
      identity += 1;
      state = {
        goalId, goalText, draft: { ...draft },
        editing: hasText(draft) ? 'manual' : 'suggestions',
        status: 'idle', panel: 'none', requestId: null, suggestions: null,
      };
    },

    // Pass the same promise to the separate privacy/approval coordinator.
    // Starting manual entry never cancels it, reruns it or consumes its result.
    begin(request: Promise<ShrinkResult>): { requestId: number; settled: Promise<SuggestionSettlement> } {
      const requestId = ++identity;
      state = { ...state, status: 'loading', panel: 'none', requestId, suggestions: null };
      const settled = (async (): Promise<SuggestionSettlement> => {
        let result: ShrinkResult;
        try { result = await request; }
        catch {
          if (identity !== requestId) return { requestId, status: 'stale' };
          state = { ...state, status: 'failed', panel: 'none', suggestions: null };
          return { requestId, status: 'failed' };
        }
        if (identity !== requestId) return { requestId, status: 'stale' };
        if (result.verdict === 'needs_support') {
          state = { ...state, status: 'needs_support', panel: 'none', suggestions: null };
          return { requestId, status: 'needs_support' };
        }
        if (result.verdict === null) {
          state = { ...state, status: 'failed', panel: 'none', suggestions: null };
          return { requestId, status: 'failed' };
        }
        const suggestions = copyResult(result);
        state = state.editing === 'manual'
          ? { ...state, status: 'ready', panel: 'ready', suggestions }
          : { ...state, status: 'ready', panel: 'none', draft: { ...suggestions.steps }, suggestions };
        return { requestId, status: 'ready' };
      })();
      return { requestId, settled };
    },

    writeManually(): void {
      state = { ...state, editing: 'manual', panel: state.suggestions ? 'ready' : 'none' };
    },

    editDraft(size: StepSize, text: string): void {
      state = {
        ...state, editing: 'manual', draft: { ...state.draft, [size]: text },
        // A confirmation must apply to the text actually shown when asked.
        panel: state.panel === 'confirm_replace' ? 'view' : state.panel,
      };
    },

    viewSuggestions(): boolean {
      if (state.status !== 'ready' || !state.suggestions || state.panel !== 'ready') return false;
      state = { ...state, panel: 'view' };
      return true;
    },

    useSuggestions(): UseSuggestionsResult {
      if (state.status !== 'ready' || !state.suggestions || state.panel !== 'view') return { status: 'unavailable' };
      if (state.editing === 'manual' && hasText(state.draft)) {
        state = { ...state, panel: 'confirm_replace' };
        return { status: 'confirmation_required' };
      }
      return applySuggestions();
    },

    confirmReplace(): UseSuggestionsResult {
      if (state.panel !== 'confirm_replace') return { status: 'unavailable' };
      return applySuggestions();
    },

    keepMine(): boolean {
      if (!['ready', 'view', 'confirm_replace'].includes(state.panel)) return false;
      state = { ...state, panel: 'none' };
      return true;
    },
  };
}
