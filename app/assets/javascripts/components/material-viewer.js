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

  function buildPdfViewerUrl(rawUrl) {
    var fileUrl = toPublic(rawUrl || '')
      return '/public/pdfjs/web/viewer.html?file=' + encodeURIComponent(fileUrl)
    }


  // Remove the search status banner (if present). Used when opening a document
  
  // --- Tab state for multi-document viewing ---
  var _tabStore = { metaById: Object.create(null) };

  function stableId(meta, url) {
    var raw = (meta && (meta.ItemId || (meta.Material && meta.Material.Reference))) || url || Date.now().toString()
    return String(raw).replace(/[^a-zA-Z0-9_-]/g, '-')
  }

  function ensureShell() {
    var tabs = viewer.querySelector('#dcf-viewer-tabs')
    if (tabs) return tabs

    viewer.innerHTML = [
      '<div class="dcf-viewer__toolbar govuk-!-margin-bottom-4">',
        '<a href="#" class="govuk-link" data-action="close-viewer">Close preview</a>',
        '<span aria-hidden="true" class="govuk-!-margin-horizontal-2">&nbsp;|&nbsp;</span>',
        '<a href="#" class="govuk-link" data-action="toggle-full" aria-pressed="false">View full width</a>',
      '</div>',

      '<div id="dcf-viewer-tabs" class="dcf-viewer__tabs dcf-viewer__tabs--flush"></div>',
      '<div class="dcf-viewer__meta" data-meta-root></div>',

      // ✅ restore original ops-bar structure/classes and start hidden
      '<div class="dcf-viewer__ops-bar" data-ops-root>',
        '<div class="dcf-ops-actions">',
          '<a href="#" class="govuk-button govuk-button--inverse dcf-ops-iconbtn" data-action="ops-icon">',
            '<span class="dcf-ops-icon" aria-hidden="true">',
              '<img src="/public/files/marquee-blue.svg" alt="" width="20" height="20" />',
            '</span>',
            '<span class="govuk-visually-hidden">Primary action</span>',
          '</a>',
          '<div class="moj-button-menu" data-module="moj-button-menu">',
            '<button type="button" class="govuk-button govuk-button--inverse moj-button-menu__toggle" aria-haspopup="true" aria-expanded="false">',
              'Document actions <span class="moj-button-menu__icon" aria-hidden="true">▾</span>',
            '</button>',
            '<div class="moj-button-menu__wrapper" hidden>',
              '<ul class="moj-button-menu__list" role="menu">',
                '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Log an under or over redaction</a></li>',
                '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">View redaction log history</a></li>',
                '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Turn on potential redactions</a></li>',
                '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Rotate pages</a></li>',
                '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Discard pages</a></li>',
                // ✅ keep these two wired to your JS by adding data-action
                '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link" data-action="mark-read">Mark as read</a></li>',
                '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link" data-action="mark-unread">Mark as unread</a></li>',
                '<li class="moj-button-menu__item" role="none"><a role="menuitem" href="#" class="moj-button-menu__link">Rename</a></li>',
              '</ul>',
            '</div>',
          '</div>',
        '</div>',
      '</div>',

      '<iframe class="dcf-viewer__frame" src="" title="Preview" loading="lazy" referrerpolicy="no-referrer"></iframe>'
    ].join('')

    viewer.hidden = false
    viewer.setAttribute('tabindex','-1')
    return viewer.querySelector('#dcf-viewer-tabs')
  }



  function setActiveTab(tabEl) {
    var tabs = viewer.querySelectorAll('#dcf-viewer-tabs .dcf-doc-tab')
    Array.prototype.forEach.call(tabs, function(btn) {
      btn.classList.toggle('is-active', btn === tabEl)
      btn.setAttribute('aria-selected', String(btn === tabEl))
      btn.setAttribute('tabindex', btn === tabEl ? '0' : '-1')
    })
  }

  function renderMeta(meta) {
    // Build a new meta panel and swap it into [data-meta-root]
    var rawId = (meta && (meta.ItemId || (meta.Material && meta.Material.Reference))) || Date.now()
    var bodyId = 'meta-' + String(rawId).replace(/[^a-zA-Z0-9_-]/g, '-')
    var html = buildMetaPanel(meta || {}, bodyId)
    var root = viewer.querySelector('[data-meta-root]')
    if (root) {
      // Replace the whole wrapper to keep toggle JS happy
      root.outerHTML = html
    }
    // Update the toggle’s aria-controls to point at the current body id
    var toggle = viewer.querySelector('[data-action="toggle-meta"]')
    if (toggle) toggle.setAttribute('aria-controls', bodyId)
  }

  function switchToTabById(id) {
    var tab = viewer.querySelector('#dcf-viewer-tabs .dcf-doc-tab[data-tab-id="'+ id +'"]')
    if (!tab) return
    var meta = _tabStore.metaById[id] || {}
    var url  = tab.getAttribute('data-url') || ''
    var title= tab.getAttribute('data-title') || 'Document'

    var iframe = viewer.querySelector('.dcf-viewer__frame')
    if (iframe && url) iframe.setAttribute('src', buildPdfViewerUrl(url))

    setActiveTab(tab)
    // point _currentCard to the card for this tab (so status/menu reflect correctly)
    var itemId = tab.getAttribute('data-item-id')
    if (itemId) {
      viewer._currentCard = document.querySelector('.dcf-material-card[data-item-id="' + CSS.escape(itemId) + '"]') || null
    }

    // update meta
    renderMeta(meta)

    // keep ops menu in sync
    var menuEl = viewer.querySelector('.moj-button-menu')
    var status = (viewer._currentCard && viewer._currentCard.dataset.materialStatus) || null
    updateOpsMenuForStatus(menuEl, status)

    try { tab.focus() } catch (e) {}
  }

  function addOrActivateTab(meta, url, title) {
    var id = stableId(meta, url)
    var tabs = ensureShell()
    var existing = viewer.querySelector('#dcf-viewer-tabs .dcf-doc-tab[data-tab-id="'+ id +'"]')
    if (!existing) {
      var btn =
        document.createElement('button')
      btn.type = 'button'
      btn.className = 'dcf-doc-tab'
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', 'false')
      btn.setAttribute('data-tab-id', id)
      btn.setAttribute('data-item-id', (meta && meta.ItemId) || '')
      btn.setAttribute('data-url', url || '')
      btn.setAttribute('data-title', title || 'Document')
      btn.title = title || 'Document'
      btn.innerHTML =
        '<span class="dcf-doc-tab__label"></span>' +
        '<span class="dcf-doc-tab__close" aria-label="Close tab" role="button">×</span>' +
        '<span class="dcf-doc-tab__bar" aria-hidden="true"></span>'
      var label = btn.querySelector('.dcf-doc-tab__label')
      if (label) label.textContent = title || 'Document'
      tabs.appendChild(btn)
      _tabStore.metaById[id] = meta || {}
      existing = btn
    } else {
      // ensure latest meta stored (e.g., status changed)
      _tabStore.metaById[id] = meta || _tabStore.metaById[id] || {}
      existing.setAttribute('data-url', url || existing.getAttribute('data-url') || '')
      existing.setAttribute('data-title', title || existing.getAttribute('data-title') || 'Document')
    }
    // Activate and render
    setActiveTab(existing)
    var iframe = viewer.querySelector('.dcf-viewer__frame')
    if (iframe) iframe.setAttribute('src', buildPdfViewerUrl(url))

    renderMeta(meta)
  }
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

    // ---- helper: set material status on the card, its embedded JSON, and any global model ----
    function setMaterialStatus(card, status) {
      // Update the embedded JSON blob in the card (<script.js-material-data type="application/json">…</script>)
      var tag  = card.querySelector('script.js-material-data[type="application/json"]')
      var data = null
      try { data = tag ? JSON.parse(tag.textContent) : null } catch (e) { data = null }

      if (data) {
        // normalise common shapes: either top-level materialStatus or nested under Material
        if ('materialStatus' in data) {
          data.materialStatus = status
        } else if (data.Material && typeof data.Material === 'object') {
          data.Material.materialStatus = status
        } else {
          data.materialStatus = status
        }
        try { tag.textContent = JSON.stringify(data) } catch (e) {}
      }

      // Update visible badge on the card (adjust selector to your template)
      var badge = card.querySelector('.dcf-material-card__badge')
      if (badge) badge.textContent = status

      // Store on the element for quick reads
      card.dataset.materialStatus = status

      // If you hydrate a global model, update that too (so lists/summaries stay in sync)
      var itemId =
        (data && (data.ItemId || (data.Material && data.Material.ItemId) || data.itemId)) ||
        card.getAttribute('data-item-id')

      if (itemId && window.caseMaterials && Array.isArray(window.caseMaterials.Material)) {
        var m = window.caseMaterials.Material.find(x => (x.ItemId || x.itemId) === itemId)
        if (m) {
          // support either top-level or nested Material object shapes
          if ('materialStatus' in m) m.materialStatus = status
          else if (m.Material && typeof m.Material === 'object') m.Material.materialStatus = status
          else m.materialStatus = status
        }
      }

      // Optional: lightweight persistence across reloads for prototype use
      try {
        var caseId = (window.caseMaterials && window.caseMaterials.caseId) || card.getAttribute('data-case-id')
        if (itemId && caseId) localStorage.setItem('matStatus:' + caseId + ':' + itemId, status)
      } catch (e) {}
    }


    function updateOpsMenuForStatus(menuEl, status) {
      if (!menuEl) return
      var readItem   = menuEl.querySelector('[data-action="mark-read"]')
      var unreadItem = menuEl.querySelector('[data-action="mark-unread"]')

      // If it's Read → show "Mark as unread", hide "Mark as read"
      // Otherwise (New/Unread/anything else) → show "Mark as read"
      var isRead = String(status).toLowerCase() === 'read'
      if (readItem)   readItem.closest('li').hidden   = isRead
      if (unreadItem) unreadItem.closest('li').hidden = !isRead
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
          '<div class="dcf-meta-right">' + // ✅ new wrapper pushed to the right
            '<a href="#" class="govuk-link" data-action="add-note">Add a note</a>' +
            '<span class="dcf-meta-sep" aria-hidden="true"> | </span>' +
            '<a href="#" class="govuk-link js-meta-toggle dcf-meta-toggle" ' +
              'data-action="toggle-meta" ' +
              'aria-expanded="false" ' +
              'aria-controls="' + esc(bodyId) + '" ' +
              'data-controls="' + esc(bodyId) + '">' +
              '<span class="dcf-caret" aria-hidden="true">▸</span>' +
              '<span class="dcf-meta-linktext">Show details</span>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</div>'




    // Inline actions (reclassify) – placed inside the meta body before first section
    var inlineActions =
      '<div class="dcf-meta-inline-actions">' +
        '<a href="#" class="govuk-button govuk-button--primary dcf-meta-secondary" data-action="reclassify">Request reclassification</a>' +
      '</div>'

    // Assemble full meta panel metadate default set to hidden
    return '' +
      '<div class="dcf-viewer__meta" data-meta-root>' +
        metaBar +
        '<div id="' + esc(bodyId) + '" class="dcf-viewer__meta-body" hidden>' +
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

    if (!url && meta && meta.Material && meta.Material.myFileUrl) {
      url = meta.Material.myFileUrl
    }

    var title = link.getAttribute('data-title') || (link.textContent || '').trim() || 'Selected file'

    // Remember the originating material card so ops menu actions can update it
    var card = link.closest('.dcf-material-card')
    if (card) viewer._currentCard = card

    // Ensure viewer chrome exists
    if (!viewer.querySelector('#dcf-viewer-tabs')) ensureShell()

    // Update ops menu initialised state (MoJ menu relies on DOM present)
    var menu = viewer.querySelector('.moj-button-menu')
    if (menu && window.MOJFrontend && MOJFrontend.ButtonMenu) {
      try { new MOJFrontend.ButtonMenu({ container: menu }).init() } catch (e) {}
    }

    // Add or activate tab for this document
    addOrActivateTab(meta, url, title)

    console.log('Opening', { url, title, itemId: meta && meta.ItemId })

    // Focus viewer for keyboard users
    viewer.hidden = false
    try { viewer.focus({ preventScroll: true }) } catch (e) {}
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

    // 🔹 PART 2: remember the originating material card so ops menu actions
    // (like "Mark as read") know which item to update.
    var card = link.closest('.dcf-material-card')
    if (card) viewer._currentCard = card

    openMaterialPreview(link)
  }, true)


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
    // Close just the clicked tab (not the whole viewer)
    if (e.target && e.target.closest('.dcf-doc-tab__close')) {
      e.preventDefault()
      var btn = e.target.closest('.dcf-doc-tab')
      if (!btn) return
      var wasActive = btn.classList.contains('is-active')
      var id = btn.getAttribute('data-tab-id')
      if (id && _tabStore.metaById[id]) delete _tabStore.metaById[id]
      btn.parentNode && btn.parentNode.removeChild(btn)
      // If no tabs remain, close the viewer
      var anyTab = viewer.querySelector('#dcf-viewer-tabs .dcf-doc-tab')
      if (!anyTab) {
        var close = viewer.querySelector('[data-action="close-viewer"]')
        if (close) close.click()
        return
      }
      // If we removed the active tab, switch to the last tab
      if (wasActive) {
        var last = Array.prototype.slice.call(viewer.querySelectorAll('#dcf-viewer-tabs .dcf-doc-tab')).pop()
        if (last) {
          switchToTabById(last.getAttribute('data-tab-id'))
        }
      }
      return
    }

    
    // Activate a tab when its button is clicked (excluding the close icon)
    var tabBtn = e.target.closest('#dcf-viewer-tabs .dcf-doc-tab')
    if (tabBtn && !e.target.closest('.dcf-doc-tab__close')) {
      e.preventDefault()
      var id = tabBtn.getAttribute('data-tab-id')
      if (id) {
        switchToTabById(id)
      }
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
        (function () {
          var id = a.getAttribute('aria-controls') || a.getAttribute('data-controls')
          if (!metaWrap || !id) return null
          try { return metaWrap.querySelector('#' + CSS.escape(id)) } catch (e) { return null }
        })()
        || (metaWrap && metaWrap.querySelector('.dcf-viewer__meta-body'))

      if (!body) return

      // Toggle using the DOM state and keep the control’s text/aria in sync
      var willHide = !body.hidden    // visible -> hide; hidden -> show
      body.hidden = willHide
      a.setAttribute('aria-expanded', String(!willHide))

      // Update only the inner text span (avoid nuking the caret span)
      var textSpan = a.querySelector('.dcf-meta-linktext')
      if (textSpan) textSpan.textContent = willHide ? 'Show details' : 'Hide details'

      // Flip the caret glyph
      var caret = a.querySelector('.dcf-caret')
      if (caret) caret.textContent = willHide ? '▸' : '▾'

      return
    }


    // “Mark as read” from the Document actions menu
    if (action === 'mark-read') {
      // find the card that opened the viewer (preferred), or fall back to the active card
      var card =
        (viewer && viewer._currentCard) ||
        viewer.querySelector('.dcf-material-card--active') ||
        document.querySelector('.dcf-material-card--active') ||
        null

      if (card) {
        setMaterialStatus(card, 'Read')
        updateOpsMenuForStatus(menu, 'Read')
      } else {
        // No card found; nothing to update
        console.warn('mark-read: could not resolve current card')
      }

      // close the MoJ menu politely and return focus to the toggle
      var menu = a.closest('.moj-button-menu')
      if (menu) {
        var wrapper = menu.querySelector('.moj-button-menu__wrapper')
        var toggle  = menu.querySelector('.moj-button-menu__toggle')
        if (wrapper) wrapper.hidden = true
        if (toggle)  toggle.setAttribute('aria-expanded', 'false')
        if (toggle)  toggle.focus()
      }

      return
    }

    // “Mark as unread” from the Document actions menu
    if (action === 'mark-unread') {
      var card =
        (viewer && viewer._currentCard) ||
        viewer.querySelector('.dcf-material-card--active') ||
        document.querySelector('.dcf-material-card--active') ||
        null

      if (card) {
        setMaterialStatus(card, 'Unread')
      } else {
        console.warn('mark-unread: could not resolve current card')
      }

      // Close the menu + return focus to the toggle
      var menu = a.closest('.moj-button-menu')
      if (menu) {
        var wrapper = menu.querySelector('.moj-button-menu__wrapper')
        var toggle  = menu.querySelector('.moj-button-menu__toggle')
        if (wrapper) wrapper.hidden = true
        if (toggle)  toggle.setAttribute('aria-expanded', 'false')
        if (toggle)  toggle.focus()
        // Reflect the new status in which menu item is visible
        updateOpsMenuForStatus(menu, 'Unread')
      }

      return
    }

    // Placeholder for future behaviour
    if (action === 'reclassify') {
      console.log('Reclassify clicked')
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