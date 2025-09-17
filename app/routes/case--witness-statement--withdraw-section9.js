const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {
  
  router.get("/cases/:caseId/witnesses/:witnessId/statements/:statementId/withdraw-section9", async (req, res) => {
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

    const witnessStatement = await prisma.witnessStatement.findUnique({
      where: { id: statementId },
    })

    res.render("cases/witnesses/withdraw-section9/index", { 
      _case,
      witness,
      witnessStatement
    })
  })

  router.post("/cases/:caseId/witnesses/:witnessId/statements/:statementId/withdraw-section9", async (req, res) => {
    let witnessStatement = await prisma.witnessStatement.update({
      where: { id: parseInt(req.params.statementId) },
      data: {
        serveSection9: false
      },
      include: {
        witness: true
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: 1,
        model: 'WitnessStatement',
        recordId: witnessStatement.id,
        action: 'UPDATE',
        title: 'Witness statement unmarked as Section 9',
        caseId: parseInt(req.params.caseId),
        meta: { witnessStatement, witness: witnessStatement.witness }
      }
    })

    req.flash('success', 'Statement unmarked as Section 9')

    res.redirect(`/cases/${req.params.caseId}/witnesses`)

  })

}