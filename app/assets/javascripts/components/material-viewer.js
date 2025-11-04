  (function () {
    var viewer = document.getElementById('material-viewer');
    var layout = document.querySelector('.dcf-materials-layout');
    if (!viewer) return;

    // ------- helpers -------
    function getMaterialJSONFromLink(link) {
      var card = link.closest('.dcf-material-card');
      if (!card) return null;
      var tag = card.querySelector('script.js-material-data[type="application/json"]');
      if (!tag) return null;
      try { return JSON.parse(tag.textContent); } catch (e) { return null; }
    }

    function esc(s) {
      return (s == null ? '' : String(s))
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    // --- TAB UI (flush under toolbar, no GOV.UK margin utilities) ---
    function buildDocTabs(title) {
      var safe = esc(title || 'Document');
      return (
        '<div id="dcf-viewer-tabs" class="dcf-viewer__tabs dcf-viewer__tabs--flush">' +
          '<button type="button" class="dcf-doc-tab is-active" aria-selected="true" title="' + safe + '">' +
            '<span class="dcf-doc-tab__label">' + safe + '</span>' +
            // use the multiplication sign; SCSS centres it precisely
            '<span class="dcf-doc-tab__close" aria-label="Close tab" role="button">×</span>' +
            '<span class="dcf-doc-tab__bar" aria-hidden="true"></span>' +
          '</button>' +
        '</div>'
      );
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

    function sectionHTML(title, rows) {
      if (!rows) return '';
      return (
        '<h3 class="govuk-heading-s govuk-!-margin-top-3 govuk-!-margin-bottom-1">' + esc(title) + '</h3>' +
        '<dl class="govuk-summary-list govuk-!-margin-bottom-2">' + rows + '</dl>'
      );
    }

  function buildMetaPanel(meta, bodyId) {
  var mat  = (meta && meta.Material) || {};
  var rel  = (meta && meta.RelatedMaterials) || {};
  var dig  = (meta && meta.DigitalRepresentation) || {};
  var pol  = (meta && meta.PoliceMaterial) || {};
  var cps  = (meta && meta.CPSMaterial) || {};
  var insp = pol.Inspection || {};

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

  function sectionHTML(title, rows) {
    if (!rows) return '';
    return (
      '<h3 class="govuk-heading-s govuk-!-margin-top-3 govuk-!-margin-bottom-1">' + esc(title) + '</h3>' +
      '<dl class="govuk-summary-list govuk-!-margin-bottom-2">' + rows + '</dl>'
    );
  }

  var materialRows = rowsHTML(mat, [
    { key:'Title',                  label:'Title' },
    { key:'Reference',              label:'Reference' },
    { key:'ProducedbyWitnessId',    label:'Produced by (witness id)' },
    { key:'MaterialClassification', label:'Material classification' },
    { key:'MaterialType',           label:'Material type' },
    { key:'SentExternally',         label:'Sent externally' },
    { key:'RelatedParticipantId',   label:'Related participant id' },
    { key:'Incident',               label:'Incident' },
    { key:'Location',               label:'Location' },
    { key:'PeriodFrom',             label:'Period from' },
    { key:'PeriodTo',               label:'Period to' }
  ]);

  var relatedRows = rowsHTML(rel, [
    { key:'RelatesToItem',   label:'Relates to item' },
    { key:'RelatedItemId',   label:'Related item id' },
    { key:'RelationshipType',label:'Relationship type' }
  ]);

  // --- Digital representation (supports array OR legacy single) ---
  var digitalRows;
  if (Array.isArray(dig.Items) && dig.Items.length) {
    // render each item as its own mini summary list rows
    digitalRows = dig.Items.map(function (it, idx) {
      var itemRows = rowsHTML(it, [
        { key:'FileName',             label:'File name' },
        { key:'ExternalFileLocation', label:'External file location' },
        { key:'ExternalFileURL',      label:'External file URL', render: function (v) {
            if (v === '#' || v === '') return '—';
            return '<a class="govuk-link" href="' + esc(v) + '" target="_blank" rel="noreferrer">' + esc(v) + '</a>';
          }},
        { key:'DigitalSignature',     label:'Digital signature' }
      ]);
      return itemRows ? (
        '<div class="govuk-!-margin-bottom-2">' +
          '<h4 class="govuk-heading-s govuk-!-margin-bottom-1">Item ' + (idx + 1) + '</h4>' +
          '<dl class="govuk-summary-list govuk-!-margin-bottom-1">' + itemRows + '</dl>' +
        '</div>'
      ) : '';
    }).join('');
  } else {
    // legacy single-object fields (backward compatible)
    digitalRows = rowsHTML(dig, [
      { key:'FileName',             label:'File name' },
      { key:'Document',             label:'Document' },
      { key:'ExternalFileLocation', label:'External file location' },
      { key:'ExternalFileURL',      label:'External file URL', render: function (v) {
          if (v === '#' || v === '') return '—';
          return '<a class="govuk-link" href="' + esc(v) + '" target="_blank" rel="noreferrer">' + esc(v) + '</a>';
        }},
      { key:'DigitalSignature',     label:'Digital signature' }
    ]);
  }


  var policeRows = rowsHTML(pol, [
    { key:'DisclosureStatus',               label:'Disclosure status' },
    { key:'RationaleForDisclosureDecision', label:'Rationale for disclosure decision' },
    { key:'Rebuttable',                     label:'Rebuttable' },
    { key:'SensitivityRationale',           label:'Sensitivity rationale' },
    { key:'Description',                    label:'Description' },
    { key:'Exceptions',                     label:'Exceptions', render: function (arr) {
        if (!Array.isArray(arr) || !arr.length) return '—';
        return '<ul class="govuk-list govuk-list--bullet govuk-!-margin-bottom-0">' +
                arr.map(function (x){ return '<li>' + esc(x) + '</li>'; }).join('') +
              '</ul>';
      }},
    { label:'Inspection date', get: function(){ return insp.DateOfInspection; } },
    { label:'Inspected by',   get: function(){ return insp.InspectedBy; } }
  ]);

  var cpsRows = rowsHTML(cps, [
    { key:'DisclosureStatus',               label:'Disclosure status' },
    { key:'RationaleForDisclosureDecision', label:'Rationale for disclosure decision' },
    { key:'SensitivityDispute',             label:'Sensitivity dispute' }
  ]);

  // Meta bar now ONLY has the show/hide details control
    var metaBar =
      '<div class="dcf-viewer__meta-bar">' +
        '<div class="dcf-meta-actions">' +
          '<a href="#" class="govuk-link js-meta-toggle" ' +
            'data-action="toggle-meta" ' +
            'aria-expanded="true" ' +
            'aria-controls="' + esc(bodyId) + '" ' +
            'data-controls="' + esc(bodyId) + '">' +           // <-- add this
            'Hide details</a>' +
        '</div>' +
      '</div>';


  // Reclassify button moved inside meta body, before the first <h3>
  // with this (no GOV.UK margin utilities):
  var inlineActions =
  '<div class="dcf-meta-inline-actions">' +
    '<a href="#" class="govuk-button govuk-button--secondary dcf-meta-secondary" data-action="reclassify">Reclassify</a>' +
  '</div>';

  return '' +
    '<div class="dcf-viewer__meta">' +
      metaBar +
      '<div id="' + esc(bodyId) + '" class="dcf-viewer__meta-body">' +
        inlineActions +                                         // <-- now sits right before the first section
        sectionHTML('Material',               materialRows) +
        sectionHTML('Related materials',      relatedRows)  +
        sectionHTML('Digital representation', digitalRows)  +
        sectionHTML('Police material',        policeRows)   +
        sectionHTML('CPS material',           cpsRows)      +
      '</div>' +
    '</div>';
  }


    function setActiveCard(linkEl) {
      document.querySelectorAll('.dcf-material-card--active')
        .forEach(function (el) { el.classList.remove('dcf-material-card--active'); });
      var card = linkEl.closest('.dcf-material-card');
      if (card) card.classList.add('dcf-material-card--active');
    }

    // Normalise any file href to a Kit-served /public path
    function toPublic(u){
      if (!u) return '';
      if (u.startsWith('/public/')) return u;
      if (u.startsWith('/assets/')) return '/public' + u.slice('/assets'.length);
      if (u.startsWith('/files/'))  return '/public' + u;
      if (u.startsWith('/'))        return '/public' + u;
      return '/public/' + u;
    }

    // ----- open preview (factored) -----
    function openMaterialPreview(link) {
      var meta  = getMaterialJSONFromLink(link) || {};
      var url   = link.getAttribute('data-file-url') || link.href;
      var title = link.getAttribute('data-title') || (link.textContent || '').trim() || 'Selected file';

      var toolbar =
        '<div class="dcf-viewer__toolbar govuk-!-margin-bottom-4">' +
          '<a href="#" class="govuk-link" data-action="close-viewer">Close preview</a>' +
          '<span aria-hidden="true" class="govuk-!-margin-horizontal-2">&nbsp;|&nbsp;</span>' +
          '<a href="#" class="govuk-link" data-action="toggle-full" aria-pressed="false">View full width</a>' +
        '</div>';

      // NEW: stable, safe ID for the meta body
      var rawId = (meta.ItemId || (meta.Material && meta.Material.Reference) || Date.now()).toString();
      var bodyId = 'meta-' + rawId.replace(/[^a-zA-Z0-9_-]/g, '-');

      var metaPanel = buildMetaPanel(meta, bodyId); // <-- pass the id

      // Ops bar with your SVG icon (served from /public/files)
      var opsBar =
        '<div class="dcf-viewer__ops-bar">' +
          '<div class="dcf-ops-actions">' +
            '<a href="#" class="govuk-button govuk-button--inverse dcf-ops-iconbtn" data-action="ops-icon">' +
              '<span class="dcf-ops-icon" aria-hidden="true">' +
                '<img src="/public/files/marquee-blue.svg" alt="" width="20" height="20" />' +
              '</span>' +
              '<span class="govuk-visually-hidden">Primary action</span>' +
            '</a>' +
            '<div class="moj-button-menu" data-module="moj-button-menu">' +
              '<button type="button" class="govuk-button govuk-button--inverse moj-button-menu__toggle" aria-haspopup="true" aria-expanded="false">' +
                'Edit Document <span class="moj-button-menu__icon" aria-hidden="true">▾</span>' +
              '</button>' +
              '<div class="moj-button-menu__wrapper" hidden>' +
                '<ul class="moj-button-menu__list" role="menu">' +
                  '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Log an under or over redaction</a></li>' +
                  '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">View redaction log history</a></li>' +
                  '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Turn on potential redactions</a></li>' +
                  '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Rotate pages</a></li>' +
                  '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Discard pages</a></li>' +
                  '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Mark as read</a></li>' +
                  '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Rename</a></li>' +
                '</ul>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      // Build pdf.js viewer URL (viewer assets must be in /public/pdfjs/web/)
      var fileUrl      = toPublic(url); // e.g. /public/files/PRE_CONS_D.pdf
      var pdfViewerUrl = '/public/pdfjs/web/viewer.html?file=' + encodeURIComponent(fileUrl);
      var iframe = '<iframe class="dcf-viewer__frame" src="' + esc(pdfViewerUrl) + '" title="Preview of ' + esc(title) + '" loading="lazy" referrerpolicy="no-referrer"></iframe>';

      viewer.hidden = false;
      viewer.setAttribute('tabindex', '-1');
      viewer.innerHTML = toolbar + buildDocTabs(title) + metaPanel + opsBar + iframe;

      setActiveCard(link);
      viewer.focus({ preventScroll: false });
    }

    // ------- click intercept (capture phase, so it always wins) -------
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a.js-material-link[data-file-url]');
      if (!link) return;
      if (!viewer) return;

      e.preventDefault();
      e.stopPropagation();
      openMaterialPreview(link);
    }, true); // capture

    // ------- toolbar + meta actions -------
    viewer.addEventListener('click', function (e) {
      // Tab close (×) inside generated tab
      if (e.target && e.target.closest('.dcf-doc-tab__close')) {
        e.preventDefault();
        // Reuse existing close behaviour
        var close = viewer.querySelector('[data-action="close-viewer"]');
        if (close) close.click();
        return;
      }

      var a = e.target.closest('a[data-action]');
      if (!a) return;
      e.preventDefault();

      var action = a.getAttribute('data-action');

      if (action === 'close-viewer') {
        viewer.innerHTML = '<p class="govuk-hint govuk-!-margin-bottom-3">Select a material from the list to preview it here.</p>';
        viewer.hidden = true;
        if (layout) layout.classList.remove('is-full');
        document.querySelectorAll('.dcf-material-card--active').forEach(function (el) { el.classList.remove('dcf-material-card--active'); });
        return;
      }

      if (action === 'toggle-full') {
        if (!layout) return;
        var on = layout.classList.toggle('is-full');
        a.textContent = on ? 'Exit full width' : 'View full width';
        a.setAttribute('aria-pressed', String(on));
        viewer.focus({ preventScroll: true });
        return;
      }

      if (action === 'toggle-meta') {
        // Prefer a nearby meta body in the same viewer, regardless of id drift.
        var metaWrap = a.closest('.dcf-viewer__meta');
        var body =
          // 1) Exact id in the same wrapper (if provided)
          (function () {
            var id = a.getAttribute('aria-controls') || a.getAttribute('data-controls');
            if (!metaWrap || !id) return null;
            try { return metaWrap.querySelector('#' + CSS.escape(id)); } catch (e) { return null; }
            console.log('toggle-meta -> hidden:', body.hidden);
          })()
          // 2) Fallback: first meta body inside the wrapper
          || (metaWrap && metaWrap.querySelector('.dcf-viewer__meta-body'));

        if (!body) return;

        // Toggle strictly from the DOM state, then sync the control’s state/text.
        var willHide = !body.hidden;    // visible -> hide; hidden -> show
        body.hidden = willHide;

        a.setAttribute('aria-expanded', String(!willHide));
        a.textContent = willHide ? 'Show details' : 'Hide details';
        console.log('toggle-meta -> hidden:', body.hidden);
        return;
      }




      if (action === 'reclassify') {
        console.log('Reclassify clicked');
        return;
      }
    }, false);

    // ------- ops menu open/close -------
    viewer.addEventListener('click', function (e) {
      var toggle = e.target.closest('.moj-button-menu__toggle');
      if (!toggle) return;
      e.preventDefault();
      var menu = toggle.closest('.moj-button-menu');
      var wrapper = menu && menu.querySelector('.moj-button-menu__wrapper');
      if (!wrapper) return;
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      wrapper.hidden = expanded;
    });

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

    // quick sanity flag
    window.__materialsPreviewReady = true;
  })();