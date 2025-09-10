const bcrypt = require('bcrypt')
const faker = require('@faker-js/faker').faker
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Example data imports; replace paths with your actual data files
const firstNames = require('../data/first-names')
const lastNames = require('../data/last-names')
const priorities = require('../data/priorities')
const complexities = require('../data/complexities')
const types = require('../data/types')
const specialisms = require('../data/specialisms')

function futureDateAt10am() {
  const d = faker.date.future()
  d.setHours(10, 0, 0, 0)
  return d
}

function generateCaseReference() {
  const twoDigits = faker.number.int({ min: 10, max: 99 })
  const twoLetters = faker.string.alpha({ count: 2, casing: 'upper' })
  const sixDigits = faker.number.int({ min: 100000, max: 999999 })
  const suffix = faker.number.int({ min: 1, max: 9 })
  return `${twoDigits}${twoLetters}${sixDigits}/${suffix}`
}

module.exports = (router) => {
  router.get('/generate-data', async (req, res) => {
    const redirectUrl = req.query.returnUrl || '/'

    try {
      // -------------------- CLEAR TABLES --------------------
      // Delete dependent child tables first
      await prisma.witnessStatement.deleteMany({})
      await prisma.witness.deleteMany({})
      await prisma.task.deleteMany({})
      await prisma.location.deleteMany({})
      await prisma.hearing.deleteMany({})
      await prisma.dGA.deleteMany({})

      // Delete all Case relations individually
      const allCases = await prisma.case.findMany({
        include: { lawyers: true, defendants: true, victims: true }
      })
      for (const c of allCases) {
        await prisma.case.update({
          where: { id: c.id },
          data: {
            lawyers: { set: [] },
            defendants: { set: [] },
            victims: { set: [] }
          }
        })
      }

      // Now safe to delete cases
      await prisma.case.deleteMany({})

      // Delete the rest
      await prisma.defendant.deleteMany({})
      await prisma.victim.deleteMany({})
      await prisma.lawyer.deleteMany({})
      await prisma.user.deleteMany({})
      await prisma.specialism.deleteMany({})
      await prisma.unit.deleteMany({})

      // -------------------- UNITS --------------------
      const unitNames = [
        'Fraud division',
        'Serious crime',
        'Cybercrime',
        'Drugs and organised crime',
        'Terrorism and national security',
        'General prosecutions',
      ]
      const units = []
      for (const name of unitNames) {
        const u = await prisma.unit.create({ data: { name } })
        units.push(u)
      }

      // -------------------- USERS --------------------
      const users = []
      for (const u of [
        { email: 'admin@example.com', password: 'password123', role: 'ADMIN' },
        { email: 'user@example.com', password: 'password123', role: 'USER' },
      ]) {
        const hashed = await bcrypt.hash(u.password, 10)
        const user = await prisma.user.upsert({
          where: { email: u.email },
          update: { password: hashed, role: u.role },
          create: { ...u, password: hashed },
        })
        users.push(user)
      }

      // -------------------- SPECIALISMS --------------------
      for (const name of specialisms) {
        await prisma.specialism.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      }

      // -------------------- LAWYERS --------------------
      const lawyers = []
      const tony = await prisma.lawyer.create({
        data: {
          firstName: 'Tony',
          lastName: 'Stark',
          unitId: faker.helpers.arrayElement(units).id,
        },
      })
      lawyers.push(tony)

      for (let i = 0; i < 150; i++) {
        const specialistAreas = faker.helpers.arrayElements(specialisms, faker.number.int({ min: 0, max: 2 }))
        const remainingForPreferred = specialisms.filter((s) => !specialistAreas.includes(s))
        const preferredAreas = faker.helpers.arrayElements(remainingForPreferred, faker.number.int({ min: 0, max: 2 }))
        const remainingForRestricted = specialisms.filter(
          (s) => !specialistAreas.includes(s) && !preferredAreas.includes(s)
        )
        const restrictedAreas = faker.helpers.arrayElements(remainingForRestricted, faker.number.int({ min: 0, max: 2 }))

        const lawyer = await prisma.lawyer.create({
          data: {
            firstName: faker.helpers.arrayElement(firstNames),
            lastName: faker.helpers.arrayElement(lastNames),
            unitId: faker.helpers.arrayElement(units).id,
            specialistAreas: { connect: specialistAreas.map((name) => ({ name })) },
            preferredAreas: { connect: preferredAreas.map((name) => ({ name })) },
            restrictedAreas: { connect: restrictedAreas.map((name) => ({ name })) },
          },
        })
        lawyers.push(lawyer)
      }

      // -------------------- DEFENDANTS --------------------
      const defendants = []
      for (let i = 0; i < 200; i++) {
        const d = await prisma.defendant.create({
          data: {
            firstName: faker.helpers.arrayElement(firstNames),
            lastName: faker.helpers.arrayElement(lastNames),
          },
        })
        defendants.push(d)
      }

      // -------------------- VICTIMS --------------------
      const victims = []
      for (let i = 0; i < 200; i++) {
        const v = await prisma.victim.create({
          data: {
            firstName: faker.helpers.arrayElement(firstNames),
            lastName: faker.helpers.arrayElement(lastNames),
          },
        })
        victims.push(v)
      }

      // -------------------- CASES + WITNESSES + STATEMENTS --------------------
      for (let i = 0; i < 50; i++) {
        const assignedDefendants = faker.helpers.arrayElements(defendants, faker.number.int({ min: 1, max: 3 }))
        const assignedVictims = faker.helpers.arrayElements(victims, faker.number.int({ min: 1, max: 3 }))
        const assignedLawyers = faker.helpers.arrayElements(lawyers, faker.number.int({ min: 0, max: 3 }))
        const caseUnitId = assignedLawyers.length ? faker.helpers.arrayElement(assignedLawyers).unitId : faker.helpers.arrayElement(units).id
        const caseType = faker.helpers.arrayElement(types)

        const createdCase = await prisma.case.create({
          data: {
            reference: generateCaseReference(),
            type: caseType,
            userId: faker.helpers.arrayElement(users).id,
            priority: faker.helpers.arrayElement(priorities),
            complexity: faker.helpers.arrayElement(complexities),
            unitId: caseUnitId,
            defendants: { connect: assignedDefendants.map((d) => ({ id: d.id })) },
            victims: { connect: assignedVictims.map((v) => ({ id: v.id })) },
            lawyers: { connect: assignedLawyers.map((l) => ({ id: l.id })) },
            hearing: { create: { date: futureDateAt10am() } },
            location: {
              create: {
                name: faker.company.name(),
                line1: faker.location.streetAddress(),
                line2: faker.location.secondaryAddress(),
                town: faker.location.city(),
                postcode: faker.location.zipCode('WD# #SF'),
              },
            },
          },
        })

        const numWitnesses = faker.number.int({ min: 1, max: 7 })
        for (let w = 0; w < numWitnesses; w++) {
          const createdWitness = await prisma.witness.create({
            data: {
              firstName: faker.helpers.arrayElement(firstNames),
              lastName: faker.helpers.arrayElement(lastNames),
              appearingInCourt: faker.helpers.arrayElement([true, false, null]),
              caseId: createdCase.id,
            },
          })

          const numStatements = faker.number.int({ min: 1, max: 2 })
          for (let s = 0; s < numStatements; s++) {
            await prisma.witnessStatement.create({
              data: {
                witnessId: createdWitness.id,
                useInCourt: faker.helpers.arrayElement([true, false, null]),
                serveSection9: caseType === 'magistrates' ? faker.helpers.arrayElement([true, false, null]) : null,
              },
            })
          }
        }
      }

      res.redirect(redirectUrl)
    } catch (e) {
      console.error('Error seeding DB:', e)
      res.status(500).json({ error: 'Failed to seed database' })
    }
  })
}
