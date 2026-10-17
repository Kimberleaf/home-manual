// Maturity Marks: the expectations from "Family & Home Needs: Restoring
// Balance and Shared Responsibility", one card per heading. `people` are the
// household members a card is for (user ids); each sees only their own cards,
// and admins can pick anyone. An item with `kind: 'need'` is the core need
// behind the card. `chores` lists catalog chores that carry part of the card
// out, shown at its foot while they are kept.
window.HOUSE_MANUAL_MATURITY = {
  "title": "Family & Home Needs: Restoring Balance and Shared Responsibility",
  "sections": [
    {
      "title": "Household Expectations & Teenage Independence",
      "cards": [
        {
          "id": "brighton-dog-care",
          "title": "Full Ownership of Dog Care & Ending the Mental Burden",
          "people": ["Brighton"],
          "items": [
            { "label": "Proactive Daily Routine", "text": "Take full, unprompted ownership of her daily essentials—walking her at least once every day and making sure she is fed every evening. If he cannot do it himself, it is his responsibility to reach out and arrange backup coverage beforehand, rather than letting it default to Mom." },
            { "label": "Medical Follow-Through", "text": "Take initiative to call, schedule, and follow through on her spay appointment." },
            { "label": "Hygiene & Mess Accountability", "text": "Actively handle the cleanup when she makes a mess on the couch or bleeds during heat cycles, rather than walking past it and leaving the physical labor to Mom." }
          ]
        },
        {
          "id": "nighttime-routine",
          "title": "Independent Nighttime Routine & Honoring Bedtime Boundaries",
          "people": ["Oliver", "Ephraim"],
          "items": [
            { "label": "Self-Initiated Timeline", "text": "Initiate and complete all evening responsibilities and bedtime prep well before the 12:30am internet cut-off, without Mom having to nag or track them down. Should be in rooms with all things done by 1:30am." },
            { "label": "Hygiene Consistency", "text": "Make nightly tooth brushing a non-negotiable personal habit rather than an overlooked step that Mom has to verify or repeat herself about." },
            { "label": "Ending Post-Cut-Off Lingering", "text": "Cut out the pattern of scrounging for food, congregating on the couch, watching TV, and chatting after 12:30am before all evening chores done. Late snacks and winding down need to happen within a reasonable evening window so they head to bed on a predictable schedule." },
            { "label": "The Emotional Boundary / Core Need", "kind": "need", "text": "Relief from feeling like a broken record every single night. Establishing structure and maturity so their late-night habits stop disrupting the peace of the home and draining parental energy while also not being respectful of their sleep and clear-headedness." }
          ]
        },
        {
          "id": "ephraim-prisma",
          "title": "Proactive Ownership of Prisma-school & Communication",
          "people": ["Ephraim"],
          "items": [
            { "label": "Daily Communication Checks", "text": "Log in and actively check emails and messages without waiting for Mom to give reminders or monitor the screen." },
            { "label": "Clear Accountability Before Outings", "text": "Stay fully caught up on schoolwork before leaving for recreational activities like rock climbing. If something is falling behind, take the initiative to communicate the exact situation proactively—stating what is unfinished and committing to a clear completion timeline beforehand." },
            { "label": "The Emotional Boundary / Core Need", "kind": "need", "text": "Moving away from hand-holding and oversight. Fostering personal integrity and transparency so you aren't put in the exhausting role of academic enforcer right before he walks out the door to have fun." }
          ],
          "chores": ["task-298"]
        },
        {
          "id": "outings-and-food",
          "title": "Clear Permission for Outings & Honoring Food Boundaries",
          "people": ["Ephraim", "Brighton"],
          "items": [
            { "label": "Direct Parental Permission for Plans", "text": "Check directly with parents before confirming outings or leaving to go climbing with Brighton, rather than treating Brighton’s invitation as automatic permission." },
            { "label": "Brighton’s Role & Buy-In", "text": "Ensure Brighton understands that an invitation or a ride from him does not bypass Mom and Dad; Brighton must reinforce that Ephraim gets direct parental clearance first." },
            { "label": "Treats & Junk Food Integrity", "text": "Obtain direct permission for treats outside the usual family diet, or strictly honor an agreed-upon weekly allotment without sneaking, cheating, or negotiating extra." }
          ]
        },
        {
          "id": "bedroom-standards",
          "title": "Personal Bedroom Standards: Daily Maintenance & Weekly Resets",
          "people": ["Oliver", "Ephraim"],
          "items": [
            { "label": "Daily Non-Negotiable Upkeep", "text": "Keep personal spaces baseline functional every single day without being prompted. Never leave damp or wet laundry sitting on the floor—it goes directly into the laundry basket. Bring all used dishes, glasses, and mugs downstairs daily. Empty bedroom trash cans whenever they are full." },
            { "label": "Weekly Deep Clean", "text": "Complete a thorough weekly reset of the bedroom, going beyond surface clutter to dust surfaces, wipe down needed areas, and vacuum floors." }
          ],
          "chores": ["task-300"]
        },
        {
          "id": "household-contribution",
          "title": "Household Contribution: Proactive Daily Support & Picking Up the Slack",
          "people": ["Brighton", "Oliver", "Ephraim"],
          "items": [
            { "label": "Daily Action on Extra & Paid Chores", "text": "Step forward voluntarily every day to complete a share of the extra general chores and available paid tasks, taking full responsibility to execute them thoroughly." },
            { "label": "Responsiveness to Parental Requests", "text": "While direct requests from Mom or Dad will happen and require immediate follow-through without pushback, the default expectation is unprompted, proactive ownership rather than waiting to be asked." }
          ]
        },
        {
          "id": "hygiene-self-care",
          "title": "Personal Hygiene & Self-Care Standards: Baseline Ownership",
          "people": ["Brighton", "Oliver", "Ephraim"],
          "items": [
            { "label": "Activity & Sweat Accountability", "text": "Ephraim must shower immediately upon returning home from the climbing gym. For everyone, anytime heavy activity or sweating occurs, it triggers an immediate requirement to either shower or, at the absolute minimum, strip down and change into completely clean clothes, including fresh underwear." },
            { "label": "Daily Clothing Resets & Underwear Standards", "text": "Even on non-shower days, wearing yesterday’s clothes is unacceptable. Clean clothes must be put on daily, with changing underwear being non-negotiable." },
            { "label": "Daily Odor Control", "text": "Acknowledge when smelly, and use deodorant." }
          ],
          "chores": ["task-299"]
        }
      ]
    },
    {
      "title": "Husband Action & Accountability: Home Winterization & Fatherhood Leadership",
      "cards": [
        {
          "id": "fatherhood-leadership",
          "title": "Fatherhood Leadership: Guiding Ephraim's Character & Correcting Toxic Dynamics",
          "people": ["Michael"],
          "items": [
            { "label": "Proactive Mentorship & Education", "text": "Take Ephraim's current attitudes, views, and behaviors seriously enough to do intentional reading/research before addressing him, rather than brushing it off as \"just a phase\" or waiting for a blowup." },
            { "label": "Direct Father-to-Son Alignment", "text": "Sit down with Ephraim for a serious, grounded conversation about character and maturity. Clearly frame the standard: his current path and mindset are not shaping him into an honorable, mature man, and both parents are concerned about the trajectory he is choosing." },
            {
              "label": "Non-Negotiable Boundaries on Respect",
              "text": "",
              "subitems": [
                { "label": "Putting an Immediate Stop to Teasing Oliver", "text": "Address and strictly forbid using clinical labels as weapons—specifically weaponizing \"autistic\" against Oliver." },
                { "label": "Defending Mom's Honor", "text": "Shut down the constant undermining, disrespect, and habit of making fun of Mom. Set a firm example that speaking down to or mocking his mother is completely unacceptable in this house." }
              ]
            }
          ]
        }
      ]
    }
  ]
};
