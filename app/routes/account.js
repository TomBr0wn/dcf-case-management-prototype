const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {

  router.get('/account', (req, res) => {
    res.render("account/index", { 
      user: req.session.data.user
    })
  })

  router.post('/account/sign-in', async (req, res) => {
    req.session.data.user = await prisma.user.findFirst()
    res.redirect('/overview')
  })

  router.get('/account/sign-out', (req, res) => {
    req.session.data.user = null
    res.redirect('/account/sign-in')
  })

}