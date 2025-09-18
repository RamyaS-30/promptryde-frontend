export default function RideHistoryCard({ ride, onCancel }) {
  const {
    pickup,
    dropoff,
    fare,
    status,
    created_at,
    updated_at,
    id,
  } = ride;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const statusColor = {
    completed: "bg-green-500",
    cancelled: "bg-red-500",
    in_progress: "bg-yellow-500",
    accepted: "bg-blue-500",
    requested: "bg-gray-400",
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border flex flex-col h-full">
      <h4 className="font-semibold text-lg mb-3">Ride Details</h4>

      <div className="mb-2 flex-grow">
        <p><span className="font-medium">Pickup:</span> <span className="text-gray-700">{pickup || "N/A"}</span></p>
        <p><span className="font-medium">Dropoff:</span> <span className="text-gray-700">{dropoff || "N/A"}</span></p>
        <p><span className="font-medium">Fare:</span> <span className="text-gray-800">₹{fare?.toFixed(2) || "0.00"}</span></p>
        <p>
          <span className="font-medium">Status:</span>{" "}
          <span
            className={`inline-block px-2 py-1 text-xs font-semibold text-white rounded-full ${statusColor[status] || "bg-gray-500"}`}
          >
            {status}
          </span>
        </p>
      </div>

      {/* ✅ Cancel Ride button (only if status is accepted) */}
      {status === "accepted" && typeof onCancel === "function" && (
        <button
          onClick={() => onCancel(id)}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-1 px-4 rounded"
        >
          Cancel Ride
        </button>
      )}

      <div className="text-sm text-gray-500 mt-4">
        <div>Created: {formatDate(created_at)}</div>
        <div>Updated: {formatDate(updated_at)}</div>
      </div>
    </div>
  );
}