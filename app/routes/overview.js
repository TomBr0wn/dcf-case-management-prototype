const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {

  router.get("/overview", async (req, res) => {
    const unassignedCaseCount = await prisma.case.count({
      where: {
        lawyers: {
          none: {}   // means no related lawyers
        }
      }
    })

    const needsDGAReviewCount = await prisma.case.count({
      where: {
        dga: {
          outcome: null
        }
      }
    })

    res.render('overview/index', {
      unassignedCaseCount,
      needsDGAReviewCount
    })
  })

}