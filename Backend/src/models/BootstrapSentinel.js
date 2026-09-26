const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Singleton sentinel document used to make the "is this the first user"
 * check atomic (PRD §5.1, §10, Segment A §3.1).
 *
 * Stored in the `_meta` collection (Segment A §3.1).
 * We do NOT use `User.countDocuments() === 0` followed by an insert —
 * that has a race window where two simultaneous requests can both read
 * count === 0 before either has inserted, and both proceed to create a
 * "first" Manager. Instead, we atomically flip a single sentinel
 * document from unused -> used with findOneAndUpdate + upsert against
 * { _id: 'bootstrap' }, and only the caller that performed the flip
 * is allowed to create the account.
 */
const BootstrapSentinelSchema = new Schema(
  {
    _id: {
      type: String,
      default: 'bootstrap',
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { collection: '_meta', timestamps: true }
);

module.exports = mongoose.model('BootstrapSentinel', BootstrapSentinelSchema);
