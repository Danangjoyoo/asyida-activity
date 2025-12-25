improve my prompt to feed the AI

```
ROLE: JAPAN EXPERT TRIP PLANNER

CONTEXT
- I live in taito city, tokyo, japan
- I want to buy JR pass 5 days (can check this for info https://www.jreast.co.jp/tickets/info.aspx?txt_keyword=%90%c2%8ft18&mode=keyw&SearchFlag=1&GoodsCd=2983)
- that JR pass ticket can only be used for all lines specified on that website and excluding shinkansen
- I want to trip all around japan within 5 days
- I dont want to book any hotels, so I will depart from apartment in the morning, and will arrive home at the night
- I'm a muslims, but I do jamak prayer (shalat) to combine dzuhr and ashr prayer in a time, so I will only need 10 minutes a place to pray. I can pray either in mosque or in uniqlo changing room.
- I'm okay to go with bus to a place but if possible to not achievable by train only, I prioritize to use my JR pass instead
- I will start my trip on 31 dec 2025, and my last date is 5 january 2026
- My start and end station is Nippori Station
- I only eat halal food strictly:
    - no beef + chicken if not certified
    - no pork
    - no alcohol
    - no non-halal food
- Since I must return to Tokyo daily, 
    - I have travel time 4 hours for going out
    - I have travel time 4 hours for going home
- I would start my day at 6 AM (so I reach my destination at 9-11 AM)
- I would end my day based on this formula:
  - end time = 11 PM - (total travel time) - (1 hour buffer) 
  - e.g. 4 hr travel time === 11 - 4 - 1 === 5 PM
- Ensure the places can be reached within that time

Task
- create an itinerary of 5 days for me based on above context and requirements
- my depart time should be as soon as the first train schedule of the day
- my going home time should be calculated based on
  - total time travel
  - time when I'm on last transit station + remaining travel time == last train schedule
- return in a daily table format, with each day are created its own table and each table has these columns
  - hour
  - activity
  - details
  - cost details for this row(if any)
  - foods (if any)
  - links (provide any links for evidence of your data)
- write in copyable html file, I will render this in my website

GUIDELINES
- FIND THE INFORMATION AS ACCURATE AS YOU CAN, IF YOU NOT SURE DO NOT PUT ANY ASSUMPTIONS JUST SKIP IT
```

===================

ROLE: EXPERT JAPAN TRIP PLANNER
(Specialist in JR Seishun 18 Kippu, JR Local/Rapid Trains Only)

OBJECTIVE
Plan a 5-day “star-shaped” rail itinerary from Tokyo using ONLY JR local and rapid trains,
maximizing distance each day while guaranteeing same-day return before the last train.

====================================
CONTEXT & FIXED CONSTRAINTS
====================================

BASE LOCATION
- Residence: Taito City, Tokyo, Japan
- Start & End Station EVERY DAY: Nippori Station (JR)

PASS DETAILS
- Pass: JR Seishun 18 Kippu (5 days)
- Official reference:
  https://www.jreast.co.jp/tickets/info.aspx?txt_keyword=%90%c2%8ft18&mode=keyw&SearchFlag=1&GoodsCd=2983
- Allowed: JR Local & Rapid trains ONLY
- Strictly forbidden:
  - Shinkansen
  - Limited Express
  - Private railways (unless explicitly stated as extra cost)

TRIP STRUCTURE
- Dates: December 31, 2025 – January 5, 2026 (New Year holiday period)
- No hotels, no overnight stays
- Depart from home every morning
- Must return home the same night

TIME CONSTRAINTS
- Departure time: As early as the FIRST AVAILABLE JR train of the day (~06:00)
- Maximum outbound travel time: 4 hours
- Maximum inbound travel time: 4 hours
- End-of-day rule:
  - Latest acceptable arrival home ≈ 23:00
  - Return departure must satisfy:
    (Return train arrival time at Nippori) ≤ last train schedule
    with a minimum 1-hour safety buffer
- Target return departure from destination: ~16:30–17:30

RELIGIOUS REQUIREMENTS (STRICT)
- Muslim traveler
- Jamak prayer (Dhuhr + Asr combined)
- Requires ONLY:
  - 10–15 minutes
  - Between 11:00–15:00
- Acceptable prayer locations:
  - Mosque
  - Station prayer room
  - Department store / Uniqlo fitting room
- Must be explicitly scheduled

FOOD REQUIREMENTS (STRICT HALAL)
- NO pork
- NO alcohol
- NO non-halal meat
- Beef/chicken ONLY if halal-certified
- Seafood, vegetarian, vegan ALWAYS OK
- If halal-certified restaurant is unavailable:
  - Recommend seafood or vegetarian meals ONLY
  - Clearly state food type

TRANSPORT PRIORITY
1. JR trains (covered by pass)
2. Bus ONLY if destination is unreachable by JR
   - Bus usage must be justified and explicitly costed

====================================
TASK
====================================

Create a 5-day itinerary that:
- Maximizes distance from Tokyo each day
- Is physically achievable using ONLY JR local/rapid trains
- Accounts for New Year holiday schedules and congestion
- Guarantees safe same-day return to Nippori Station

====================================
OUTPUT REQUIREMENTS
====================================

FORMAT
- Output MUST be a single copyable HTML file
- Each day MUST have its own table

TABLE COLUMNS (REQUIRED)
- Hour (exact times: departure / arrival)
- Activity (Transit / Sightseeing / Prayer / Meal)
- Details
  - JR line names
  - Train type (Local / Rapid)
  - Transfer stations
  - Destination names
- Cost
  - “Pass” for JR-covered segments
  - Explicit yen amounts for buses or entrance fees
- Food
  - Restaurant name OR
  - “Seafood / Vegetarian (Halal-safe)”
- Location Links
  - Google Maps of current place checkpoint, so I could click to check the checkpoint (mandatory)
- Evidence Links
  - Official JR / attraction website
  - Evidence for train routing or location
  - multiple links are highly recommended to make our trip easier

====================================
CRITICAL GUIDELINES (NON-NEGOTIABLE)
====================================

1. DO NOT assume train availability if unsure — skip instead
2. DO NOT include Shinkansen or Limited Express under any condition
3. DO NOT invent halal restaurants
4. DO NOT violate last-train feasibility
5. Prefer accuracy over creativity
6. If a destination is NOT realistically reachable and returnable, choose the NEXT furthest valid city

====================================
EXPECTED RESULT
====================================

A realistic, legally valid, New-Year-safe JR Seishun 18 Kippu itinerary
that a real traveler can execute without missing the last train.
