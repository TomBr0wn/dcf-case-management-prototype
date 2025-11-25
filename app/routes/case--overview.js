const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {
  router.get("/cases/:caseId", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { user: true, unit: true, lawyers: true, defendants: true, location: true, tasks: true, dga: true },
    })
    res.render("cases/show", { _case })
  })

  router.get("/cases/:caseId/complexity-calculation", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { user: true, unit: true, lawyers: true, defendants: true, location: true, tasks: true, dga: true },
    })
    res.render("cases/complexity-calculation", { _case })
  })

}