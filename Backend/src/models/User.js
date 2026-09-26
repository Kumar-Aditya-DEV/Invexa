const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['manager', 'staff'],
      required: true,
    },
    // Ignored/irrelevant when role === 'manager'. Set by a Manager at
    // creation or via edit (PUT /api/users/:id). This is read live from
    // the DB by the warehouseScope middleware on every write request —
    // it is deliberately NOT baked into the JWT (PRD §5.1, §5.9, §6).
    assignedWarehouses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
      },
    ],
    // true on creation via POST /api/users or the bootstrap route.
    // Forces the user through PUT /api/auth/change-password before any
    // other route is reachable (PRD §5.1).
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
    // Soft-disable only. Never hard-delete a user — the ledger's `user`
    // field (owned by Segment B) references users by ObjectId and must
    // remain resolvable for audit-trail purposes (PRD §5.12).
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Never serialize the password hash
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);
