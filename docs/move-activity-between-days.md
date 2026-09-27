# Moving an itinerary activity to another day — backend requirement

**Status:** proposal, awaiting backend
**Author:** frontend
**Checked against:** the running API on 2026-09-28
**Size:** one optional field on one existing DTO

---

## 1. The problem

Activities are entered day by day, and people put them on the wrong day. A real
case from testing: four activities — *Fight with Tiger*, *Clicked Picture at Old
town*, *Visit Temples*, *Visit the beautiful Big Buddha Temple* — were added
under **Day 4** but belonged to **Day 5**.

There is no way to move them. The only recovery is deleting each one and
retyping it on the right day, with its place, kind and both times.

## 2. What the API allows today

Editing an activity in place already works and needs nothing:

```
PATCH /trips/:tripId/itinerary/activities/:activityId
{ "startTime": "11:15", "endTime": "14:30", "title": "…" }   → 200, applied
```

Changing its day does not:

```
PATCH /trips/:tripId/itinerary/activities/:activityId
{ "dayNumber": 5 }                → 400 "Request validation failed"

PATCH /trips/:tripId/itinerary/activities/:activityId?dayNumber=5
{ "title": "…" }                  → 200, but the activity stayed on day 4
```

`UpdateActivityDto` has no `dayNumber`, and the PATCH path is day-agnostic
(`/itinerary/activities/:id`, with no `:dayNumber` segment), so nothing in the
request can express which day the activity now belongs to.

## 3. Why the frontend is not working around it

The obvious workaround is `DELETE` the activity, then `POST` it to the target
day. That is rejected because it is not atomic: if the POST fails after the
DELETE succeeds — a dropped connection, a cold start, a validation slip — the
activity the traveller typed is gone, with its place, kind and times.

For a feature whose entire purpose is recovering from a mistake, a failure mode
that destroys data is the wrong trade. It also changes the activity's id and
resets its position in the day's order.

## 4. The request

| Schema | Change |
|---|---|
| `UpdateActivityDto` | **add** `dayNumber?: number` — minimum 1, within the trip's day count |

Behaviour when `dayNumber` is present:

- Move the activity to that day of the same trip.
- Create the day if it does not exist yet, the way
  `POST /trips/:tripId/itinerary/days/:dayNumber/activities` already does.
- Append it to the end of the target day's activities, unless `sequence` is sent
  in the same request, in which case honour that.
- Reject a `dayNumber` outside the trip's range with a 400, rather than creating
  a day beyond the trip's own length.
- Omitting `dayNumber` keeps the current behaviour exactly — the activity stays
  where it is and only the fields sent are updated.

Everything else about the endpoint stays as it is.

## 5. Nice to have (not blocking)

A bulk form, so a mis-filed group moves in one request rather than one PATCH per
activity:

```
PUT /trips/:tripId/itinerary/activities/move
{ "activityIds": ["…", "…"], "dayNumber": 5 }
```

The case in §1 is four activities. Sequential PATCHes are fine, and that is what
the client will do if this does not exist — this only saves round trips and makes
the move all-or-nothing.

## 6. What the frontend covers

**Already shipped, needs nothing from you.** Every activity row in the day-by-day
step has an edit button that opens the row as a form in place, pre-filled, for
title, kind, place, start time and end time. It saves through the existing
`PATCH /itinerary/activities/:id`.

*Aside from building it:* `<input type="time">` renders in the viewer's locale, so
in a 12-hour locale the times read `01:00 PM`, not `13:00`. The stored and
transmitted value is always `HH:mm`, which matches what the DTO validates — no
change needed, noting it only so nobody chases a phantom bug.

**When `dayNumber` lands.** A "Day" dropdown joins the same edit form, listing
the trip's days with their dates. Picking a different one moves the activity.
Selecting several rows and moving them together comes with it — via the bulk
endpoint in §5 if it exists, otherwise sequential PATCHes.

Roughly fifteen minutes of client work; the form it attaches to already exists.

## 7. How we will verify

1. `PATCH { dayNumber: 5 }` on an activity from day 4 → 200, and
   `GET /trips/:id/itinerary` shows it under day 5, absent from day 4.
2. Its id, title, kind, place and both times survive the move unchanged.
3. Moving to a day that has no activities yet creates that day.
4. `PATCH { dayNumber: 99 }` on a six-day trip → 400.
5. `PATCH { title: "…" }` with no `dayNumber` leaves the day untouched.
6. `PATCH { dayNumber: 5, startTime: "09:00" }` applies both in one request.
