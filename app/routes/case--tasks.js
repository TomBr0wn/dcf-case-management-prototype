const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {
  router.get("/cases/:caseId/tasks", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        tasks: {
          orderBy: { dueDate: 'asc' },
          include: {
            assignedToUser: true,
            assignedToTeam: {
              include: {
                unit: true
              }
            }
          }
        },
        user: true,
        unit: true,
        lawyers: true,
        defendants: {
          include: {
            charges: true,
            defenceLawyer: true
          }
        },
        hearing: true,
        location: true,
        dga: true
      },
    })

    // Add CTL information to the case
    let allCtlDates = []
    _case.defendants.forEach(defendant => {
      defendant.charges.forEach(charge => {
        if (charge.custodyTimeLimit) {
          allCtlDates.push(new Date(charge.custodyTimeLimit))
        }
      })
    })

    _case.hasCTL = allCtlDates.length > 0
    _case.soonestCTL = allCtlDates.length > 0 ? new Date(Math.min(...allCtlDates)) : null
    _case.ctlCount = allCtlDates.length

    res.render("cases/tasks/index", { _case })
  })

}