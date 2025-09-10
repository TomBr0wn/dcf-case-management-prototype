const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const flash = require('connect-flash')
router.use(flash())

router.all('*', (req, res, next) => {
  res.locals.referrer = req.query.referrer
  res.locals.path = req.path
  res.locals.protocol = req.protocol
  res.locals.hostname = req.hostname
  res.locals.query = req.query
  res.locals.flash = req.flash('success')[0]
  next()
})

router.get('/clear-data', async function (req, res) {
  delete req.session.data
  const redirectUrl = req.query.returnUrl || '/'

  try {
    // Ensure database folder exists
    const dbFile = process.env.DATABASE_URL?.replace("file:", "")
    if (dbFile) {
      const dbDir = path.dirname(dbFile)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
        console.log(`✅ Created database directory: ${dbDir}`)
      }
    }

    // Run prisma db push --force-reset
    await runCommand("npx", ["prisma", "db", "push", "--force-reset"])

    // Run prisma seed
    await runCommand("npx", ["prisma", "db", "seed"])

    console.log("✅ Database cleared and seeded")
    res.redirect(redirectUrl)
  } catch (err) {
    console.error("Error clearing/seeding DB:", err)
    res.status(500).json({ error: "Failed to reset & seed database" })
  }
})

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true })

    child.on("error", (err) => reject(err))
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`))
    })
  })
}

require('./routes/account')(router)
require('./routes/overview')(router)
require('./routes/cases')(router)
require('./routes/cases--edit-lawyers')(router)
require('./routes/case--overview')(router)
require('./routes/case--dga')(router)
require('./routes/case--witnesses')(router)
// require('./routes/case--witness')(router)
require('./routes/case--witness--mark-as-appearing-in-court')(router)
require('./routes/case--witness--mark-as-not-appearing-in-court')(router)
require('./routes/case--witness-statement--issue-section9')(router)
require('./routes/case--witness-statement--withdraw-section9')(router)
// require('./routes/case--witness--withdraw-section9')(router)
require('./routes/lawyers')(router)
require('./routes/lawyers--add-specialist-area')(router)

// router.use((err, req, res, next) => {
//   // console.error(err.stack)
//   res
//     .status(500)
//     .render('500', {
//       err
//     })
// })