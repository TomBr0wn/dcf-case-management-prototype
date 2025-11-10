//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Add your filters here
addFilter('priorityTagClass', status => {
  switch(status) {
    case 'High priority':
      return 'govuk-tag--red'
		case 'Medium priority':
      return 'govuk-tag--yellow'
    case 'Low priority':
      return 'govuk-tag--green'
  }
})

addFilter('isoDateString', date => {
  return date.toISOString()
})

addFilter('formatNumber', number => {
  return Number(number).toLocaleString('en-GB')
})

addFilter('daysUntil', date => {
  const now = new Date()
  const targetDate = new Date(date)
  const diffTime = targetDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) {
    return 'overdue'
  }
  return diffDays === 1 ? '1 day' : `${diffDays} days`
})