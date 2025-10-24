const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {

  router.get("/cases/:caseId/notes", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        defendants: true,
        witnesses: true,
        notes: {
          include: { user: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    res.render("cases/notes/index", {
      _case
    })
  })

  router.get("/cases/:caseId/notes/new", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true, witnesses: true }
    })

    res.render("cases/notes/new/index", { _case })
  })

  router.post("/cases/:caseId/notes/new", (req, res) => {
    res.redirect(`/cases/${req.params.caseId}/notes/new/check`)
  })

  router.get("/cases/:caseId/notes/new/check", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true, witnesses: true }
    })

    const content = req.session.data.addNote?.content || ''

    res.render("cases/notes/new/check", { _case, content })
  })

  router.post("/cases/:caseId/notes/new/check", async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const content = req.session.data.addNote.content
    const userId = req.session.data.user.id

    const note = await prisma.note.create({
      data: {
        content,
        caseId,
        userId
      }
    })

    // Create activity log entry
    await prisma.activityLog.create({
      data: {
        userId,
        model: 'Note',
        recordId: note.id,
        action: 'CREATE',
        title: 'Note added',
        caseId,
        meta: {
          content: content.length > 100 ? content.substring(0, 100) + '...' : content
        }
      }
    })

    delete req.session.data.addNote

    req.flash('success', 'Note added')
    res.redirect(`/cases/${caseId}/notes`)
  })

  router.get("/cases/:caseId/notes/:noteId", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true, witnesses: true }
    })

    const note = await prisma.note.findUnique({
      where: { id: parseInt(req.params.noteId) },
      include: { user: true }
    })

    res.render("cases/notes/show", {
      _case,
      note
    })
  })

}
