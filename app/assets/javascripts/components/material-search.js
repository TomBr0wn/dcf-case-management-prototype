// public/javascripts/material-search.js
(function () {
  var form   = document.querySelector('form.dcf-materials-search');
  var input  = form && form.querySelector('input[name="q"]');
  var viewer = document.getElementById('material-viewer');
  if (!form || !input || !viewer) return;

  // mark as enhanced so we know interception is wired
  form.setAttribute('data-enhanced', '1');

  // Optional: get caseId from hidden input or data attribute
  var caseId =
    (form.querySelector('input[name="caseId"]') && form.querySelector('input[name="caseId"]').value) ||
    (document.body && document.body.getAttribute('data-case-id')) ||
    '';

  function setViewer(html) {
    viewer.innerHTML = html;
    viewer.hidden = false;
    try { viewer.focus(); } catch (e) {}
  }

  form.addEventListener('submit', function (e) {
    if (!window.fetch) return; // let it navigate on very old browsers
    e.preventDefault();

    var q = (input.value || '').trim();
    var url = new URL(form.action, window.location.origin);
    if (q) url.searchParams.set('q', q);
    if (caseId) url.searchParams.set('caseId', caseId);

    // Tell server we want a fragment, not a full page
    url.searchParams.set('fragment', '1');

    setViewer('<p class="govuk-hint govuk-!-margin-bottom-0">Searching…</p>');

    fetch(url.toString(), { headers: { 'X-Requested-With': 'fetch' } })
      .then(r => r.text())
      .then(html => setViewer(html))
      .catch(() => setViewer(
        '<div class="govuk-inset-text govuk-!-margin-bottom-0">Search failed. Try again.</div>'
      ));
  }, false);
})();
