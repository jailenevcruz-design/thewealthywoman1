export const money = (n, dp = 0) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })

export const MN = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const MS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const monthLabel = m => { const [y, mm] = m.split('-'); return `${MN[+mm - 1]} ${y}` }
export const curMonth = () => new Date().toISOString().slice(0, 7)
export const todayISO = () => new Date().toISOString().slice(0, 10)

export const QUOTES = [
  { t: 'A woman with money is a woman with options.', by: '' },
  { t: "I've never been poor, only broke. Poor is a state of mind.", by: 'Della Reese' },
  { t: 'A budget is telling your money where to go instead of wondering where it went.', by: '' },
  { t: 'Money, like emotions, is something you must control to keep your life on track.', by: 'Natasha Munson' },
  { t: 'I want to be able to take care of myself, even if I never have to.', by: 'Katharine Hepburn' },
  { t: "Don't tell me what you value. Show me your budget.", by: '' },
  { t: "The question isn't who's going to let me; it's who's going to stop me.", by: 'Ayn Rand' },
  { t: "Budgeting isn't restriction — it's self-respect.", by: '' },
  { t: "The goal isn't more money. The goal is living life on your terms.", by: '' },
  { t: 'Do not save what is left after spending, but spend what is left after saving.', by: 'Warren Buffett' },
  { t: "Your emergency fund starts at $0. So did everyone else's.", by: '' },
  { t: "The Wealthy Woman isn't a destination. She's showing up every time you open this app.", by: '' },
  { t: "You track it. You face it. Most people look away. That's already different.", by: '' },
  { t: "She's not perfect with money. She's just more intentional than yesterday.", by: '' },
  { t: "The Wealthy Woman budgets not because she has to — because she knows where she's going.", by: '' },
  { t: 'She decided her finances were worth her full attention. That was the turning point.', by: '' },
  { t: 'Quiet wealth is built in the in-between moments — the logged receipt, the skipped impulse.', by: '' },
  { t: "She's not where she wants to be. But she knows exactly where she is. That's power.", by: '' },
  { t: "Every bill she faces, every debt she logs, every dollar she tracks — that's her building her empire.", by: '' },
  { t: "An emergency fund isn't savings. It's insurance against going further into debt.", by: '' },
  { t: "Your credit score goes up when you pay on time and bring your balances down. That's it.", by: '' },
  { t: 'Interest is the cost of debt. The faster you pay, the less it costs.', by: '' },
  { t: 'Savings accounts earn. Debt costs. The goal is to flip which one is bigger.', by: '' },
  { t: 'Late payments stay on your credit report for 7 years. On-time ones build forever.', by: '' },
]

const IMAGES = Array.from({ length: 12 }, (_, i) => `/hero${i + 1}.jpg`)

function dailyShuffle(arr, count, salt = 0) {
  const d = new Date()
  let s = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + salt
  const copy = [...arr]
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]] }
  return copy.slice(0, count)
}

export function getDailySlots() {
  const quotes = dailyShuffle(QUOTES, 3, 0)
  const images = dailyShuffle(IMAGES, 3, 99)
  return quotes.map((q, i) => ({ quote: q, image: images[i] }))
}

export const TEACHINGS = [
  // DEBT
  { id:'snowball', topic:'Debt', source:'Dave Ramsey', label:'Debt Snowball',
    principle:'Pay off the smallest debt first — the quick win builds momentum that keeps you going.',
    apply: c => `Your smallest is ${c.smallestDebtName} at ${money(c.smallestDebt)}. Knock it out and only ${c.debtCount-1} debts remain.` },
  { id:'avalanche', topic:'Debt', source:'Personal finance math', label:'Debt Avalanche',
    principle:'Attack the highest-interest debt first to pay the least interest over time.',
    apply: c => `Your highest APR is ${c.highAprName} at ${c.highApr}%. Every extra dollar here saves the most.` },
  { id:'minonly', topic:'Debt', source:'Consumer finance research', label:'Minimums are a trap',
    principle:'Paying only the minimum on high-APR cards means years of payments and massive interest.',
    apply: c => `${c.highAprName} at ${c.highApr}% grows fast on minimums — even $20 extra changes the payoff date.` },
  { id:'creditutil', topic:'Debt', source:'Credit score research', label:'Utilization under 30%',
    principle:'Your balance divided by your credit limit should stay under 30% to protect your score.',
    apply: c => `Paying down ${c.highAprName} also lowers your utilization and directly boosts your score.` },
  { id:'debtfree', topic:'Debt', source:'Dave Ramsey', label:'Debt-free is a feeling',
    principle:"Paying off debt isn't just financial — it removes weight you didn't know you were carrying.",
    apply: c => `${c.debtCount} debts left. Each one cleared is a door you unlock permanently.` },
  { id:'rollover', topic:'Debt', source:'Snowball method', label:'The rollover effect',
    principle:"When you pay off one debt, roll that payment into the next. The momentum compounds.",
    apply: c => `When ${c.smallestDebtName} is gone, roll that ${money(c.smallestDebt > 0 ? 25 : 0)}/mo payment straight into the next debt.` },

  // SAVING
  { id:'payyourself', topic:'Saving', source:'Bach, Sethi & Ramsey', label:'Pay yourself first',
    principle:"Treat savings like a bill — take it off the top the day you get paid, not from what's left.",
    apply: c => `Move ${money(c.payTarget)}/check the day it lands and you'd reach your ${c.topGoalName} noticeably sooner.` },
  { id:'emergency', topic:'Saving', source:'Dave Ramsey · Baby Step 3', label:'The 3–6 month rule',
    principle:"Build 3–6 months of expenses before investing aggressively — it's your peace-of-mind fund.",
    apply: c => `Your bills run ~${money(c.monthlyBills)}/mo. A 3-month cushion is ~${money(c.monthlyBills*3)}. You're building toward it.` },
  { id:'latte', topic:'Saving', source:'David Bach', label:'The latte factor',
    principle:'Small recurring expenses redirect toward a goal add up to something real over time.',
    apply: c => `One subscription redirected monthly gets you to ${c.topGoalName} faster than you think.` },
  { id:'sinking', topic:'Saving', source:'Budgeting classic', label:'Sinking funds',
    principle:"Save a little each month for known future costs so they never become emergencies.",
    apply: () => `Car insurance and annual bills hit hard. Setting aside a little monthly softens the blow.` },
  { id:'starter1k', topic:'Saving', source:'Dave Ramsey · Baby Step 1', label:'The $1,000 starter',
    principle:"Before anything else, get $1,000 in savings. Not to invest. Not to pay debt. Just to have it.",
    apply: c => `That $1,000 is the difference between a bad week and a spiral. It's your first real goal.` },
  { id:'automate', topic:'Saving', source:'Ramit Sethi', label:'Automate your savings',
    principle:"Set a recurring transfer the day after payday. What you never see you never spend.",
    apply: c => `Even ${money(c.payTarget)} auto-transferred on payday means savings happen whether you think about it or not.` },

  // MINDSET
  { id:'wealthunseen', topic:'Mindset', source:'Morgan Housel', label:"Wealth is what you don't see",
    principle:"Real wealth is the money you don't spend — the restraint nobody notices is the whole point.",
    apply: c => `You logged ${money(c.spendThisMonth)} in spending this month. Every skipped purchase is invisible wealth building.` },
  { id:'503020', topic:'Mindset', source:'Elizabeth Warren', label:'The 50/30/20 guideline',
    principle:'Aim roughly 50% needs, 30% wants, 20% savings/debt — a simple sanity check, not a strict rule.',
    apply: c => `On ${money(c.avgNet)}/mo take-home, 20% is ~${money(c.avgNet*0.2)} toward savings & debt.` },
  { id:'firstgoal', topic:'Mindset', source:'Behavioral finance', label:'One goal at a time',
    principle:'Focus beats spreading thin — one primary goal gets done faster and feels better.',
    apply: c => `Pick ${c.topGoalName} as your focus this season. The others can wait their turn.` },
  { id:'comparison', topic:'Mindset', source:'Personal finance', label:'Comparison is a budget killer',
    principle:"Someone else's lifestyle is built on income, debt, or family money you can't see. Your budget only has to work for your life.",
    apply: () => `The Wealthy Woman isn't competing. She's building at her own pace, on her own terms.` },
  { id:'networth', topic:'Mindset', source:'Personal finance fundamentals', label:'Know your net worth',
    principle:'Net worth = what you own minus what you owe. Track it monthly — it tells the real story.',
    apply: c => `Right now your debt is ${money(c.totalDebt)}. Every dollar paid is a direct net worth gain.` },
  { id:'identity', topic:'Mindset', source:'James Clear', label:'Become the person who saves',
    principle:"Every time you save instead of spend, you cast a vote for the identity of someone who has it together financially.",
    apply: () => `Opening this app and logging your spending is a vote. Small votes add up to a new identity.` },

  // INVESTING
  { id:'assets', topic:'Investing', source:'Robert Kiyosaki', label:'Assets vs liabilities',
    principle:'Assets put money in your pocket. Liabilities take it out. The goal is more of the first.',
    apply: c => `Right now ${money(c.totalDebt)} in debt is a liability pulling money out monthly. Clearing it frees cash to buy assets.` },
  { id:'compound', topic:'Investing', source:'Finance fundamentals', label:'Compound interest works both ways',
    principle:'Compound interest builds wealth when you save — and drains it when you carry debt.',
    apply: c => `At ${c.highApr}% APR, ${c.highAprName} is compounding against you daily. Clearing it IS the investment.` },
  { id:'time', topic:'Investing', source:'Warren Buffett', label:'Time beats timing',
    principle:"You don't need to invest at the perfect moment. You need to invest consistently and early.",
    apply: () => `$25/mo started today beats $200/mo started in 5 years. The best time is now.` },
  { id:'match', topic:'Investing', source:'Personal finance', label:'The 401k match is free money',
    principle:"If your employer matches contributions and you're not taking it, you're leaving part of your paycheck behind.",
    apply: () => `Check if your job offers a match. Even 1% matched is a 100% return on that dollar.` },

  // CREDIT
  { id:'creditscore', topic:'Credit', source:'Credit score research', label:'What actually moves your score',
    principle:'35% payment history. 30% utilization. Those two things are 65% of your score. Focus there first.',
    apply: c => `Pay ${c.highAprName} on time every month and bring the balance down. That alone moves your score.` },
  { id:'utilreset', topic:'Credit', source:'Credit bureaus', label:'Utilization resets monthly',
    principle:"Your reported balance is usually your statement balance. Paying down before the statement closes can boost your score fast.",
    apply: () => `Pay your card balance before the statement date, not just the due date. Timing matters.` },
  { id:'dontclose', topic:'Credit', source:'Credit score research', label:"Don't close old cards",
    principle:"Closing a card reduces your available credit and can spike your utilization. Keep it open even unused.",
    apply: () => `That old card you never use? Keep it open. It's helping your score by existing.` },
  { id:'autopaymin', topic:'Credit', source:'Personal finance', label:'Autopay the minimum at minimum',
    principle:"One late payment can drop your score 100 points and takes months to recover. Autopay the minimum so it never happens.",
    apply: () => `Set every card to autopay the minimum. Then manually pay more when you can. Never miss a due date.` },
  { id:'collections', topic:'Credit', source:'Credit bureaus', label:'Collections hurt but fade',
    principle:"A collection account falls off your report after 7 years. Paying it stops the calls and may help your score.",
    apply: c => `Your ${money(463)} in collections is the smallest debt you have. Clearing it is a quick win for your score and your peace.` },

  // BUDGETING
  { id:'zerobased', topic:'Budgeting', source:'Dave Ramsey', label:'Zero-based budgeting',
    principle:"Give every dollar a job. Income minus expenses equals zero — not because you spent it all, but because every dollar has a plan.",
    apply: c => `You bring home ~${money(c.avgNet)}/mo. Every dollar of that should have a name before the month starts.` },
  { id:'envelope', topic:'Budgeting', source:'Dave Ramsey', label:'The envelope method',
    principle:"Allocate cash to categories in envelopes. When the envelope is empty, spending stops. No willpower needed.",
    apply: () => `Your Spend categories in this app are digital envelopes. Log everything and watch where the money actually goes.` },
  { id:'variablebills', topic:'Budgeting', source:'Personal finance', label:'Budget for variable bills',
    principle:"Groceries, gas, and utilities vary month to month. Budget the average, not the minimum.",
    apply: () => `Groceries at $180/mo is your estimate. Some months are $140, some $220. Budget $200 to be safe.` },
  { id:'irregular', topic:'Budgeting', source:'Personal finance', label:'Plan for irregular expenses',
    principle:"Birthdays, car repairs, medical bills — they feel like surprises but they happen every year. Budget for them.",
    apply: () => `Set aside $20-30/mo into a misc category. When something unexpected hits, you're already covered.` },
  { id:'review', topic:'Budgeting', source:'Personal finance', label:'Review weekly not monthly',
    principle:"Monthly reviews catch problems too late. A weekly 5-minute check keeps you on track before overspending happens.",
    apply: () => `Every Friday, open this app and check your spend log. Five minutes now saves the panic at month end.` },

  // INCOME
  { id:'keeprate', topic:'Income', source:'Personal finance', label:'Know your keep rate',
    principle:"Your keep rate is how much of your gross you actually take home. Knowing it helps you plan realistically.",
    apply: c => `You keep about 76% of what you earn. That means every $1,000 gross = ~$760 to work with.` },
  { id:'raisenegotiate', topic:'Income', source:'Ramit Sethi', label:'Negotiate everything',
    principle:"Your salary is negotiable. Most people never ask. The ones who do earn significantly more over their careers.",
    apply: () => `One salary negotiation can add thousands per year. Research your market rate and ask.` },
  { id:'sideincome', topic:'Income', source:'Personal finance', label:'A second income changes the math',
    principle:"Even $200-300/mo from a side income directed entirely at debt can cut years off your payoff timeline.",
    apply: c => `$300/mo extra applied to ${c.highAprName} at ${c.highApr}% would save you hundreds in interest.` },
  { id:'taxwithholding', topic:'Income', source:'IRS / tax planning', label:'Check your withholding',
    principle:"A big tax refund means you overpaid all year. Adjusting your W-4 puts that money in your paycheck now instead.",
    apply: () => `If you got a big refund this year, consider adjusting your W-4. That money works better in your hands monthly.` },
  { id:'trackincome', topic:'Income', source:'Personal finance', label:'Track every paycheck',
    principle:"Knowing your average take-home lets you budget confidently instead of guessing.",
    apply: c => `You've logged ${c.totalChecks || 'several'} paychecks. Your average take-home is ${money(c.avgNet)}/mo. That's your real number.` },

  // REAL ESTATE
  { id:'rentvsbuy', topic:'Real Estate', source:'Personal finance', label:'Renting is not wasting money',
    principle:"Rent buys you flexibility, no maintenance costs, and no debt. It's not throwing money away — it's paying for where you live.",
    apply: () => `Right now renting makes sense. Focus on clearing debt and building savings before adding a mortgage.` },
  { id:'housefund', topic:'Real Estate', source:'Personal finance', label:'Start a house fund now',
    principle:"A down payment takes years to save. Starting a dedicated house fund early — even small — gets you there.",
    apply: () => `Once your emergency fund is solid, a house fund is a natural next savings goal. Even $50/mo adds up.` },
  { id:'creditforhome', topic:'Real Estate', source:'Mortgage lending', label:'Your credit score is your mortgage rate',
    principle:"A 680 vs 740 credit score can mean thousands more in interest over a 30-year mortgage.",
    apply: c => `Getting your score from ${c.creditScore || 565} to 700+ before buying a home saves real money on your rate.` },
  { id:'dti', topic:'Real Estate', source:'Mortgage lending', label:'Debt-to-income ratio matters',
    principle:"Lenders want your monthly debt payments to be under 43% of your gross income. Less debt = more buying power.",
    apply: c => `Clearing ${c.smallestDebtName} and other debts directly improves your debt-to-income ratio for future lending.` },
  { id:'appreciation', topic:'Real Estate', source:'Robert Kiyosaki', label:'A home is not always an asset',
    principle:"A home you live in costs money every month. It only becomes an asset when it generates income or you sell it for a profit.",
    apply: () => `Understanding this helps you buy at the right time for the right reasons — not just because it feels like the next step.` },
]

export function teachCtx(db) {
  const debts = [...db.debts].filter(d => d.balance > 0)
  const bySmall = [...debts].sort((a,b)=>a.balance-b.balance)
  const byApr = [...debts].sort((a,b)=>(b.apr||0)-(a.apr||0))
  const totalDebt = debts.reduce((s,d)=>s+d.balance,0)
  const monthlyBills = db.bills.filter(b=>!b.archived).reduce((s,b)=>s+b.amount,0)
  const goals = db.goals || []
  const topGoal = goals[0] || { name:'your goal' }
  const nets = db.checks.map(c=>c.net)
  const avgNet = nets.length ? nets.reduce((a,b)=>a+b,0)/(new Set(db.checks.map(c=>c.date.slice(0,7))).size||1) : 0
  const m = curMonth()
  const spendThisMonth = db.spend.filter(s=>s.date.slice(0,7)===m).reduce((s,x)=>s+x.amount,0)
  const creditScore = db.credit_scores?.[0]?.score || 565
  return {
    smallestDebtName: bySmall[0]?.name||'—', smallestDebt: bySmall[0]?.balance||0,
    highAprName: byApr[0]?.name||'—', highApr: byApr[0]?.apr||0,
    debtCount: debts.length, totalDebt, monthlyBills,
    topGoalName: topGoal.name, payTarget: db.profile?.pay_yourself_target||125,
    autopayCount: db.bills.filter(b=>b.autopay).length, spendThisMonth, avgNet: avgNet||0,
    totalChecks: db.checks.length, creditScore,
  }
}

export function pickNudge(db) {
  const ctx = teachCtx(db)
  const day = new Date().getDate()
  let pool = TEACHINGS
  if (ctx.highApr >= 25) pool = TEACHINGS.filter(t => ['avalanche','minonly','snowball','payyourself','wealthunseen','creditutil','autopaymin'].includes(t.id))
  const t = pool[day % pool.length]
  return { t, text: t.apply(ctx) }
}

export const CATS = [
  ['Groceries','🛒','#4CAF50','c-groc'],
  ['Dining','🍽️','#FF7043','c-dine'],
  ['Gas','⛽','#FFA726','c-gas'],
  ['Shopping','🛍️','#42A5F5','c-shop'],
  ['Auto','🚗','#26A69A','c-auto'],
  ['Housing','🏠','#7E57C2','c-house'],
  ['Pet','🐾','#A1887F','c-pet'],
  ['Subscriptions','📺','#EC407A','c-sub'],
  ['Pay in 4','💳','#EF5350','c-p4'],
  ['Personal','💅','#AB47BC','c-pers'],
  ['Gifts','🎁','#FF8A65','c-gift'],
  ['Health','🏥','#29B6F6','c-health'],
  ['Utilities','⚡','#5C6BC0','c-util'],
  ['Cards','💳','#E53935','c-cards'],
]

// Merchant name → category auto-matcher for CSV import
export function guessCategory(merchant) {
  const m = merchant.toUpperCase()
  if (/WHOLEFDS|WHOLE FOODS|TRADER JOE|KROGER|SAFEWAY|ALDI|PUBLIX|FOOD|GROCERY|MARKET|COSTCO|WALMART|TARGET/.test(m)) return 'Groceries'
  if (/SHELL|BP|EXXON|CHEVRON|MOBIL|SUNOCO|GAS|FUEL/.test(m)) return 'Gas'
  if (/NETFLIX|HULU|SPOTIFY|APPLE\.COM|GOOGLE|AMAZON PRIME|DISNEY|TIDAL|PATREON|VPN|ICLOUD|TIDAL|WOW/.test(m)) return 'Subscriptions'
  if (/CHIPOTLE|MCDONALD|STARBUCKS|DUNKIN|PIZZA|TACO|BURGER|WENDY|DOORDASH|UBER EATS|GRUBHUB|RESTAURANT|CAFE|DINER/.test(m)) return 'Dining'
  if (/UBER|LYFT|MTA|METRO|TRANSIT|PARKING|TOLL|EZPASS/.test(m)) return 'Transport'
  if (/CVS|WALGREEN|PHARMACY|MEDICAL|DOCTOR|DENTAL|HEALTH|URGENT/.test(m)) return 'Health'
  if (/AMAZON|EBAY|ETSY|SHEIN|ZARA|NIKE|MACY|NORDSTROM|SEPHORA|ULTA/.test(m)) return 'Shopping'
  if (/PET|PETCO|PETSMART|CHEWY|VET|ANIMAL/.test(m)) return 'Pet'
  if (/RENT|LEASE|ELECTRIC|WATER|INTERNET|VERIZON|T-MOBILE|ATT|COMCAST/.test(m)) return 'Housing'
  return null // unrecognized
}
