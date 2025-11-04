(function () {
  var viewer = document.getElementById('material-viewer');
  var layout = document.querySelector('.dcf-materials-layout');
  if (!viewer) return;

  // ---------------- helpers ----------------
  function esc(s) {
    return (s == null ? '' : String(s))
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function getMaterialJSONFromLink(link) {
    var card = link.closest('.dcf-material-card');
    if (!card) return null;
    var tag = card.querySelector('script.js-material-data[type="application/json"]');
    if (!tag) return null;
    try { return JSON.parse(tag.textContent); } catch (e) { return null; }
  }

  function rowsHTML(obj, mapping) {
    return mapping.map(function (m) {
      var v = (m.get ? m.get(obj) : obj && obj[m.key]);
      if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return '';
      var valHTML = (m.render ? m.render(v) : esc(v));
      return (
        '<div class="govuk-summary-list__row">' +
          '<dt class="govuk-summary-list__key">' + esc(m.label) + '</dt>' +
          '<dd class="govuk-summary-list__value">' + valHTML + '</dd>' +
        '</div>'
      );
    }).join('');
  }

  // Build the meta panel shown alongside the preview
  function buildMetaPanel(meta, bodyId) {
    var mat = meta && meta.Material || {};
    var cps = meta && meta.CPSMaterial || {};
    var pol = meta && meta.PoliceMaterial || {};

    var matRows = rowsHTML(mat, [
      { key: 'Title',              label: 'Title' },
      { key: 'Reference',          label: 'Reference' },
      { key: 'MaterialType',       label: 'Type' },
      { key: 'MaterialClassification', label: 'Classification' },
      { key: 'Incident',           label: 'Incident' },
      { key: 'Location',           label: 'Location' },
      { key: 'PeriodFrom',         label: 'From' },
      { key: 'PeriodTo',           label: 'To' }
    ]);

    var cpsRows = rowsHTML(cps, [
      { key: 'DisclosureStatus',   label: 'Disclosure status' },
      { key: 'ReviewNotes',        label: 'Notes' }
    ]);

    var polRows = rowsHTML(pol, [
      { key: 'DisclosureStatus',   label: 'Police disclosure status' },
      { key: 'URN',                label: 'URN' }
    ]);

    return (
      '<div class="dcf-viewer__meta govuk-!-margin-top-4">' +
        '<div class="dcf-viewer__meta-head">' +
          '<button type="button" class="govuk-link" data-action="toggle-meta" aria-controls="' + esc(bodyId) + '" aria-expanded="true">Hide details</button>' +
        '</div>' +
        '<div id="' + esc(bodyId) + '" class="dcf-viewer__meta-body">' +
          (matRows
            ? '<h3 class="govuk-heading-s govuk-!-margin-bottom-1">Material</h3>' +
              '<dl class="govuk-summary-list govuk-!-margin-bottom-4">' + matRows + '</dl>'
            : '') +
          (cpsRows
            ? '<h3 class="govuk-heading-s govuk-!-margin-bottom-1">CPS</h3>' +
              '<dl class="govuk-summary-list govuk-!-margin-bottom-4">' + cpsRows + '</dl>'
            : '') +
          (polRows
            ? '<h3 class="govuk-heading-s govuk-!-margin-bottom-1">Police</h3>' +
              '<dl class="govuk-summary-list govuk-!-margin-bottom-0">' + polRows + '</dl>'
            : '') +
        '</div>' +
      '</div>'
    );
  }

  // ---------------- core: open preview ----------------
  function openMaterialPreview(link) {
    var meta  = getMaterialJSONFromLink(link) || {};
    var url   = link.getAttribute('data-file-url') || link.href;
    var title = link.getAttribute('data-title') || (link.textContent || '').trim() || 'Selected file';
    if (!url) return;

    // Create a stable id for the meta body, derived from meta
    var rawId = (meta.ItemId || (meta.Material && meta.Material.Reference) || Date.now()).toString();
    var bodyId = 'meta-' + rawId.replace(/[^a-zA-Z0-9_-]/g, '-');

    var toolbar =
      '<div class="dcf-viewer__toolbar govuk-!-margin-bottom-4">' +
        '<a href="#" class="govuk-link" data-action="close-viewer">Close preview</a>' +
        '<span aria-hidden="true" class="govuk-!-margin-horizontal-2">&nbsp;|&nbsp;</span>' +
        '<a href="#" class="govuk-link" data-action="toggle-full" aria-pressed="false">View full width</a>' +
      '</div>';

    var frame =
      '<iframe class="dcf-viewer__frame" src="' + esc(url) + '" title="Preview of ' + esc(title) + '"' +
      ' style="width:100%;height:75vh;border:0;" loading="lazy" referrerpolicy="no-referrer"></iframe>';

    var metaHTML = buildMetaPanel(meta, bodyId);

    viewer.hidden = false;
    viewer.setAttribute('tabindex', '-1');
    viewer.innerHTML =
      toolbar +
      '<h2 class="govuk-heading-m govuk-!-margin-bottom-2">' + esc(title) + '</h2>' +
      frame +
      metaHTML;

    // focus to bring into view for keyboard users
    viewer.focus({ preventScroll: false });
  }

  // ---------------- click intercept (delegated) ----------------
  // Capture-phase listener so it still fires even if other handlers stop propagation.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a.js-material-link');
    if (!a) return;
    if (!viewer) return;

    // block '#' navigation
    e.preventDefault();
    e.stopPropagation();

    openMaterialPreview(a);
  }, true); // capture

  // ---------------- viewer controls ----------------
  viewer.addEventListener('click', function (e) {
    var actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    var action = actionEl.getAttribute('data-action');

    if (action === 'close-viewer') {
      e.preventDefault();
      viewer.innerHTML =
        '<p class="govuk-body govuk-!-margin-bottom-3">Select a material from the list to preview it here.</p>';
      viewer.hidden = true;
      if (layout) layout.classList.remove('is-full');
      return;
    }

    if (action === 'toggle-full') {
      e.preventDefault();
      var pressed = actionEl.getAttribute('aria-pressed') === 'true';
      actionEl.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      if (layout) layout.classList.toggle('is-full', !pressed);
      actionEl.textContent = pressed ? 'View full width' : 'Exit full width';
      return;
    }

    if (action === 'toggle-meta') {
      e.preventDefault();
      // Prefer a nearby meta body in the same viewer, regardless of id drift.
      var metaWrap = actionEl.closest('.dcf-viewer__meta');
      var body =
        // 1) Exact id in the same wrapper (if provided)
        (function () {
          var id = actionEl.getAttribute('aria-controls') || actionEl.getAttribute('data-controls');
          if (!metaWrap || !id) return null;
          try { return metaWrap.querySelector('#' + CSS.escape(id)); } catch (e) { return null; }
        })()
        // 2) Fallback: first meta body inside the wrapper
        || (metaWrap && metaWrap.querySelector('.dcf-viewer__meta-body'));

      if (!body) return;

      // Toggle strictly from the DOM state, then sync the control’s state/text.
      var willHide = !body.hidden;    // visible -> hide; hidden -> show
      body.hidden = willHide;

      actionEl.setAttribute('aria-expanded', willHide ? 'false' : 'true');
      actionEl.textContent = willHide ? 'Show details' : 'Hide details';
      return;
    }
  });

  // ---------------- outside click to close any pop menus (if you add them) ----------------
  document.addEventListener('click', function (evt) {
    if (!viewer) return;
    var openToggle = viewer.querySelector('.moj-button-menu__toggle[aria-expanded="true"]');
    if (!openToggle) return;
    if (!evt.target.closest('.moj-button-menu')) {
      openToggle.setAttribute('aria-expanded', 'false');
      var wrap = openToggle.closest('.moj-button-menu').querySelector('.moj-button-menu__wrapper');
      if (wrap) wrap.hidden = true;
    }
  });

  // flag for sanity checks
  window.__materialsPreviewReady = true;
})();
