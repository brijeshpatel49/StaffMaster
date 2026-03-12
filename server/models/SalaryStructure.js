import mongoose from "mongoose";

const salaryStructureSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    ctc: {
      type: Number,
      required: true,
      min: 0,
    },
    // Auto-calculated components (derived from CTC)
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },

    effectiveFrom: {
      type: Date,
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

/**
 * Calculates salary components from CTC and sets them on the document.
 * Basic = 40%, HRA = 20%, DA = 10%, PF = 12% of basic, Tax = 10% of gross, Special = remainder
 */
salaryStructureSchema.methods.calculateComponents = function () {
  const ctc = this.ctc;
  this.basic = Math.round(ctc * 0.4);
  this.hra = Math.round(ctc * 0.2);
  this.da = Math.round(ctc * 0.1);
  this.pf = Math.round(this.basic * 0.12);
  this.tax = Math.round(ctc * 0.1);
  // Special = CTC - (basic + hra + da)
  this.special = ctc - (this.basic + this.hra + this.da);
};

/**
 * Returns monthly gross (CTC / 12)
 */
salaryStructureSchema.methods.monthlyGross = function () {
  return Math.round(this.ctc / 12);
};

// Auto-calculate components before save
salaryStructureSchema.pre("save", function () {
  if (this.isModified("ctc")) {
    this.calculateComponents();
  }
});

export default mongoose.model("SalaryStructure", salaryStructureSchema);
