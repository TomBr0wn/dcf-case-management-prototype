const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { calculateTimeLimit } = require('../helpers/timeLimit')

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

    const timeLimitInfo = calculateTimeLimit(_case)
    _case.soonestTimeLimit = timeLimitInfo.soonestTimeLimit
    _case.timeLimitType = timeLimitInfo.timeLimitType
    _case.timeLimitCount = timeLimitInfo.timeLimitCount

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

    const timeLimitInfo = calculateTimeLimit(_case)
    _case.soonestTimeLimit = timeLimitInfo.soonestTimeLimit
    _case.timeLimitType = timeLimitInfo.timeLimitType
    _case.timeLimitCount = timeLimitInfo.timeLimitCount

    res.render("cases/complexity-calculation", { _case })
  })

}