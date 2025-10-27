const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const Pagination = require('../helpers/pagination')
const taskTypes = require('../data/task-types')

function resetFilters(req) {
  _.set(req, 'session.data.taskListFilters.taskTypes', null)
  _.set(req, 'session.data.taskListFilters.assigned', null)
}

module.exports = router => {

  router.get("/tasks", async (req, res) => {
    const currentUser = req.session.data.user

    // Ensure taskListFilters object exists
    if (!req.session.data.taskListFilters) {
      req.session.data.taskListFilters = {}
    }

    // Make sure the default assignee is the signed in user
    if (!_.has(req.session.data, 'taskListFilters.assigned')) {
      _.set(req.session.data.taskListFilters, 'assigned', [`${req.session.data.user.id}`])
    }

    let selectedAssigneeFilters = _.get(req.session.data.taskListFilters, 'assigned', [])
    let selectedTaskTypeFilters = _.get(req.session.data.taskListFilters, 'taskTypes', [])

    let selectedFilters = { categories: [] }

    let userIds
    let selectedAssigneeItems = []

    // Assigned filter display
    if (selectedAssigneeFilters?.length) {
      userIds = selectedAssigneeFilters.filter(function(f) { return f !== "Unassigned" }).map(Number)

      let fetchedUsers = []
      if (userIds.length) {
        fetchedUsers = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true }
        })
      }

      selectedAssigneeItems = selectedAssigneeFilters.map(function(selectedUser) {
        if (selectedUser === "Unassigned") return { text: "Unassigned", href: '/tasks/remove-assigned/' + selectedUser }

        let user = fetchedUsers.find(function(user) { return user.id === Number(selectedUser) })
        let displayText = user ? user.firstName + " " + user.lastName : selectedUser

        // Show name with "(you)" for current user
        if (currentUser && user && user.id === currentUser.id) {
          displayText = user.firstName + " " + user.lastName + " (you)"
        }

        return { text: displayText, href: '/tasks/remove-assigned/' + selectedUser }
      })

      selectedFilters.categories.push({ heading: { text: 'Assignee' }, items: selectedAssigneeItems })
    }

    // Task type filter display
    if (selectedTaskTypeFilters?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Type' },
        items: selectedTaskTypeFilters.map(function(label) {
          return { text: label, href: '/tasks/remove-type/' + label }
        })
      })
    }

    // Build Prisma where clause
    let where = { AND: [] }

    if (selectedAssigneeFilters?.length) {
      let assignedFilters = []

      if (selectedAssigneeFilters?.includes("Unassigned")) {
        assignedFilters.push({ assignedToId: null })
      }

      if (userIds?.length) {
        assignedFilters.push({ assignedToId: { in: userIds } })
      }

      if (assignedFilters.length) {
        where.AND.push({ OR: assignedFilters })
      }
    }

    if (selectedTaskTypeFilters?.length) {
      where.AND.push({ type: { in: selectedTaskTypeFilters } })
    }

    if (where.AND.length === 0) {
      where = {}
    }

    let tasks = await prisma.task.findMany({
      where: where,
      orderBy: { dueDate: 'asc' },
      include: {
        case: {
          include: {
            defendants: true
          }
        },
        assignedTo: true
      }
    })

    let keywords = _.get(req.session.data.taskSearch, 'keywords')

    if(keywords) {
      keywords = keywords.toLowerCase()
      tasks = tasks.filter(task => {
        let taskName = task.name.toLowerCase()
        let caseReference = task.case.reference.toLowerCase()
        let defendantName = (task.case.defendants[0].firstName + ' ' + task.case.defendants[0].lastName).toLowerCase()
        return taskName.indexOf(keywords) > -1 || caseReference.indexOf(keywords) > -1 || defendantName.indexOf(keywords) > -1
      })
    }

    // Fetch all users for the filter
    let users = await prisma.user.findMany()

    let assigneeItems = users.map(user => {
      // Show name with "(you)" for current user
      if (currentUser && user.id === currentUser.id) {
        return {
          text: `${user.firstName} ${user.lastName} (you)`,
          value: `${user.id}`
        }
      }
      return {
        text: `${user.firstName} ${user.lastName}`,
        value: `${user.id}`
      }
    })

    // Put current user (you) first
    assigneeItems.sort((a, b) => {
      if (a.text.includes('(you)')) return -1
      if (b.text.includes('(you)')) return 1
      return 0
    })

    // Put "Unassigned" second
    assigneeItems.splice(1, 0, { text: 'Unassigned', value: 'Unassigned' })

    let taskTypeItems = taskTypes.map(taskType => ({
      text: taskType,
      value: taskType
    }))

    let totalTasks = tasks.length
    let pageSize = 25
    let pagination = new Pagination(tasks, req.query.page, pageSize)
    tasks = pagination.getData()

    res.render('tasks/index', {
      tasks,
      pagination,
      totalTasks,
      assigneeItems,
      selectedAssigneeFilters,
      selectedAssigneeItems,
      taskTypeItems,
      selectedFilters
    })
  })

  router.get('/tasks/remove-assigned/:userId', (req, res) => {
    const currentFilters = _.get(req, 'session.data.taskListFilters.assigned', [])
    _.set(req, 'session.data.taskListFilters.assigned', _.pull(currentFilters, req.params.userId))
    res.redirect('/tasks')
  })

  router.get('/tasks/remove-type/:type', (req, res) => {
    const currentFilters = _.get(req, 'session.data.taskListFilters.taskTypes', [])
    _.set(req, 'session.data.taskListFilters.taskTypes', _.pull(currentFilters, req.params.type))
    res.redirect('/tasks')
  })

  router.get('/tasks/clear-filters', (req, res) => {
    resetFilters(req)
    res.redirect('/tasks')
  })

  router.get('/tasks/clear-search', (req, res) => {
    _.set(req, 'session.data.taskSearch.keywords', '')
    res.redirect('/tasks')
  })

}