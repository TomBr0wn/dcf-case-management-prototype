const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { getTaskSeverity } = require('../helpers/taskState')

module.exports = router => {

  router.get("/overview", async (req, res) => {
    const currentUser = req.session.data.user
    const userUnitIds = currentUser?.units?.map(uu => uu.unitId) || []

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

    // Fetch tasks assigned to current user
    let tasks = await prisma.task.findMany({
      where: {
        AND: [
          { completedDate: null },
          { assignedToUserId: currentUser.id },
          { case: { unitId: { in: userUnitIds } } }
        ]
      }
    })

    // Calculate severity for each task and group by severity
    const tasksBySeverity = {
      'Critically overdue': [],
      'Overdue': [],
      'Due soon': [],
      'Not due yet': []
    }

    tasks.forEach(task => {
      const severity = getTaskSeverity(task)
      if (tasksBySeverity[severity]) {
        tasksBySeverity[severity].push(task)
      }
    })

    res.render('overview/index', {
      unassignedCaseCount,
      needsDGAReviewCount,
      criticallyOverdueTaskCount: tasksBySeverity['Critically overdue'].length,
      overdueTaskCount: tasksBySeverity['Overdue'].length,
      dueSoonTaskCount: tasksBySeverity['Due soon'].length,
      notDueYetTaskCount: tasksBySeverity['Not due yet'].length
    })
  })

}