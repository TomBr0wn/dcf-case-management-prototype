(() => {
  // Grab the viewer shell and the layout wrapper (used to toggle full-width mode).
  // Bail early if the page doesn't have the viewer.
  var viewer = document.getElementById('material-viewer')
  var layout = document.querySelector('.dcf-materials-layout')
  if (!viewer) return

  // --------------------------------------
  // Helpers
  // --------------------------------------

  // Given a clicked link inside a material card, find and
  // read the embedded JSON describing that material
  function getMaterialJSONFromLink(link) {
    var card = link.closest('.dcf-material-card')
    if (!card) return null
    var tag = card.querySelector('script.js-material-data[type="application/json"]')
    if (!tag) return null
    try { return JSON.parse(tag.textContent) } catch (e) { return null }
  }

  // Tiny HTML escaper to keep injected strings safe
  function esc(s) {
    return (s == null ? '' : String(s))
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  }

  // Remove the search status banner (if present). Used when opening a document
  function removeSearchStatus() {
    var s = document.getElementById('search-status')
    if (s && s.parentNode) s.parentNode.removeChild(s)
  }

  // Build the single visible “Document” tab in the viewer (flush styling)
  function buildDocTabs(title) {
    var safe = esc(title || 'Document')
    return (
      '<div id="dcf-viewer-tabs" class="dcf-viewer__tabs dcf-viewer__tabs--flush">' +
        '<button type="button" class="dcf-doc-tab is-active" aria-selected="true" title="' + safe + '">' +
          '<span class="dcf-doc-tab__label">' + safe + '</span>' +
          // Use the multiplication sign; SCSS centres it precisely
          '<span class="dcf-doc-tab__close" aria-label="Close tab" role="button">×</span>' +
          '<span class="dcf-doc-tab__bar" aria-hidden="true"></span>' +
        '</button>' +
      '</div>'
    )
  }

  // Render GOV.UK summary list rows from mapping
  function rowsHTML(obj, mapping) {
    return mapping.map(function (m) {
      var v = (m.get ? m.get(obj) : obj && obj[m.key])
      if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return ''
      var valHTML = (m.render ? m.render(v) : esc(v))
      return (
        '<div class="govuk-summary-list__row">' +
          '<dt class="govuk-summary-list__key">' + esc(m.label) + '</dt>' +
          '<dd class="govuk-summary-list__value">' + valHTML + '</dd>' +
        '</div>'
      )
    }).join('')
  }

  // Wrap rows in a titled GOV.UK summary list section
  function sectionHTML(title, rows) {
    if (!rows) return ''
    return (
      '<h3 class="govuk-heading-s govuk-!-margin-top-3 govuk-!-margin-bottom-1">' + esc(title) + '</h3>' +
      '<dl class="govuk-summary-list govuk-!-margin-bottom-2">' + rows + '</dl>'
    )
  }

  // Mark one card as “active” (visually selected) and clear any previous
  function setActiveCard(linkEl) {
    document.querySelectorAll('.dcf-material-card--active')
      .forEach(function (el) { el.classList.remove('dcf-material-card--active') })
    var card = linkEl.closest('.dcf-material-card')
    if (card) card.classList.add('dcf-material-card--active')
  }

  // Normalise file URLs so pdf.js can load them from /public
  function toPublic(u) {
    if (!u) return ''
    if (/^https?:\/\//i.test(u)) return u       // external absolute URL
    if (u.startsWith('/public/')) return u
    if (u.startsWith('/assets/')) return '/public' + u.slice('/assets'.length)
    if (u.startsWith('/files/'))  return '/public' + u
    if (u.startsWith('/'))        return '/public' + u
    return '/public/' + u
  }

  // --------------------------------------
  // Meta panel builder
  // --------------------------------------
  // Creates the “details” panel next to the PDF (material, related, digital, police, CPS)
  // Accepts the parsed material JSON and a stable id to hook up show/hide behaviour
  function buildMetaPanel(meta, bodyId) {
    var mat  = (meta && meta.Material) || {}
    var rel  = (meta && meta.RelatedMaterials) || {}
    var dig  = (meta && meta.DigitalRepresentation) || {}
    var pol  = (meta && meta.PoliceMaterial) || {}
    var cps  = (meta && meta.CPSMaterial) || {}
    var insp = pol.Inspection || {}

    // Local helper: render rows from a mapping (shadowing the outer one is intentional for safety)
    function rowsHTMLLocal(obj, mapping) {
      return mapping.map(function (m) {
        var v = (m.get ? m.get(obj) : obj && obj[m.key])
        if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return ''
        var valHTML = (m.render ? m.render(v) : esc(v))
        return (
          '<div class="govuk-summary-list__row">' +
            '<dt class="govuk-summary-list__key">' + esc(m.label) + '</dt>' +
            '<dd class="govuk-summary-list__value">' + valHTML + '</dd>' +
          '</div>'
        )
      }).join('')
    }

    // Local helper: titled summary list section
    function sectionHTMLLocal(title, rows) {
      if (!rows) return ''
      return (
        '<h3 class="govuk-heading-s govuk-!-margin-top-3 govuk-!-margin-bottom-1">' + esc(title) + '</h3>' +
        '<dl class="govuk-summary-list govuk-!-margin-bottom-2">' + rows + '</dl>'
      )
    }

    // Local helper: summary list with spacing but without a heading
    function sectionHTMLNoHeading(rows) {
      if (!rows) return ''
      return (
        '<dl class="govuk-summary-list govuk-!-margin-top-3 govuk-!-margin-bottom-2">' + rows + '</dl>'
      )
    }

    // Material core fields
    var materialRows = rowsHTMLLocal(mat, [
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
    ])

    // Relationship fields
    var relatedRows = rowsHTMLLocal(rel, [
      { key:'RelatesToItem',    label:'Relates to item' },
      { key:'RelatedItemId',    label:'Related item id' },
      { key:'RelationshipType', label:'Relationship type' }
    ])

    // Digital representation (supports an array of items OR legacy single object)
    var digitalRows
    if (Array.isArray(dig.Items) && dig.Items.length) {
      digitalRows = dig.Items.map(function (it, idx) {
        var itemRows = rowsHTMLLocal(it, [
          { key:'FileName',             label:'File name' },
          { key:'ExternalFileLocation', label:'External file location' },
          { key:'ExternalFileURL',      label:'External file URL', render: function (v) {
              if (v === '#' || v === '') return '—'
              return '<a class="govuk-link" href="' + esc(v) + '" target="_blank" rel="noreferrer">' + esc(v) + '</a>'
            }},
          { key:'DigitalSignature',     label:'Digital signature' }
        ])
        return itemRows ? (
          '<div class="govuk-!-margin-bottom-2">' +
            '<h4 class="govuk-heading-s govuk-!-margin-bottom-1">Item ' + (idx + 1) + '</h4>' +
            '<dl class="govuk-summary-list govuk-!-margin-bottom-1">' + itemRows + '</dl>' +
          '</div>'
        ) : ''
      }).join('')
    } else {
      // Legacy single-object shape (backwards compatible)
      digitalRows = rowsHTMLLocal(dig, [
        { key:'FileName',             label:'File name' },
        { key:'Document',             label:'Document' },
        { key:'ExternalFileLocation', label:'External file location' },
        { key:'ExternalFileURL',      label:'External file URL', render: function (v) {
            if (v === '#' || v === '') return '—'
            return '<a class="govuk-link js-doc-link" href="' + esc(v) + '" target="_blank" rel="noreferrer">' + esc(v) + '</a>'
          }},
        { key:'DigitalSignature',     label:'Digital signature' }
      ])
    }

    // Police material, including nested “Inspection”
    var policeRows = rowsHTMLLocal(pol, [
      { key:'DisclosureStatus',               label:'Disclosure status' },
      { key:'RationaleForDisclosureDecision', label:'Rationale for disclosure decision' },
      { key:'Rebuttable',                     label:'Rebuttable' },
      { key:'SensitivityRationale',           label:'Sensitivity rationale' },
      { key:'Description',                    label:'Description' },
      { key:'Exceptions',                     label:'Exceptions', render: function (arr) {
          if (!Array.isArray(arr) || !arr.length) return '—'
          return '<ul class="govuk-list govuk-list--bullet govuk-!-margin-bottom-0">' +
                 arr.map(function (x){ return '<li>' + esc(x) + '</li>' }).join('') +
                 '</ul>'
        }},
      { label:'Inspection date', get: function(){ return insp.DateOfInspection } },
      { label:'Inspected by',   get: function(){ return insp.InspectedBy } }
    ])

    // CPS material
    var cpsRows = rowsHTMLLocal(cps, [
      { key:'DisclosureStatus',               label:'Disclosure status' },
      { key:'RationaleForDisclosureDecision', label:'Rationale for disclosure decision' },
      { key:'SensitivityDispute',             label:'Sensitivity dispute' }
    ])

    // Meta bar: only the show/hide details control now
    var metaBar =
      '<div class="dcf-viewer__meta-bar">' +
        '<div class="dcf-meta-actions">' +
          '<a href="#" class="govuk-link js-meta-toggle" ' +
            'data-action="toggle-meta" ' +
            'aria-expanded="true" ' +
            'aria-controls="' + esc(bodyId) + '" ' +
            'data-controls="' + esc(bodyId) + '">' +
            'Hide details</a>' +
        '</div>' +
      '</div>'

    // Inline actions (reclassify) – placed inside the meta body before first section
    var inlineActions =
      '<div class="dcf-meta-inline-actions">' +
        '<a href="#" class="govuk-button govuk-button--primary dcf-meta-secondary" data-action="reclassify">Request reclassification</a>' +
      '</div>'

    // Assemble full meta panel
    return '' +
      '<div class="dcf-viewer__meta">' +
        metaBar +
        '<div id="' + esc(bodyId) + '" class="dcf-viewer__meta-body">' +
          inlineActions +
          // Material section rendered without a heading for a tighter top
          sectionHTMLNoHeading(materialRows) +
          sectionHTMLLocal('Related materials',      relatedRows)  +
          sectionHTMLLocal('Digital representation', digitalRows)  +
          sectionHTMLLocal('Police material',        policeRows)   +
          sectionHTMLLocal('CPS material',           cpsRows)      +
        '</div>' +
      '</div>'
  }

  // --------------------------------------
  // Preview builder (pdf.js + chrome)
  // --------------------------------------
  // Renders the full preview UI (toolbar, tab, meta panel, ops menu, iframe)
  function openMaterialPreview(link) {
    // Clear any search “No results / N results” banner when opening a doc
    removeSearchStatus()

    // Pull JSON + core attributes from the clicked link
    var meta  = getMaterialJSONFromLink(link) || {}
    var url   = link.getAttribute('data-file-url') || link.getAttribute('href')
    var title = link.getAttribute('data-title') || (link.textContent || '').trim() || 'Selected file'

    // Minimal toolbar with close + full-width toggle
    var toolbar =
      '<div class="dcf-viewer__toolbar govuk-!-margin-bottom-4">' +
        '<a href="#" class="govuk-link" data-action="close-viewer">Close preview</a>' +
        '<span aria-hidden="true" class="govuk-!-margin-horizontal-2">&nbsp;|&nbsp;</span>' +
        '<a href="#" class="govuk-link" data-action="toggle-full" aria-pressed="false">View full width</a>' +
      '</div>'

    // Generate a stable id for the meta body to wire up show/hide
    var rawId = (meta.ItemId || (meta.Material && meta.Material.Reference) || Date.now()).toString()
    var bodyId = 'meta-' + rawId.replace(/[^a-zA-Z0-9_-]/g, '-')

    var metaPanel = buildMetaPanel(meta, bodyId)

    // “Edit document” ops menu and the primary icon button
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
      '</div>'

    // Point pdf.js viewer at the file we want to display
    var fileUrl      = toPublic(url)
    var pdfViewerUrl = '/public/pdfjs/web/viewer.html?file=' + encodeURIComponent(fileUrl)
    var iframe = '<iframe class="dcf-viewer__frame" src="' + esc(pdfViewerUrl) + '" title="Preview of ' + esc(title) + '" loading="lazy" referrerpolicy="no-referrer"></iframe>'

    // Paint the viewer and focus it for keyboard users
    viewer.hidden = false
    viewer.setAttribute('tabindex', '-1')
    viewer.innerHTML = toolbar + buildDocTabs(title) + metaPanel + opsBar + iframe

    setActiveCard(link)
    viewer.focus({ preventScroll: false })
  }

  // --------------------------------------
  // Intercepts: open previews from cards/links
  // --------------------------------------

  // Capture clicks on any .js-material-link[data-file-url] and render in the viewer
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a.js-material-link[data-file-url]')
    if (!link) return
    if (!viewer) return

    e.preventDefault()
    e.stopPropagation()
    openMaterialPreview(link)
  }, true) // capture so we win against default navigation

  // Allow opening materials from elsewhere (e.g. injected search results) via .dcf-viewer-link
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest('a.dcf-viewer-link')
    if (!a) return
    if (a.getAttribute('target') === '_blank') return   // respect explicit new-tab links

    e.preventDefault()
    e.stopPropagation()
    openMaterialPreview(a)
  }, true)

  // --------------------------------------
  // Viewer toolbar + meta actions
  // --------------------------------------
  viewer.addEventListener('click', function (e) {
    // Close “×” inside the generated tab mirrors the main close action
    if (e.target && e.target.closest('.dcf-doc-tab__close')) {
      e.preventDefault()
      var close = viewer.querySelector('[data-action="close-viewer"]')
      if (close) close.click()
      return
    }

    var a = e.target.closest('a[data-action]')
    if (!a) return
    e.preventDefault()

    var action = a.getAttribute('data-action')

    // Close the whole viewer and reset layout
    if (action === 'close-viewer') {
      viewer.innerHTML = '<p class="govuk-hint govuk-!-margin-bottom-3">Select a material from the list to preview it here.</p>'
      viewer.hidden = true
      if (layout) layout.classList.remove('is-full')
      document.querySelectorAll('.dcf-material-card--active').forEach(function (el) { el.classList.remove('dcf-material-card--active') })
      return
    }

    // Toggle the surrounding layout between split view and full-width
    if (action === 'toggle-full') {
      if (!layout) return
      var on = layout.classList.toggle('is-full')
      a.textContent = on ? 'Exit full width' : 'View full width'
      a.setAttribute('aria-pressed', String(on))
      viewer.focus({ preventScroll: true })
      return
    }

    // Show/hide the meta details panel (robust to id drift)
    if (action === 'toggle-meta') {
      var metaWrap = a.closest('.dcf-viewer__meta')
      var body =
        // 1) Try the explicitly referenced element within the same meta wrapper
        (function () {
          var id = a.getAttribute('aria-controls') || a.getAttribute('data-controls')
          if (!metaWrap || !id) return null
          try { return metaWrap.querySelector('#' + CSS.escape(id)) } catch (e) { return null }
        })()
        // 2) Fallback to the first meta body in the wrapper
        || (metaWrap && metaWrap.querySelector('.dcf-viewer__meta-body'))

      if (!body) return

      // Toggle using the DOM state and keep the control’s text/aria in sync
      var willHide = !body.hidden          // visible -> hide; hidden -> show
      body.hidden = willHide
      a.setAttribute('aria-expanded', String(!willHide))
      a.textContent = willHide ? 'Show details' : 'Hide details'
      console.log('toggle-meta -> hidden:', body.hidden)
      return
    }

    // Placeholder for future behaviour
    if (action === 'reclassify') {
      console.log('Reclassify clicked')
      return
    }
  }, false)

  // --------------------------------------
  // Ops menu (MoJ button menu) open/close
  // --------------------------------------
  viewer.addEventListener('click', function (e) {
    var toggle = e.target.closest('.moj-button-menu__toggle')
    if (!toggle) return
    e.preventDefault()
    var menu = toggle.closest('.moj-button-menu')
    var wrapper = menu && menu.querySelector('.moj-button-menu__wrapper')
    if (!wrapper) return
    var expanded = toggle.getAttribute('aria-expanded') === 'true'
    toggle.setAttribute('aria-expanded', String(!expanded))
    wrapper.hidden = expanded
  })

  // Click-away to close the menu if open
  document.addEventListener('click', function (evt) {
    if (!viewer) return
    var openToggle = viewer.querySelector('.moj-button-menu__toggle[aria-expanded="true"]')
    if (!openToggle) return
    if (!evt.target.closest('.moj-button-menu')) {
      openToggle.setAttribute('aria-expanded', 'false')
      var wrap = openToggle.closest('.moj-button-menu').querySelector('.moj-button-menu__wrapper')
      if (wrap) wrap.hidden = true
    }
  })

  // --------------------------------------
  // Meta link behaviour
  // --------------------------------------
  // If user clicks a document link *inside* the meta (opens a new tab),
  // we don’t block navigation — we just clear the search status banner
  viewer.addEventListener('click', function (e) {
    var a = e.target && e.target.closest('a.js-doc-link')
    if (!a) return
    removeSearchStatus()
  }, true)

  // Sanity flag for debugging / feature detection
  window.__materialsPreviewReady = true
})()