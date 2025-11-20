/**
 * Calculate time limit information for a case across all three types: CTL, STL, and PACE
 *
 * @param {Object} _case - Case object with defendants (including charges)
 * @returns {Object} - Object with soonestTimeLimit, timeLimitType, and timeLimitCount
 */
function calculateTimeLimit(_case) {
  const allTimeLimits = [];

  _case.defendants.forEach(defendant => {
    // Check for PACE time limit on defendant
    if (defendant.paceTimeLimit) {
      allTimeLimits.push({
        date: new Date(defendant.paceTimeLimit),
        type: 'PACE'
      });
    }

    // Check for CTL and STL on charges
    defendant.charges.forEach(charge => {
      if (charge.custodyTimeLimit) {
        allTimeLimits.push({
          date: new Date(charge.custodyTimeLimit),
          type: 'CTL'
        });
      }
      if (charge.statutoryTimeLimit) {
        allTimeLimits.push({
          date: new Date(charge.statutoryTimeLimit),
          type: 'STL'
        });
      }
    });
  });

  if (allTimeLimits.length === 0) {
    return {
      soonestTimeLimit: null,
      timeLimitType: null,
      timeLimitCount: 0
    };
  }

  // Find the soonest time limit
  const soonest = allTimeLimits.reduce((earliest, current) => {
    return current.date < earliest.date ? current : earliest;
  });

  return {
    soonestTimeLimit: soonest.date,
    timeLimitType: soonest.type,
    timeLimitCount: allTimeLimits.length
  };
}

module.exports = {
  calculateTimeLimit
};
