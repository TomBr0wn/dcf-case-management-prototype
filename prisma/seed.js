const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { faker } = require("@faker-js/faker");
const complexities = require("../app/data/complexities.js");
const firstNames = require("../app/data/first-names.js");
const lastNames = require("../app/data/last-names.js");
const types = require("../app/data/types.js");
const taskTypes = require("../app/data/task-types.js");
const documentTypes = require("../app/data/document-types.js");
const specialisms = require("../app/data/specialisms.js");

const prisma = new PrismaClient();

function futureDateAt10am() {
  const d = faker.date.future();
  d.setHours(10, 0, 0, 0);
  return d;
}

function generateCaseReference() {
  const twoDigits = faker.number.int({ min: 10, max: 99 });
  const twoLetters = faker.string.alpha({ count: 2, casing: "upper" });
  const sixDigits = faker.number.int({ min: 100000, max: 999999 });
  const suffix = faker.number.int({ min: 1, max: 9 });
  return `${twoDigits}${twoLetters}${sixDigits}/${suffix}`;
}

async function main() {
  console.log("🌱 Starting seed...");

  // -------------------- Units --------------------
  await prisma.unit.createMany({
    data: [
      { name: "Magistrates" },
      { name: "Crown Court" },
      { name: "Rape and serious sexual offences " },
      { name: "Complex casework unit" },
    ],
  });
  console.log("✅ Units seeded");

  // -------------------- Users --------------------
  const users = [];
  const userData = [
    {
      email: "admin@example.com",
      password: "password123",
      role: "ADMIN",
      firstName: "Rachael",
      lastName: "Harvey",
    },
    {
      email: "user@example.com",
      password: "password123",
      role: "USER",
      firstName: "Simon",
      lastName: "Whatley",
    },
  ];

  for (const u of userData) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.create({
      data: {
        ...u,
        password: hashedPassword,
      },
    });
    users.push(user);
  }
  console.log("✅ Users seeded");

  // -------------------- Specialisms --------------------
  await prisma.specialism.createMany({
    data: specialisms.map((name) => ({ name })),
  });
  console.log("✅ Specialisms seeded");

  // -------------------- Lawyers --------------------
  const lawyers = [];
  const tony = await prisma.lawyer.create({
    data: {
      firstName: "Tony",
      lastName: "Stark",
      unit: { connect: { id: faker.number.int({ min: 1, max: 4 }) } },
    },
  });
  lawyers.push(tony);

  for (let i = 0; i < 150; i++) {
    const specialistAreas = faker.helpers.arrayElements(
      specialisms,
      faker.number.int({ min: 0, max: 2 })
    );
    const remainingForPreferred = specialisms.filter(
      (s) => !specialistAreas.includes(s)
    );
    const preferredAreas = faker.helpers.arrayElements(
      remainingForPreferred,
      faker.number.int({ min: 0, max: 2 })
    );
    const remainingForRestricted = specialisms.filter(
      (s) => !specialistAreas.includes(s) && !preferredAreas.includes(s)
    );
    const restrictedAreas = faker.helpers.arrayElements(
      remainingForRestricted,
      faker.number.int({ min: 0, max: 2 })
    );

    const lawyer = await prisma.lawyer.create({
      data: {
        firstName: faker.helpers.arrayElement(firstNames),
        lastName: faker.helpers.arrayElement(lastNames),
        unit: { connect: { id: faker.number.int({ min: 1, max: 4 }) } },
        specialistAreas: { connect: specialistAreas.map((name) => ({ name })) },
        preferredAreas: { connect: preferredAreas.map((name) => ({ name })) },
        restrictedAreas: { connect: restrictedAreas.map((name) => ({ name })) },
      },
    });
    lawyers.push(lawyer);
  }
  console.log("✅ Lawyers seeded");

  // -------------------- Defendants --------------------
  const defendants = [];
  for (let i = 0; i < 200; i++) {
    const d = await prisma.defendant.create({
      data: {
        firstName: faker.helpers.arrayElement(firstNames),
        lastName: faker.helpers.arrayElement(lastNames),
      },
    });
    defendants.push(d);
  }
  console.log("✅ Defendants seeded");

  // -------------------- Victims --------------------
  const victims = [];
  for (let i = 0; i < 200; i++) {
    const v = await prisma.victim.create({
      data: {
        firstName: faker.helpers.arrayElement(firstNames),
        lastName: faker.helpers.arrayElement(lastNames),
      },
    });
    victims.push(v);
  }
  console.log("✅ Victims seeded");

  // -------------------- Cases --------------------
  const TOTAL_CASES = 3465;
  const UNASSIGNED_TARGET = 39;
  const DGA_TARGET = 50; // set desired number of DGAs

  const createdCases = [];

  // Define a pool of possible task names
  const taskNames = [
    "Retrieve core details",
    "Check communications",
    "Review disclosure",
    "Prepare witness briefing",
    "Schedule pre-trial meeting",
    "Draft opening statement",
    "Submit evidence bundle",
    "Confirm hearing date",
  ];

  // Define a pool of possible document names
  const documentNames = [
    "Police report",
    "Witness statement",
    "Evidence photo",
    "Forensic analysis",
    "Medical records",
    "Phone records",
    "Bank statements",
    "CCTV footage",
    "Interview transcript",
    "Expert report",
    "Scene photographs",
    "Custody record",
    "Chain of custody",
    "Lab results",
    "Search warrant",
  ];

  for (let i = 0; i < TOTAL_CASES; i++) {
    const assignedDefendants = faker.helpers.arrayElements(
      defendants,
      faker.number.int({ min: 1, max: 3 })
    );
    const assignedVictims = faker.helpers.arrayElements(
      victims,
      faker.number.int({ min: 1, max: 3 })
    );

    const caseUnitId = faker.number.int({ min: 1, max: 4 });

    // Pick between 0 and 5 unique task names
    const numTasks = faker.number.int({ min: 0, max: 5 });
    const chosenTaskNames = faker.helpers.arrayElements(taskNames, numTasks);

    const tasksData = chosenTaskNames.map((name) => ({
      name,
      type: faker.helpers.arrayElement(taskTypes),
      dueDate: faker.date.future(),
    }));

    // Pick between 5 and 15 documents
    const numDocuments = faker.number.int({ min: 5, max: 15 });
    const documentsData = [];
    for (let d = 0; d < numDocuments; d++) {
      const baseName = faker.helpers.arrayElement(documentNames);
      const name = `${baseName} ${d + 1}`;
      documentsData.push({
        name,
        description: faker.helpers.arrayElement(['This is a random description', 'This is another random description', faker.lorem.sentence()]),
        type: faker.helpers.arrayElement(documentTypes),
        size: faker.number.int({ min: 50, max: 5000 }),
      });
    }

    const createdCase = await prisma.case.create({
      data: {
        reference: generateCaseReference(),
        type: faker.helpers.arrayElement(types),
        user: {
          connect: {
            id: faker.helpers.arrayElement([users[0].id, users[1].id]),
          },
        },
        isCTL: faker.datatype.boolean(),
        complexity: faker.helpers.arrayElement(complexities),
        unit: { connect: { id: caseUnitId } },
        defendants: { connect: assignedDefendants.map((d) => ({ id: d.id })) },
        victims: { connect: assignedVictims.map((v) => ({ id: v.id })) },
        hearing: { create: { date: futureDateAt10am() } },
        location: {
          create: {
            name: faker.company.name(),
            line1: faker.location.streetAddress(),
            line2: faker.location.secondaryAddress(),
            town: faker.location.city(),
            postcode: faker.location.zipCode("WD# #SF"),
          },
        },
        tasks: {
          createMany: {
            data: tasksData, // now unique per case
          },
        },
        documents: {
          createMany: {
            data: documentsData,
          },
        },
      },
    });

    // -------------------- Witnesses --------------------
    const numWitnesses = faker.number.int({ min: 1, max: 7 });
    for (let w = 0; w < numWitnesses; w++) {
      // Generate witness types with realistic distribution (most have 0-3 types)
      const allTypes = [
        "isVictim",
        "isKeyWitness",
        "isChild",
        "isExpert",
        "isInterpreter",
        "isPolice",
        "isProfessional",
        "isPrisoner",
        "isVulnerable",
        "isIntimidated"
      ];

      // Weighted selection for number of types (most witnesses have 0-3)
      const numTypesWeighted = faker.helpers.weightedArrayElement([
        { weight: 30, value: 0 },
        { weight: 30, value: 1 },
        { weight: 25, value: 2 },
        { weight: 10, value: 3 },
        { weight: 4, value: 4 },
        { weight: 1, value: 5 }
      ]);

      // Select random types
      const selectedTypes = faker.helpers.arrayElements(allTypes, numTypesWeighted);

      // Build witness type object (all false by default, then set selected to true)
      const witnessTypes = {
        isVictim: selectedTypes.includes("isVictim"),
        isKeyWitness: selectedTypes.includes("isKeyWitness"),
        isChild: selectedTypes.includes("isChild"),
        isExpert: selectedTypes.includes("isExpert"),
        isInterpreter: selectedTypes.includes("isInterpreter"),
        isPolice: selectedTypes.includes("isPolice"),
        isProfessional: selectedTypes.includes("isProfessional"),
        isPrisoner: selectedTypes.includes("isPrisoner"),
        isVulnerable: selectedTypes.includes("isVulnerable"),
        isIntimidated: selectedTypes.includes("isIntimidated")
      };

      // Randomly assign dcf (50/50 split between new and old architecture)
      const isDcf = faker.datatype.boolean();

      const createdWitness = await prisma.witness.create({
        data: {
          title: faker.helpers.arrayElement([null, "Mr", "Mrs", "Ms", "Dr", "Prof"]),
          firstName: faker.helpers.arrayElement(firstNames),
          lastName: faker.helpers.arrayElement(lastNames),
          dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: "age" }),
          gender: faker.helpers.arrayElement(["Male", "Female", "Unknown"]),
          ethnicity: faker.helpers.arrayElement([
            null,
            "White",
            "Asian_or_Asian_British",
            "Black_or_Black_British",
            "Mixed",
            "Other",
            "Prefer_not_to_say"
          ]),
          preferredLanguage: faker.helpers.arrayElement(["English", "Welsh"]),
          isCpsContactAllowed: faker.datatype.boolean(),
          addressLine1: faker.helpers.arrayElement([null, faker.location.streetAddress()]),
          addressLine2: faker.helpers.arrayElement([null, faker.location.secondaryAddress()]),
          addressTown: faker.helpers.arrayElement([null, faker.location.city()]),
          addressPostcode: faker.helpers.arrayElement([null, faker.location.zipCode("WD# #SF")]),
          mobileNumber: faker.helpers.arrayElement([null, faker.phone.number()]),
          emailAddress: faker.helpers.arrayElement([null, faker.internet.email()]),
          preferredContactMethod: faker.helpers.arrayElement([null, "Email", "Phone", "Post"]),
          faxNumber: faker.helpers.arrayElement([null, faker.phone.number()]),
          homeNumber: faker.helpers.arrayElement([null, faker.phone.number()]),
          workNumber: faker.helpers.arrayElement([null, faker.phone.number()]),
          otherNumber: faker.helpers.arrayElement([null, faker.phone.number()]),
          ...witnessTypes,
          isAppearingInCourt: faker.helpers.arrayElement([false, null]),
          isRelevant: faker.datatype.boolean(),
          attendanceIssues: faker.helpers.arrayElement([
            null,
            faker.lorem.sentence(),
          ]),
          previousTransgressions: faker.helpers.arrayElement([
            null,
            faker.lorem.sentence(),
          ]),
          wasWarned: faker.datatype.boolean(),
          dcf: isDcf,
          // Only set availability and special measures fields if dcf = true (new architecture)
          courtAvailabilityStartDate: isDcf ? faker.date.future() : null,
          courtAvailabilityEndDate: isDcf ? faker.date.future() : null,
          courtSpecialMeasures: isDcf ? faker.helpers.arrayElement([
            null,
            faker.lorem.sentence(),
          ]) : null,
          courtNeeds: isDcf ? faker.helpers.arrayElement([
            null,
            faker.lorem.sentence(),
          ]) : null,
          requiresMeeting: isDcf ? faker.datatype.boolean() : null,
          caseId: createdCase.id,
        },
      });

      const numStatements = faker.number.int({ min: 1, max: 5 });
      for (let s = 0; s < numStatements; s++) {
        await prisma.witnessStatement.create({
          data: {
            witnessId: createdWitness.id,
            number: s + 1,
            receivedDate: faker.date.past(),
            isUsedAsEvidence: faker.helpers.arrayElement([true, false, null]),
            isMarkedAsSection9: faker.helpers.arrayElement([true, false, null]),
          },
        });
      }
    }

    createdCases.push({ id: createdCase.id });
  }

  console.log(`✅ Created ${createdCases.length} cases`);

  // -------------------- Assign DGAs --------------------
  const dgaIds = new Set(
    faker.helpers.arrayElements(createdCases, DGA_TARGET).map((c) => c.id)
  );

  for (const c of createdCases) {
    if (dgaIds.has(c.id)) {
      await prisma.dGA.create({
        data: {
          caseId: c.id,
          reason: faker.lorem.sentence(),
          // outcome omitted → will be NULL
        },
      });
    }
  }

  console.log(`✅ Assigned ${DGA_TARGET} cases needing DGA review (no outcome set)`);

  // -------------------- Assign cases --------------------
  const unassignedCount = Math.min(UNASSIGNED_TARGET, createdCases.length);
  const unassignedIds = new Set(
    faker.helpers.arrayElements(createdCases, unassignedCount).map((c) => c.id)
  );
  const assignableCases = createdCases.filter(
    (c) => !unassignedIds.has(c.id)
  );

  for (const c of assignableCases) {
    const chosenLawyer = faker.helpers.arrayElement(lawyers);

    await prisma.case.update({
      where: { id: c.id },
      data: {
        unitId: chosenLawyer.unitId,
        lawyers: {
          set: [{ id: chosenLawyer.id }],
        },
      },
    });
  }

  console.log(
    `✅ Assigned ${assignableCases.length} cases to exactly one lawyer, left ${unassignedCount} unassigned`
  );

  // -------------------- Activity Logs --------------------
  const eventTypes = [
    'DGA recorded',
    'Prosecutor assigned',
    'Witness marked as appearing in court',
    'Witness marked as not appearing in court',
    'Witness statement marked as Section 9',
    'Witness statement unmarked as Section 9'
  ];

  const dgaOutcomes = {
    NOT_DISPUTED: "Not disputed",
    DISPUTED_SUCCESSFULLY: "Disputed successfully",
    DISPUTED_UNSUCCESSFULLY: "Disputed unsuccessfully"
  };

  // Select ~50% of cases to have activity logs
  const casesForActivity = faker.helpers.arrayElements(
    createdCases,
    Math.floor(createdCases.length * 0.5)
  );

  let totalActivityLogs = 0;

  for (const caseRef of casesForActivity) {
    // Fetch the full case with relations
    const fullCase = await prisma.case.findUnique({
      where: { id: caseRef.id },
      include: {
        lawyers: true,
        dga: true,
        witnesses: {
          include: {
            statements: true
          }
        }
      }
    });

    // Generate 1-6 events per case
    const numEvents = faker.number.int({ min: 1, max: 6 });
    const eventsToCreate = [];

    // Generate base dates for this case (over the last 6 months)
    const baseDates = [];
    for (let i = 0; i < numEvents; i++) {
      baseDates.push(faker.date.past({ years: 0.5 }));
    }
    // Sort chronologically
    baseDates.sort((a, b) => a - b);

    for (let i = 0; i < numEvents; i++) {
      const randomUser = faker.helpers.arrayElement(users);
      const eventDate = baseDates[i];

      // Decide which event type to create based on what exists
      const possibleEvents = [];

      // Prosecutor assigned - if case has lawyers
      if (fullCase.lawyers && fullCase.lawyers.length > 0) {
        possibleEvents.push('Prosecutor assigned');
      }

      // DGA recorded - if case has a DGA
      if (fullCase.dga) {
        possibleEvents.push('DGA recorded');
      }

      // Witness events - if case has witnesses
      if (fullCase.witnesses && fullCase.witnesses.length > 0) {
        possibleEvents.push('Witness marked as appearing in court');
        possibleEvents.push('Witness marked as not appearing in court');
      }

      // Witness statement events - if case has witness statements
      const witnessesWithStatements = fullCase.witnesses?.filter(w => w.statements.length > 0) || [];
      if (witnessesWithStatements.length > 0) {
        possibleEvents.push('Witness statement marked as Section 9');
        possibleEvents.push('Witness statement unmarked as Section 9');
      }

      // If no possible events, skip
      if (possibleEvents.length === 0) continue;

      const eventType = faker.helpers.arrayElement(possibleEvents);
      let activityData = {
        userId: randomUser.id,
        caseId: fullCase.id,
        action: 'UPDATE',
        title: eventType,
        createdAt: eventDate
      };

      // Add specific metadata based on event type
      switch (eventType) {
        case 'Prosecutor assigned':
          const lawyer = faker.helpers.arrayElement(fullCase.lawyers);
          activityData.model = 'Case';
          activityData.recordId = fullCase.id;
          activityData.meta = {
            lawyer: {
              id: lawyer.id,
              firstName: lawyer.firstName,
              lastName: lawyer.lastName
            }
          };
          break;

        case 'DGA recorded':
          const outcomeKey = faker.helpers.arrayElement(['NOT_DISPUTED', 'DISPUTED_SUCCESSFULLY', 'DISPUTED_UNSUCCESSFULLY']);
          activityData.model = 'Case';
          activityData.recordId = fullCase.id;
          activityData.meta = {
            outcome: dgaOutcomes[outcomeKey]
          };
          break;

        case 'Witness marked as appearing in court':
        case 'Witness marked as not appearing in court':
          const witness = faker.helpers.arrayElement(fullCase.witnesses);
          activityData.model = 'Witness';
          activityData.recordId = witness.id;
          activityData.meta = {
            witness: {
              id: witness.id,
              firstName: witness.firstName,
              lastName: witness.lastName
            }
          };
          break;

        case 'Witness statement marked as Section 9':
        case 'Witness statement unmarked as Section 9':
          const witnessWithStatement = faker.helpers.arrayElement(witnessesWithStatements);
          const statement = faker.helpers.arrayElement(witnessWithStatement.statements);
          activityData.model = 'WitnessStatement';
          activityData.recordId = statement.id;
          activityData.meta = {
            witnessStatement: {
              id: statement.id,
              number: statement.number
            },
            witness: {
              id: witnessWithStatement.id,
              firstName: witnessWithStatement.firstName,
              lastName: witnessWithStatement.lastName
            }
          };
          break;
      }

      eventsToCreate.push(activityData);
    }

    // Create all events for this case
    for (const eventData of eventsToCreate) {
      await prisma.activityLog.create({
        data: eventData
      });
      totalActivityLogs++;
    }
  }

  console.log(`✅ Created ${totalActivityLogs} activity log entries across ${casesForActivity.length} cases`);

  console.log("🌱 Seed finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
