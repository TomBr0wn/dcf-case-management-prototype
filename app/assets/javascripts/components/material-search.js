// public/javascripts/material-search.js
(function () {
  var form   = document.querySelector('form.dcf-materials-search');
  var input  = form && form.querySelector('input[name="q"]');
  var viewer = document.getElementById('material-viewer');
  if (!form || !input || !viewer) return;

  // Search status UI (safe if missing)
  var status    = document.getElementById('search-status');
  var zeroWrap  = status && status.querySelector('[data-zero]');
  var someWrap  = status && status.querySelector('[data-some]');
  var countEl   = status && status.querySelector('[data-search-count]');
  var termEls   = [].slice.call(document.querySelectorAll('[data-search-term]'));

  // Optional: caseId via hidden input or body data attribute
  var caseId =
    (form.querySelector('input[name="caseId"]') && form.querySelector('input[name="caseId"]').value) ||
    (document.body && document.body.getAttribute('data-case-id')) ||
    '';

  function setViewer(html) {
    viewer.innerHTML = html;
    viewer.hidden = false;
    try { viewer.focus(); } catch (e) {}
  }

  // --- helpers to determine result count -------------------------------------
  function num(val) { var n = Number(val); return isNaN(n) ? 0 : n; }

  function countRenderedResults() {
    // Prefer an explicit data-results-count if the fragment provides it
    var container = viewer.querySelector('[data-results-count]');
    if (container) {
      return num(container.getAttribute('data-results-count'));
    }
    // Fallback: count rendered cards
    return viewer.querySelectorAll('.dcf-material-card').length;
  }

  function ensureStatus() {
    // If it still exists, refresh refs and return
    if (status && status.isConnected) {
      zeroWrap = status.querySelector('[data-zero]');
      someWrap = status.querySelector('[data-some]');
      countEl  = status.querySelector('[data-search-count]');
      termEls  = [].slice.call(status.querySelectorAll('[data-search-term]'));
      return status;
    }

    // Try to re-find (maybe re-rendered elsewhere)
    status = document.getElementById('search-status');
    if (!status) {
      // Rebuild the exact structure from your template and insert before viewer
      status = document.createElement('div');
      status.id = 'search-status';
      status.className = 'govuk-!-margin-bottom-3';
      status.setAttribute('aria-live', 'polite');
      status.hidden = true;
      status.innerHTML = [
        '<div data-zero>',
          '<div class="dcf-search-meta govuk-!-margin-bottom-0">',
            'No results for “<span data-search-term></span>”.',
          '</div>',
        '</div>',
        '<div data-some hidden>',
          '<p class="dcf-search-meta">',
            '<strong><span data-search-count>0</span></strong> results for “<span data-search-term></span>”.',
          '</p>',
        '</div>'
      ].join('');
      viewer.parentNode.insertBefore(status, viewer);
    }

    zeroWrap = status.querySelector('[data-zero]');
    someWrap = status.querySelector('[data-some]');
    countEl  = status.querySelector('[data-search-count]');
    termEls  = [].slice.call(status.querySelectorAll('[data-search-term]'));
    return status;
  }


  function updateStatusUI(count, q) {
      ensureStatus(); 
    if (!status) return;

    // Always show the status block after a submit response arrives
    status.hidden = false;

    // Update the query term everywhere
    termEls.forEach(function (el) { el.textContent = q || ''; });

    if (count > 0) {
      if (countEl) countEl.textContent = String(count);
      if (zeroWrap) zeroWrap.hidden = true;
      if (someWrap) someWrap.hidden = false;
    } else {
      if (zeroWrap) zeroWrap.hidden = false;
      if (someWrap) someWrap.hidden = true;
    }
  }
  // ---------------------------------------------------------------------------

  form.addEventListener('submit', function (e) {
    if (!window.fetch) return; // degrade gracefully
    e.preventDefault();

    var q = (input.value || '').trim();
    var url = new URL(form.action, window.location.origin);
    if (q) url.searchParams.set('q', q);
    if (caseId) url.searchParams.set('caseId', caseId);

    // Ask server for a fragment (your route can branch on this if you like)
    url.searchParams.set('fragment', '1');

    setViewer('<p class="govuk-hint govuk-!-margin-bottom-0">Searching…</p>');
    ensureStatus();  
    if (status) status.hidden = true; // hide status while loading

    fetch(url.toString(), { headers: { 'X-Requested-With': 'fetch' } })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        setViewer(html);

        // Decide zero vs >0 **after** results render
        var count = countRenderedResults();
        updateStatusUI(count, q);
      })
      .catch(function () {
        setViewer(
          '<div class="govuk-inset-text govuk-!-margin-bottom-0">Search failed. Try again.</div>'
        );
        updateStatusUI(0, q);
      });
  }, false);
})();
