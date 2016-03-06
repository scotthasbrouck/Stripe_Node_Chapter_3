var mongoose = require('mongoose');
var validate = require('mongoose-validator');
var Schema = mongoose.Schema;
var stripe = require('stripe')(process.env.STRIPE_KEY);
var Charge = require('./charge.js');


// Product validators
var nameValidator = [
  validate({
    validator: 'isLength',
    arguments: [5, 50],
    message: 'Name must be at least {ARGS[0]} and less than {ARGS[1]} characters'
  })
];
var descriptionValidator = [
  validate({
    validator: 'isLength',
    arguments: [5, 300],
    message: 'Name must be at least {ARGS[0]} and less than {ARGS[1]} characters'
  })
];
var urlValidator = [
  validate({
    validator: 'isURL',
	arguments: [{ protocols: ['https'] }],

  })
];

var productSchema = new Schema({
  name: { type: String, validate: nameValidator },
  description: { type: String, validate: descriptionValidator },
  downloadURL: { type: String, validate: urlValidator },
  amount: { type: Number, min: 50, max: 10000 },
  currency: { type: String, default: 'USD' },
  created_at: Date,
  updated_at: Date
});

var handleStripeError = function(error) {
  switch(error.type) {
    case 'StripeCardError':
      return error;
    case 'RateLimitError':
      return new Error('Unfortunately, too many other users are trying to make a purchase at this time. Please try your purchase again in a few moments.');
    case 'StripeInvalidRequestError':
      return new Error('Unfortunately, there is a problem processing your payment. We\'re aware of the problem, and will followup with you shortly once we can process your order!');
    case 'StripeAPIError':
      return new Error('Unfortunately, our payment processor is down at the moment. Please try your order again in a few moments.');
    case 'StripeConnectionError':
      return new Error('Unfortunately, our payment processor is down at the moment. Please try your order again in a few moments.');
    case 'StripeAuthenticationError':
      return new Error('Unfortunately, there is a problem processing your payment. We\'re aware of the problem, and will followup with you shortly once we can process your order!');
  default:
    return null;
  }
};

productSchema.methods.purchase = function(token, user_id, cb) {
  var self = this;
  stripe.charges.create({
    source: token,
    currency: this.currency,
    amount: this.amount,
	description: this.description
  }, function(err, response) {
    if (err) { return cb(handleStripeError(err); }
    var charge = new Charge({
      stripe_token: token,
      product: self._id,
      user: user_id
    });
    charge.save(function(err) {
      cb(err, charge);
    });
  });
};

module.exports = mongoose.model('Product', productSchema);
