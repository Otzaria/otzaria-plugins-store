'use strict';

// Foreground view state only. The per-instance SDK snapshot must never contain
// catalogues, installation tokens, or actions to replay after document recreation.
window.StoreRestoreState = (() => {
  const MAX_BYTES = 8192; // comfortably below the SDK limit of 64 KiB
  const MAX_SCROLL = 10000000;
  const boundedText = (value, length) => typeof value === 'string' && value.length <= length;

  function normalize(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return null;
      if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_BYTES) return null;
      const view = value.view;
      if (!view || !['home', 'all', 'category'].includes(view.type)) return null;
      if (view.type === 'category' && (!boundedText(view.slug, 128) || !view.slug)) return null;
      if (!boundedText(value.search, 512) || !boundedText(value.tag, 128)) return null;
      if (typeof value.hideInstalled !== 'boolean') return null;
      if (!['all', 'stable', 'beta', 'experimental'].includes(value.status)) return null;
      if (!['recommended', 'newest', 'updated'].includes(value.sort)) return null;
      if (value.detailId !== null && (!boundedText(value.detailId, 128) || !value.detailId)) return null;
      if (!Number.isFinite(value.scrollTop) || value.scrollTop < 0 || value.scrollTop > MAX_SCROLL) return null;
      return {
        version: 1,
        view: view.type === 'category' ? { type: 'category', slug: view.slug } : { type: view.type },
        search: value.search,
        tag: value.tag,
        hideInstalled: value.hideInstalled,
        status: value.status,
        sort: value.sort,
        detailId: value.detailId,
        scrollTop: Math.round(value.scrollTop),
      };
    } catch { return null; }
  }

  function create(capture) {
    let ready = false;
    let unsupported = false;
    let everAccepted = false;
    let bootSnapshot = false;
    // Conservative even when an RPC response is lost: a non-null write may
    // have reached the host. Only an acknowledged clear makes it safe again.
    let mayHaveSnapshot = false;
    let lastAcceptedJson;
    let activeOperations = 0;
    let clearPromise = null;
    let tail = Promise.resolve();
    let saveQueued = false;
    let dirty = false;
    let unreportedOperation = false;

    function enqueue(work) {
      const result = tail.then(work);
      tail = result.catch(() => {});
      return result;
    }

    async function write(state) {
      if (state !== null) mayHaveSnapshot = true;
      let result;
      try { result = await Otzaria.call('plugin.setRestoreState', { state }); }
      catch (error) { result = { success: false, error }; }
      if (result && result.success === true && result.data === true) {
        everAccepted = true;
        mayHaveSnapshot = state !== null;
        lastAcceptedJson = JSON.stringify(state);
        return true;
      }
      lastAcceptedJson = undefined; // a rejected write was not saved
      const error = result && result.error;
      const unknownMethod = error && (error.code === 'error.unknown_method' ||
        /error\.unknown_method|Unknown action in plugin: setRestoreState/.test(error.message || ''));
      if (unknownMethod && !everAccepted && !bootSnapshot) {
        unsupported = true;
        mayHaveSnapshot = false; // old hosts have never accepted this optional API
      }
      return false;
    }

    function changed() {
      dirty = true;
      if (!ready || unsupported || unreportedOperation || activeOperations || saveQueued) return;
      saveQueued = true;
      void enqueue(async () => {
        saveQueued = false;
        if (!ready || unsupported || unreportedOperation || activeOperations || !dirty) return;
        dirty = false;
        // Re-read when the queued write actually starts. Oversized live input
        // clears the old snapshot instead of silently restoring truncated data.
        const state = normalize(capture());
        if (JSON.stringify(state) === lastAcceptedJson) return;
        await write(state);
      });
    }

    return {
      boot(payload) {
        const state = payload && payload.restore && payload.restore.state;
        bootSnapshot = state !== null && state !== undefined;
        mayHaveSnapshot = bootSnapshot;
        return normalize(state);
      },
      activate() { ready = true; changed(); },
      changed,
      // requestInstall only acknowledges dispatch. Without a terminal report
      // we cannot know whether the host still has an installation/dialog open.
      // Keep this document exempt, as before this optional feature, until it is
      // closed/reloaded. This is not unsaved user data and needs no close dialog.
      keepAliveForUnreportedOperation() { unreportedOperation = true; },
      async guard(action) {
        // Increment synchronously, before any await, so queued normal writes
        // cannot overtake the clear or run between overlapping operations.
        activeOperations++;
        if (activeOperations === 1) {
          clearPromise = enqueue(async () => {
            if (!mayHaveSnapshot) return;
            if (await write(null)) return;
            if (unsupported && !mayHaveSnapshot) return;
            throw new Error('Cannot protect the operation from document discard');
          });
        }
        try {
          await clearPromise;
          return await action();
        } finally {
          activeOperations--;
          if (!activeOperations) {
            clearPromise = null;
            changed();
          }
        }
      },
    };
  }

  return { create };
})();
