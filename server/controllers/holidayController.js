import Holiday from "../models/Holiday.js";
import Attendance from "../models/Attendance.js";

// ── helpers ──────────────────────────────────────────────────────────────────

const toUTCMidnight = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE HOLIDAY
// ─────────────────────────────────────────────────────────────────────────────
export const createHoliday = async (req, res) => {
  try {
    const { name, date, type, description, isRecurring } = req.body;

    if (!name || !date) {
      return res.status(400).json({ success: false, message: "Name and date are required" });
    }

    const holidayDate = toUTCMidnight(date);
    const year = holidayDate.getUTCFullYear();

    // Duplicate check
    const existing = await Holiday.findOne({ date: holidayDate });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A holiday already exists on this date: ${existing.name}`,
      });
    }

    const baseData = {
      name: name.trim(),
      date: holidayDate,
      type: type || "national",
      description: description?.trim() || "",
      isRecurring: !!isRecurring,
      year,
      createdBy: req.user._id,
    };

    const created = [await Holiday.create(baseData)];

    // If recurring, create for next 2 years
    if (isRecurring) {
      const month = holidayDate.getUTCMonth();
      const day = holidayDate.getUTCDate();

      for (let i = 1; i <= 2; i++) {
        const futureDate = new Date(Date.UTC(year + i, month, day));
        futureDate.setUTCHours(0, 0, 0, 0);

        const dup = await Holiday.findOne({ date: futureDate });
        if (!dup) {
          const entry = await Holiday.create({
            ...baseData,
            date: futureDate,
            year: year + i,
          });
          created.push(entry);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: `Holiday created successfully${isRecurring ? ` (${created.length} entries for recurring)` : ""}`,
      data: created.length === 1 ? created[0] : created,
    });
  } catch (error) {
    console.error("createHoliday error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "A holiday already exists on this date" });
    }
    return res.status(500).json({ success: false, message: "Server error while creating holiday" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET ALL HOLIDAYS
// ─────────────────────────────────────────────────────────────────────────────
export const getAllHolidays = async (req, res) => {
  try {
    const { year, type, page = 1, limit = 50 } = req.query;
    const filter = { isActive: true };

    if (year) filter.year = parseInt(year);
    else filter.year = new Date().getFullYear();

    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [holidays, total] = await Promise.all([
      Holiday.find(filter)
        .populate("createdBy", "fullName")
        .sort({ date: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Holiday.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: holidays.length,
      total,
      data: holidays,
    });
  } catch (error) {
    console.error("getAllHolidays error:", error);
    return res.status(500).json({ success: false, message: "Server error while fetching holidays" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET UPCOMING HOLIDAYS
// ─────────────────────────────────────────────────────────────────────────────
export const getUpcomingHolidays = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const today = toUTCMidnight(new Date());

    const holidays = await Holiday.find({
      date: { $gte: today },
      isActive: true,
    })
      .sort({ date: 1 })
      .limit(parseInt(limit));

    return res.json({ success: true, data: holidays });
  } catch (error) {
    console.error("getUpcomingHolidays error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. UPDATE HOLIDAY
// ─────────────────────────────────────────────────────────────────────────────
export const updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: "Holiday not found" });
    }

    const { name, date, type, description, isRecurring, isActive } = req.body;

    // If date changing, check duplicate
    if (date) {
      const newDate = toUTCMidnight(date);
      if (newDate.getTime() !== holiday.date.getTime()) {
        const dup = await Holiday.findOne({ date: newDate, _id: { $ne: holiday._id } });
        if (dup) {
          return res.status(400).json({
            success: false,
            message: `Another holiday already exists on this date: ${dup.name}`,
          });
        }
        holiday.date = newDate;
        holiday.year = newDate.getUTCFullYear();
      }
    }

    if (name !== undefined) holiday.name = name.trim();
    if (type !== undefined) holiday.type = type;
    if (description !== undefined) holiday.description = description?.trim() || "";
    if (isRecurring !== undefined) holiday.isRecurring = isRecurring;

    // Deactivating a future holiday → revert attendance
    if (isActive === false && holiday.isActive === true) {
      const today = toUTCMidnight(new Date());
      if (holiday.date >= today) {
        await Attendance.updateMany(
          { date: holiday.date, status: "holiday" },
          { $set: { status: "absent", note: "Holiday cancelled — reverted to absent" } }
        );
      }
      holiday.isActive = false;
    } else if (isActive === true) {
      holiday.isActive = true;
    }

    await holiday.save();

    return res.json({ success: true, message: "Holiday updated", data: holiday });
  } catch (error) {
    console.error("updateHoliday error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "A holiday already exists on this date" });
    }
    return res.status(500).json({ success: false, message: "Server error while updating holiday" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELETE HOLIDAY
// ─────────────────────────────────────────────────────────────────────────────
export const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: "Holiday not found" });
    }

    const today = toUTCMidnight(new Date());

    // If future date, revert attendance records
    if (holiday.date >= today) {
      await Attendance.updateMany(
        { date: holiday.date, status: "holiday" },
        { $set: { status: "absent", note: "Holiday deleted — reverted to absent" } }
      );
    }

    await Holiday.findByIdAndDelete(holiday._id);

    return res.json({ success: true, message: `Holiday "${holiday.name}" deleted successfully` });
  } catch (error) {
    console.error("deleteHoliday error:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting holiday" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. BULK CREATE HOLIDAYS
// ─────────────────────────────────────────────────────────────────────────────
export const bulkCreateHolidays = async (req, res) => {
  try {
    const { holidays } = req.body;

    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).json({ success: false, message: "Holidays array is required" });
    }
    if (holidays.length > 20) {
      return res.status(400).json({ success: false, message: "Maximum 20 holidays at once" });
    }

    const created = [];
    const skippedDates = [];

    for (const item of holidays) {
      if (!item.name || !item.date) {
        skippedDates.push(item.date || "missing date");
        continue;
      }

      const d = toUTCMidnight(item.date);
      const existing = await Holiday.findOne({ date: d });
      if (existing) {
        skippedDates.push(d.toISOString().split("T")[0]);
        continue;
      }

      try {
        const entry = await Holiday.create({
          name: item.name.trim(),
          date: d,
          type: item.type || "national",
          description: item.description?.trim() || "",
          isRecurring: false,
          year: d.getUTCFullYear(),
          createdBy: req.user._id,
        });
        created.push(entry);
      } catch (err) {
        if (err.code === 11000) {
          skippedDates.push(d.toISOString().split("T")[0]);
        } else {
          throw err;
        }
      }
    }

    return res.status(201).json({
      success: true,
      created: created.length,
      skipped: skippedDates.length,
      skippedDates,
      data: created,
    });
  } catch (error) {
    console.error("bulkCreateHolidays error:", error);
    return res.status(500).json({ success: false, message: "Server error while bulk creating holidays" });
  }
};
