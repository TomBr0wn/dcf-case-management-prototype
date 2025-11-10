const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const Pagination = require('../helpers/pagination')

const reportStatuses = ['Not started', 'In progress', 'Completed']

function resetFilters(req) {
  _.set(req, 'session.data.reportListFilters.status', null)
  _.set(req, 'session.data.reportListFilters.unit', null)
}

module.exports = router => {

  router.get("/reports", async (req, res) => {
    const currentUser = req.session.data.user

    // Get user's unit IDs for filtering
    const userUnitIds = currentUser?.units?.map(uu => uu.unitId) || []

    let selectedStatusFilters = _.get(req.session.data.reportListFilters, 'status', [])
    let selectedUnitFilters = _.get(req.session.data.reportListFilters, 'unit', [])

    // Check if this is the first visit (no filters have been set at all)
    const isFirstVisit = req.session.data.reportListFilters === undefined || 
                         (selectedStatusFilters === undefined && selectedUnitFilters === undefined)
    
    // Default to "Not started" ONLY on first visit
    if (isFirstVisit) {
      selectedStatusFilters = ['Not started']
      _.set(req, 'session.data.reportListFilters.status', selectedStatusFilters)
    }
    
    // Ensure selectedStatusFilters is an array (even if empty after clearing)
    if (!selectedStatusFilters) {
      selectedStatusFilters = []
    }

    let selectedFilters = { categories: [] }

    // Status filter display
    if (selectedStatusFilters?.length) {
      selectedFilters.categories.push({
        heading: { text: 'Status' },
        items: selectedStatusFilters.map(function(label) {
          return { text: label, href: '/reports/remove-status/' + label }
        })
      })
    }

    // Unit filter display
    if (selectedUnitFilters?.length) {
      const unitIds = selectedUnitFilters.map(Number)

      let fetchedUnits = await prisma.unit.findMany({
        where: { id: { in: unitIds } }
      })

      let items = selectedUnitFilters.map(function (selectedUnit) {
        let unit = fetchedUnits.find(u => u.id === Number(selectedUnit))
        return { text: unit ? unit.name : selectedUnit, href: '/reports/remove-unit/' + selectedUnit }
      })

      selectedFilters.categories.push({ heading: { text: 'Unit' }, items })
    }

    // Build Prisma where clause
    let where = { 
      AND: [
        // Only include cases with DGA that have no outcome (non-compliant)
        { dga: { outcome: null } }
      ] 
    }

    // MANDATORY: Restrict to cases in user's units only
    if (selectedUnitFilters?.length) {
      const unitIds = selectedUnitFilters.map(Number)
      where.AND.push({ unitId: { in: unitIds } })
    } else if (userUnitIds.length) {
      where.AND.push({ unitId: { in: userUnitIds } })
    }

    // Status filter - this filters based on reportStatus field
    // Only apply if there are selected statuses
    if (selectedStatusFilters?.length > 0) {
      const statusConditions = selectedStatusFilters.map(status => {
        if (status === 'Not started') {
          return { reportStatus: null }
        }
        return { reportStatus: status }
      })
      
      where.AND.push({ OR: statusConditions })
    }

    let reports = await prisma.case.findMany({
      where: where,
      include: {
        unit: true,
        defendants: {
          include: {
            charges: true
          }
        },
        dga: {
          include: {
            failureReasons: true
          }
        }
      }
    })

    // Handle search by URN (reference number)
    let keywords = _.get(req.session.data.reportSearch, 'keywords')

    if(keywords) {
      keywords = keywords.toLowerCase()
      reports = reports.filter(report => {
        let reference = report.reference.toLowerCase()
        return reference.indexOf(keywords) > -1
      })
    }

    // Sort reports by status: In progress, Not started, Completed
    reports.sort((a, b) => {
      const statusOrder = {
        'In progress': 1,
        null: 2,  // Not started (reportStatus is null)
        'Completed': 3
      }
      
      const statusA = statusOrder[a.reportStatus] || 2
      const statusB = statusOrder[b.reportStatus] || 2
      
      return statusA - statusB
    })

    // Prepare filter items
    let statusItems = reportStatuses.map(status => ({ 
      text: status, 
      value: status
    }))

    // Fetch only user's units for the filter
    let units = await prisma.unit.findMany({
      where: { id: { in: userUnitIds } }
    })

    let unitItems = units.map(unit => ({
      text: `${unit.name}`,
      value: `${unit.id}`
    }))

    let totalReports = reports.length
    let pageSize = 25
    let pagination = new Pagination(reports, req.query.page, pageSize)
    reports = pagination.getData()

    res.render('reports/index', {
      totalReports,
      reports,
      statusItems,
      unitItems,
      selectedFilters,
      pagination
    })
  })

  router.get('/reports/remove-status/:status', (req, res) => {
    const currentFilters = _.get(req, 'session.data.reportListFilters.status', [])
    _.set(req, 'session.data.reportListFilters.status', _.pull(currentFilters, req.params.status))
    res.redirect('/reports')
  })

  router.get('/reports/remove-unit/:unit', (req, res) => {
    const currentFilters = _.get(req, 'session.data.reportListFilters.unit', [])
    _.set(req, 'session.data.reportListFilters.unit', _.pull(currentFilters, req.params.unit))
    res.redirect('/reports')
  })

  router.get('/reports/clear-filters', (req, res) => {
    resetFilters(req)
    res.redirect('/reports')
  })

  router.get('/reports/clear-search', (req, res) => {
    _.set(req, 'session.data.reportSearch.keywords', '')
    res.redirect('/reports')
  })

}