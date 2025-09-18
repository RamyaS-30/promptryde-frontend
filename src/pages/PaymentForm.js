import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

const API_BASE = process.env.REACT_APP_BACKEND_URL; // your backend

export default function PaymentForm({ amount, driverStripeAccountId, onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Create payment intent on backend
      const res = await fetch(`${API_BASE}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, driverStripeAccountId }),
      });
      const { clientSecret, error } = await res.json();
      if (error) throw new Error(error);

      // Confirm card payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        setErrorMsg(result.error.message);
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          setErrorMsg('');
          onPaymentSuccess(result.paymentIntent);
        }
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <CardElement />
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      <button type="submit" disabled={!stripe || loading} style={{ marginTop: 10 }}>
        {loading ? 'Processing...' : `Pay ₹${amount}`}
      </button>
    </form>
  );
}