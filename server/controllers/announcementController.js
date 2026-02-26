import Announcement from "../models/Announcement.js";

const VALID_ROLES = ["admin", "hr", "manager", "employee", "all"];
const PRIORITY_ORDER = { urgent: 1, important: 2, normal: 3 };

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE ANNOUNCEMENT
// ─────────────────────────────────────────────────────────────────────────────
export const createAnnouncement = async (req, res) => {
  try {
    const { title, body, targetRoles, priority, expiresAt, pinned } = req.body;

    // Required fields
    if (!title || !body || !expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Title, body, and expiresAt are required",
      });
    }

    // Validate expiresAt is in the future
    if (new Date(expiresAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future",
      });
    }

    // Validate targetRoles if provided
    if (targetRoles && targetRoles.length > 0) {
      const invalid = targetRoles.filter((r) => !VALID_ROLES.includes(r));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid target roles: ${invalid.join(", ")}`,
        });
      }
    }

    const announcement = await Announcement.create({
      title,
      body,
      postedBy: req.user._id,
      targetRoles:
        targetRoles && targetRoles.length > 0 ? targetRoles : ["all"],
      priority: priority || "normal",
      expiresAt,
      pinned: pinned || false,
    });

    const populated = await Announcement.findById(announcement._id).populate(
      "postedBy",
      "fullName role"
    );

    return res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create Announcement Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET ALL ANNOUNCEMENTS (Admin, HR — includes expired)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllAnnouncements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      priority,
      isActive,
    } = req.query;

    const filter = {};

    if (priority) filter.priority = priority;
    if (isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .populate("postedBy", "fullName role")
        .sort({ pinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Announcement.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: announcements.length,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      total,
      data: announcements,
    });
  } catch (error) {
    console.error("Get All Announcements Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET ACTIVE ANNOUNCEMENTS (All authenticated users)
// ─────────────────────────────────────────────────────────────────────────────
export const getActiveAnnouncements = async (req, res) => {
  try {
    const userRole = req.user.role;

    const announcements = await Announcement.find({
      isActive: true,
      expiresAt: { $gt: new Date() },
      $or: [
        { targetRoles: "all" },
        { targetRoles: userRole },
      ],
    })
      .populate("postedBy", "fullName")
      .sort({ pinned: -1, createdAt: -1 });

    // Sort by pinned first, then priority order, then newest
    announcements.sort((a, b) => {
      // Pinned first
      if (b.pinned !== a.pinned) return b.pinned ? 1 : -1;
      // Then by priority
      const pA = PRIORITY_ORDER[a.priority] || 3;
      const pB = PRIORITY_ORDER[b.priority] || 3;
      if (pA !== pB) return pA - pB;
      // Then newest first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    console.error("Get Active Announcements Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3b. UNREAD COUNT — lightweight count for sidebar badge
// ─────────────────────────────────────────────────────────────────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const userRole = req.user.role;
    const since = req.query.since; // ISO timestamp of last visit

    const filter = {
      isActive: true,
      expiresAt: { $gt: new Date() },
      $or: [{ targetRoles: "all" }, { targetRoles: userRole }],
    };

    // Only count announcements created/updated after "since"
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate)) {
        filter.updatedAt = { $gt: sinceDate };
      }
    }

    const count = await Announcement.countDocuments(filter);
    return res.json({ success: true, count });
  } catch (error) {
    console.error("Unread Count Error:", error);
    return res.status(500).json({ success: false, count: 0 });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET ANNOUNCEMENT BY ID
// ─────────────────────────────────────────────────────────────────────────────
export const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).populate(
      "postedBy",
      "fullName role"
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.json({ success: true, data: announcement });
  } catch (error) {
    console.error("Get Announcement By ID Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. UPDATE ANNOUNCEMENT
// ─────────────────────────────────────────────────────────────────────────────
export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Ownership check: HR can only edit own, admin can edit all
    if (
      req.user.role !== "admin" &&
      announcement.postedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own announcements",
      });
    }

    const { title, body, targetRoles, priority, expiresAt, pinned, isActive } =
      req.body;

    // Validate expiresAt if provided
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future",
      });
    }

    // Validate targetRoles if provided
    if (targetRoles && targetRoles.length > 0) {
      const invalid = targetRoles.filter((r) => !VALID_ROLES.includes(r));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid target roles: ${invalid.join(", ")}`,
        });
      }
    }

    // Update only provided fields
    if (title !== undefined) announcement.title = title;
    if (body !== undefined) announcement.body = body;
    if (targetRoles !== undefined) announcement.targetRoles = targetRoles;
    if (priority !== undefined) announcement.priority = priority;
    if (expiresAt !== undefined) announcement.expiresAt = expiresAt;
    if (pinned !== undefined) announcement.pinned = pinned;
    if (isActive !== undefined) announcement.isActive = isActive;

    await announcement.save();

    const populated = await Announcement.findById(announcement._id).populate(
      "postedBy",
      "fullName role"
    );

    return res.json({
      success: true,
      message: "Announcement updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Update Announcement Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. DELETE ANNOUNCEMENT
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Ownership check
    if (
      req.user.role !== "admin" &&
      announcement.postedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own announcements",
      });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Announcement deleted",
    });
  } catch (error) {
    console.error("Delete Announcement Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. TOGGLE PIN (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const togglePin = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    announcement.pinned = !announcement.pinned;
    await announcement.save();

    return res.json({
      success: true,
      message: announcement.pinned
        ? "Announcement pinned"
        : "Announcement unpinned",
      pinned: announcement.pinned,
    });
  } catch (error) {
    console.error("Toggle Pin Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. TOGGLE ACTIVE (Admin, HR)
// ─────────────────────────────────────────────────────────────────────────────
export const toggleActive = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    return res.json({
      success: true,
      message: announcement.isActive
        ? "Announcement activated"
        : "Announcement deactivated",
      isActive: announcement.isActive,
    });
  } catch (error) {
    console.error("Toggle Active Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
