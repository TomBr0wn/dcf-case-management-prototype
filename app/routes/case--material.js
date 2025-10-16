const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const documentTypes = require('../data/document-types')

const path = require('path')
const fs = require('fs').promises

function resetFilters(req) {
  _.set(req, 'session.data.documentListFilters.documentTypes', null)
}

async function listFilesIn(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter(e => e.isFile())
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b))
  } catch (e) {
    console.warn('Could not read files from', dir, e.message)
    return []
  }
}

//////////////////////////////////////////////////////////////////

module.exports = router => {
  router.get("/cases/:caseId/material", async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    let selectedDocumentTypeFilters = _.get(req.session.data.documentListFilters, 'documentTypes', [])

    let selectedFilters = { categories: [] }

    // Document type filter display
    if (selectedDocumentTypeFilters?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Type' },
        items: selectedDocumentTypeFilters.map(function(label) {
          return { text: label, href: `/cases/${caseId}/material/remove-type/${label}` }
        })
      })
    }

    

    // Build Prisma where clause for documents
    let where = { caseId: caseId, AND: [] }

    if (selectedDocumentTypeFilters?.length) {
      where.AND.push({ type: { in: selectedDocumentTypeFilters } })
    }

    if (where.AND.length === 0) {
      delete where.AND
    }

    // Fetch case
    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        user: true,
        witnesses: { include: { statements: true } },
        lawyers: true,
        defendants: true,
        hearing: true,
        location: true,
        tasks: true,
        dga: true
      }
    })

    // Fetch documents with filters
    let documents = await prisma.document.findMany({
      where: where
    })

    // Search by document name
    let keywords = _.get(req.session.data.documentSearch, 'keywords')

    if(keywords) {
      keywords = keywords.toLowerCase()
      documents = documents.filter(document => {
        let documentName = document.name.toLowerCase()
        return documentName.indexOf(keywords) > -1
      })
    }

    let documentTypeItems = documentTypes.map(docType => ({
      text: docType,
      value: docType
    }))

    // Files under app/assets/files (served at /public/files/* by the kit)
    const assetsFilesDir = path.join(__dirname, '..', 'assets', 'files')
    const assetFiles = await listFilesIn(assetsFilesDir)

    const assetFileLinks = assetFiles.map(name => ({
      name,
      href: `/public/files/${name}`
    }))


    res.render("cases/material/index", {
      _case,
      documents,
      documentTypeItems,
      selectedFilters,
      assetFiles,        // just names
      assetFileLinks     // [{name, href}]
    })
  })

  //////////////////////////////////////////////////////////////////


  router.get("/cases/:caseId/material/:documentId/show", async (req, res) => {
    const caseId = Number(req.params.caseId)
    const documentId = Number(req.params.documentId)

    // Fetch the case
    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        user: true,
        witnesses: { include: { statements: true } },
        lawyers: true,
        defendants: true,
        hearing: true,
        location: true,
        tasks: true,
        dga: true
      }
    })
    if (!_case) return res.status(404).render("not-found")

    // Fetch the single document for this case
    const document = await prisma.document.findFirst({
      where: { id: documentId, caseId }
    })
    if (!document) return res.status(404).render("not-found")

    // (Optional) if you still need filter UI on the show page,
    // you can compute documentTypeItems/selectedFilters the same way as the list page.
    res.render("cases/material/show", {
      _case,
      document
    })
  })


  router.get('/cases/:caseId/material/remove-type/:type', (req, res) => {
    _.set(req, 'session.data.documentListFilters.documentTypes', _.pull(req.session.data.documentListFilters.documentTypes, req.params.type))
    res.redirect(`/cases/${req.params.caseId}/material`)
  })

  router.get('/cases/:caseId/material/clear-filters', (req, res) => {
    resetFilters(req)
    res.redirect(`/cases/${req.params.caseId}/material`)
  })

  router.get('/cases/:caseId/material/clear-search', (req, res) => {
    _.set(req, 'session.data.documentSearch.keywords', '')
    res.redirect(`/cases/${req.params.caseId}/material`)
  })

}