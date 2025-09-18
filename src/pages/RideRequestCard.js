import React from 'react';

const RideRequestCard = ({ ride, onAccept }) => {
  const {
    id,
    pickup,
    dropoff,
    pickup_lat,
    pickup_lng,
    dropoff_lat,
    dropoff_lng,
    ride_type,
    created_at,
  } = ride;

  return (
    <div className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">{ride_type} Ride</h3>

      <div className="text-sm mb-2">
        <p><strong>Pickup:</strong> {pickup}</p>
        <p className="text-gray-600">({pickup_lat}, {pickup_lng})</p>

        <p className="mt-2"><strong>Drop-off:</strong> {dropoff}</p>
        <p className="text-gray-600">({dropoff_lat}, {dropoff_lng})</p>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Requested at: {new Date(created_at).toLocaleString()}
      </p>

      <button
        onClick={() => onAccept(id)}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Accept Ride
      </button>
    </div>
  );
};

export default RideRequestCard;