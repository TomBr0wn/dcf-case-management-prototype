const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {
  router.get("/cases/:id/activity", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.id) },
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

    const events = await prisma.activityLog.findMany({
      where: { caseId: _case.id },
      include: {
        user: true,
        case: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.render("cases/activity/index", { _case, events })
  })

}