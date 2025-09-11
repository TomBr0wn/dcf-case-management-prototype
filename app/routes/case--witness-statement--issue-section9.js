const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {
  
  router.get("/cases/:caseId/witnesses/:witnessId/statements/:statementId/issue-section9", async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const witnessId = parseInt(req.params.witnessId)
    const statementId = parseInt(req.params.statementId)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true, witnesses: true },
    })

    const witness = await prisma.witness.findUnique({
      where: { id: witnessId },
      include: { statements: true },
    })

    const witnessStatement = witness.statements.find((s) => s.id === statementId)
    const statementNumber = witness.statements.findIndex((s) => s.id === statementId) + 1

    res.render("cases/witnesses/issue-section9/index", { 
      _case,
      witness,
      witnessStatement,
      statementNumber
    })
  })

  router.post("/cases/:caseId/witnesses/:witnessId/statements/:statementId/issue-section9", async (req, res) => {
    await prisma.witnessStatement.update({
      where: { id: parseInt(req.params.statementId) },
      data: {
        serveSection9: true
      }
    })

    req.flash('success', 'Statement served as Section 9')

    res.redirect(`/cases/${req.params.caseId}/witnesses`)

  })

}