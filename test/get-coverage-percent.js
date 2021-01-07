const json = require('../coverage/coverage-summary.json');

const avgPercentage = ['lines', 'statements', 'functions', 'branches'].map((type) => json.total[type].pct).reduce((acc, v) => acc + v, 0) / 4
console.log(`${Math.round(avgPercentage)}%`)
