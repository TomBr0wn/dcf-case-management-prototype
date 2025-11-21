const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { calculateTimeLimit } = require('../helpers/timeLimit')

module.exports = router => {
  router.get("/cases/:caseId/witnesses", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        user: true,
        witnesses: { include: { statements: true }, orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }] },
        lawyers: true,
        defendants: {
          include: {
            charges: true
          }
        },
        location: true,
        tasks: true,
        dga: true
      }
    })

    const timeLimitInfo = calculateTimeLimit(_case)
    _case.soonestTimeLimit = timeLimitInfo.soonestTimeLimit
    _case.timeLimitType = timeLimitInfo.timeLimitType
    _case.timeLimitCount = timeLimitInfo.timeLimitCount

    res.render("cases/witnesses/index", { _case })
  })

}