const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function addCtlInfo(_case) {
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

  return _case
}

module.exports = router => {
  router.get("/cases/:caseId", async (req, res) => {
    let _case = await prisma.case.findUnique({
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
        hearings: {
          orderBy: {
            startDate: 'asc'
          },
          take: 1
        },
        location: true,
        tasks: true,
        dga: true
      },
    })
    _case = addCtlInfo(_case)
    res.render("cases/show", { _case })
  })

  router.get("/cases/:caseId/complexity-calculation", async (req, res) => {
    let _case = await prisma.case.findUnique({
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
        hearings: {
          orderBy: {
            startDate: 'asc'
          },
          take: 1
        },
        location: true,
        tasks: true,
        dga: true
      },
    })
    _case = addCtlInfo(_case)
    res.render("cases/complexity-calculation", { _case })
  })

}