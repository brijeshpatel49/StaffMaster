import cron from "node-cron";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Leave from "../models/Leave.js";
import Holiday from "../models/Holiday.js";

// ── Constants ────────────────────────────────────────────────────────────────

const CRON_SCHEDULE = "0 13 * * *"; // 6:30 PM IST = 1:00 PM UTC
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

const getStartOfDayUTC = (d = new Date()) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

// ─────────────────────────────────────────────────────────────────────────────
// JOB 1 — Auto Checkout (existing behavior)
// Finds employees who checked in but never checked out, auto checks them out,
// and calculates work hours.
// ─────────────────────────────────────────────────────────────────────────────

async function job1AutoCheckout() {
  console.log("[Job 1] Auto Checkout — starting...");
  let checkedOutCount = 0;
  let errorCount = 0;

  try {
    const now = new Date();
    const today = getStartOfDayUTC(now);

    // Find all attendance records for today where employee checked in but not out
    const openRecords = await Attendance.find({
      date: today,
      checkIn: { $ne: null },
      checkOut: null,
    });

    if (openRecords.length === 0) {
      console.log("[Job 1] No open check-ins found. Nothing to auto-checkout.");
      return { checkedOut: 0, errors: 0 };
    }

    console.log(`[Job 1] Found ${openRecords.length} open check-in(s) to auto-checkout.`);

    for (const record of openRecords) {
      try {
        const checkOutTime = now;
        const diffMs = checkOutTime.getTime() - record.checkIn.getTime();
        const workHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);

        // Update status based on work hours
        let { status } = record;
        if (workHours < 4 && (status === "present" || status === "late")) {
          status = "half-day";
        }

        record.checkOut = checkOutTime;
        record.workHours = workHours;
        record.status = status;
        record.note = record.note
          ? `${record.note} | Auto checked out by system`
          : "Auto checked out by system";
        await record.save();

        checkedOutCount++;
        console.log(
          `[Job 1] Auto checked out employee ${record.employeeId} — workHours: ${workHours}, status: ${status}`
        );
      } catch (err) {
        errorCount++;
        console.error(`[Job 1] Error auto-checking out employee ${record.employeeId}:`, err.message);
      }
    }

    console.log(`[Job 1] Auto checkout complete: ${checkedOutCount} checked out, ${errorCount} errors.`);
  } catch (err) {
    errorCount++;
    console.error("[Job 1] Fatal error in auto-checkout job:", err.message);
  }

  return { checkedOut: checkedOutCount, errors: errorCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB 3 — Mark On-Leave for approved leaves with no attendance record
// (Runs BEFORE Job 2 so on-leave employees are excluded from absent marking)
// ─────────────────────────────────────────────────────────────────────────────

async function job3MarkOnLeave() {
  console.log("[Job 3] Mark On-Leave — starting...");
  let markedOnLeaveCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    const today = getStartOfDayUTC(new Date());

    // Step 1 — Find approved leaves covering today
    const approvedLeaves = await Leave.find({
      status: "approved",
      fromDate: { $lte: today },
      toDate: { $gte: today },
    });

    if (approvedLeaves.length === 0) {
      console.log("[Job 3] No approved leaves covering today. Nothing to mark.");
      return { markedOnLeave: 0, skipped: 0, errors: 0 };
    }

    console.log(`[Job 3] Found ${approvedLeaves.length} approved leave(s) covering today.`);

    // Step 2 — For each leave, check if attendance record already exists
    for (const leave of approvedLeaves) {
      try {
        const existingAttendance = await Attendance.findOne({
          employeeId: leave.employeeId,
          date: today,
        });

        // If attendance record exists with status "on-leave" → skip
        if (existingAttendance && existingAttendance.status === "on-leave") {
          skippedCount++;
          console.log(
            `[Job 3] Employee ${leave.employeeId} already marked on-leave — skipping.`
          );
          continue;
        }

        // If employee checked in despite being on approved leave → skip
        if (existingAttendance && existingAttendance.checkIn) {
          skippedCount++;
          console.log(
            `[Job 3] Employee ${leave.employeeId} checked in despite approved leave — skipping.`
          );
          continue;
        }

        // If attendance record exists with no checkIn and different status (e.g. "absent")
        // Update it to on-leave
        if (existingAttendance) {
          existingAttendance.status = "on-leave";
          existingAttendance.workHours = 0;
          existingAttendance.note = `On approved leave - ${leave.leaveType} leave`;
          existingAttendance.isManual = true;
          existingAttendance.markedBy = null;
          await existingAttendance.save();
          markedOnLeaveCount++;
          console.log(
            `[Job 3] Updated existing record for employee ${leave.employeeId} to on-leave (${leave.leaveType}).`
          );
          continue;
        }

        // No attendance record exists → create one
        await Attendance.create({
          employeeId: leave.employeeId,
          date: today,
          checkIn: null,
          checkOut: null,
          status: "on-leave",
          workHours: 0,
          note: `On approved leave - ${leave.leaveType} leave`,
          isManual: true,
          markedBy: null,
        });

        markedOnLeaveCount++;
        console.log(
          `[Job 3] Marked employee ${leave.employeeId} on-leave (${leave.leaveType}).`
        );

        // Update attendanceMarked flag on the leave document
        leave.attendanceMarked = true;
        await leave.save();
      } catch (err) {
        // Duplicate key error — record was created between our check and insert (race condition)
        if (err.code === 11000) {
          skippedCount++;
          console.log(
            `[Job 3] Duplicate key for employee ${leave.employeeId} — attendance record already exists.`
          );
        } else {
          errorCount++;
          console.error(
            `[Job 3] Error marking on-leave for employee ${leave.employeeId}:`,
            err.message
          );
        }
      }
    }

    console.log(
      `[Job 3] On-leave marking complete: ${markedOnLeaveCount} marked, ${skippedCount} skipped, ${errorCount} errors.`
    );
  } catch (err) {
    errorCount++;
    console.error("[Job 3] Fatal error in mark-on-leave job:", err.message);
  }

  return { markedOnLeave: markedOnLeaveCount, skipped: skippedCount, errors: errorCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOLIDAY ATTENDANCE — mark all active employees as "holiday"
// ─────────────────────────────────────────────────────────────────────────────

async function markHolidayAttendance(dateUTC, holidayName) {
  console.log(`[Holiday] Marking holiday attendance for: ${holidayName}`);

  const activeProfiles = await EmployeeProfile.find({ status: "active" }).select("userId").lean();
  const activeProfileUserIds = activeProfiles.map((p) => p.userId.toString());

  const activeUsers = await User.find({
    role: { $in: ["employee", "manager"] },
    isActive: true,
    _id: { $in: activeProfileUserIds },
  })
    .select("_id")
    .lean();

  if (activeUsers.length === 0) {
    console.log("[Holiday] No active employees found.");
    return 0;
  }

  const ops = activeUsers.map((u) => ({
    updateOne: {
      filter: { employeeId: u._id, date: dateUTC },
      update: {
        $set: {
          status: "holiday",
          note: `Holiday: ${holidayName}`,
          isManual: true,
          workHours: 0,
          markedBy: null,
        },
        $setOnInsert: {
          employeeId: u._id,
          date: dateUTC,
          checkIn: null,
          checkOut: null,
        },
      },
      upsert: true,
    },
  }));

  const result = await Attendance.bulkWrite(ops, { ordered: false });
  const count = (result.upsertedCount || 0) + (result.modifiedCount || 0);
  console.log(`[Holiday] Holiday attendance marked: ${count} employees`);
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB 2 — Mark Absent for employees who never checked in
// (Runs AFTER Job 3 so on-leave records are already in place)
// ─────────────────────────────────────────────────────────────────────────────

async function job2MarkAbsent() {
  console.log("[Job 2] Mark Absent — starting...");
  let markedAbsentCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    const today = getStartOfDayUTC(new Date());

    // ── Holiday check — runs BEFORE absent marking ──
    const todayHoliday = await Holiday.isHoliday(today);
    if (todayHoliday) {
      console.log(`[Job 2] Today is a holiday: ${todayHoliday.name}. Running holiday marking instead.`);
      const count = await markHolidayAttendance(today, todayHoliday.name);
      return { markedAbsent: 0, skipped: 0, errors: 0, holidayMarked: count };
    }

    // Weekend check — skip entire Job 2 on Sundays
    if (today.getDay() === 0) {
      console.log("[Job 2] Today is Sunday — skipping absent marking.");
      return { markedAbsent: 0, skipped: 0, errors: 0 };
    }

    // Step 1 — Get ALL active employees (role = employee or manager, isActive = true,
    //          AND EmployeeProfile.status = "active")
    const activeProfiles = await EmployeeProfile.find({ status: "active" })
      .select("userId")
      .lean();

    const activeProfileUserIds = activeProfiles.map((p) => p.userId.toString());

    const activeUsers = await User.find({
      role: { $in: ["employee", "manager"] },
      isActive: true,
      _id: { $in: activeProfileUserIds },
    })
      .select("_id")
      .lean();

    const activeEmployeeIds = activeUsers.map((u) => u._id.toString());

    if (activeEmployeeIds.length === 0) {
      console.log("[Job 2] No active employees found. Nothing to mark absent.");
      return { markedAbsent: 0, skipped: 0, errors: 0 };
    }

    console.log(`[Job 2] Found ${activeEmployeeIds.length} active employee(s).`);

    // Step 2 — Get employees who ARE on approved leave today
    const approvedLeaves = await Leave.find({
      status: "approved",
      fromDate: { $lte: today },
      toDate: { $gte: today },
    })
      .select("employeeId")
      .lean();

    const onLeaveEmployeeIds = approvedLeaves.map((l) => l.employeeId.toString());
    console.log(`[Job 2] ${onLeaveEmployeeIds.length} employee(s) on approved leave today.`);

    // Step 3 — Get employees who already have an attendance record today
    const existingAttendance = await Attendance.find({
      date: today,
      employeeId: { $in: activeEmployeeIds.map((id) => id) },
    })
      .select("employeeId")
      .lean();

    const alreadyMarkedEmployeeIds = existingAttendance.map((a) =>
      a.employeeId.toString()
    );
    console.log(
      `[Job 2] ${alreadyMarkedEmployeeIds.length} employee(s) already have attendance records.`
    );

    // Step 4 — Find employees with NO record and NOT on approved leave
    const absentEmployeeIds = activeEmployeeIds
      .filter((id) => !alreadyMarkedEmployeeIds.includes(id))
      .filter((id) => !onLeaveEmployeeIds.includes(id));

    if (absentEmployeeIds.length === 0) {
      console.log("[Job 2] All active employees accounted for. No absences to mark.");
      return { markedAbsent: 0, skipped: 0, errors: 0 };
    }

    console.log(
      `[Job 2] ${absentEmployeeIds.length} employee(s) to be marked absent.`
    );

    // Step 5 — Create absent records using insertMany (ordered: false)
    const absentRecords = absentEmployeeIds.map((id) => ({
      employeeId: id,
      date: today,
      checkIn: null,
      checkOut: null,
      status: "absent",
      workHours: 0,
      note: "Auto marked absent - no check-in recorded",
      isManual: true,
      markedBy: null,
    }));

    try {
      const result = await Attendance.insertMany(absentRecords, { ordered: false });
      markedAbsentCount = result.length;
    } catch (err) {
      // insertMany with ordered:false throws BulkWriteError but still inserts non-duplicate docs
      if (err.code === 11000 || err.name === "BulkWriteError" || err.name === "MongoBulkWriteError") {
        // Some records inserted, some failed due to duplicate key
        const inserted = err.insertedDocs?.length ?? err.result?.nInserted ?? 0;
        markedAbsentCount = inserted;
        const failedCount = absentEmployeeIds.length - markedAbsentCount;
        skippedCount += failedCount;
        console.log(
          `[Job 2] Bulk insert partial success: ${markedAbsentCount} inserted, ${failedCount} skipped (duplicate key).`
        );
      } else {
        errorCount++;
        console.error("[Job 2] Error inserting absent records:", err.message);
      }
    }

    // Log each absent employee for debugging
    for (const id of absentEmployeeIds) {
      console.log(`[Job 2] Marked absent: employeeId ${id}`);
    }

    console.log(
      `[Job 2] Auto absent marking complete: ${markedAbsentCount} marked absent, ${skippedCount} skipped, ${errorCount} errors.`
    );
  } catch (err) {
    errorCount++;
    console.error("[Job 2] Fatal error in mark-absent job:", err.message);
  }

  return { markedAbsent: markedAbsentCount, skipped: skippedCount, errors: errorCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — Run all 3 jobs sequentially
// ─────────────────────────────────────────────────────────────────────────────

export async function runDailyJobs() {
  console.log("=== Daily attendance jobs starting ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const job1Result = await job1AutoCheckout(); // Job 1: close open sessions
  const job3Result = await job3MarkOnLeave(); // Job 3: mark on-leave FIRST
  const job2Result = await job2MarkAbsent(); // Job 2: mark absent LAST

  const summary = {
    autoCheckedOut: job1Result.checkedOut,
    markedOnLeave: job3Result.markedOnLeave,
    markedAbsent: job2Result.markedAbsent,
    skipped: job3Result.skipped + job2Result.skipped,
    errors: job1Result.errors + job3Result.errors + job2Result.errors,
    timestamp: new Date().toISOString(),
  };

  console.log("=== Daily attendance jobs completed ===");
  console.log(summary);

  return summary;
}

// ── Schedule the cron job ────────────────────────────────────────────────────

cron.schedule(CRON_SCHEDULE, () => {
  runDailyJobs().catch((err) => {
    console.error("Critical error in daily attendance jobs:", err);
  });
});

console.log(`[Cron] Daily attendance jobs scheduled at "${CRON_SCHEDULE}" (6:30 PM IST / 1:00 PM UTC)`);
