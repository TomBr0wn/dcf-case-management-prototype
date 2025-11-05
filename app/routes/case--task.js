const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {
  router.get("/cases/:caseId/tasks/:taskId", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
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
        tasks: true,
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

    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.taskId) },
      include: {
        case: {
          include: {
            defendants: {
              include: {
                charges: true,
                defenceLawyer: true
              }
            },
            unit: true
          }
        },
        assignedToUser: true,
        assignedToTeam: {
          include: {
            unit: true
          }
        }
      }
    })

    res.render("cases/tasks/show", { _case, task })
  })

}
