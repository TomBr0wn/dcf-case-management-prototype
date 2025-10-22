const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {
  router.get("/cases/:caseId/witnesses", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { 
        user: true, 
        witnesses: { include: { statements: true }, orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }] }, 
        lawyers: true, 
        defendants: true, 
        hearing: true, 
        location: true, 
        tasks: true, 
        dga: true 
      }
    })

    res.render("cases/witnesses/index-simple", { _case })
  })

}