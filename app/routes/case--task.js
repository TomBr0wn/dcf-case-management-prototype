const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {
  router.get("/cases/:caseId/tasks/:taskId", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { user: true, unit: true, lawyers: true, defendants: true, hearing: true, location: true, tasks: true, dga: true },
    })

    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.taskId) },
    })

    res.render("cases/tasks/show", { _case, task })
  })

}
