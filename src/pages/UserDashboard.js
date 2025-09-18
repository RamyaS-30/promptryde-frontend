import React, { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { upsertUserProfile, getUserByClerkId } from "../api/userApi";
import { getRidesByUser, createRide } from "../api/rideApi";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
  Polyline
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PaymentForm from "./PaymentForm";
import originIcon from '../images/origin.png';
import destinationIcon from '../images/destination.png';
// Fix for missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Auto-center map when center changes
const MapAutoCenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

const LocationPicker = ({ label, position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  //return position ? <Marker position={position} /> : null;
};

const pickupIcon = new L.Icon({
  iconUrl: originIcon,  // Replace with your pickup icon path or use a URL
  iconSize: [25, 41], 
  iconAnchor: [12, 41], 
  popupAnchor: [1, -34], 
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const dropoffIcon = new L.Icon({
  iconUrl: destinationIcon,  // Replace with your dropoff icon path or use a URL
  iconSize: [25, 41], 
  iconAnchor: [12, 41], 
  popupAnchor: [1, -34], 
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

export default function UserDashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profileImage, setProfileImage] = useState("");

  const [rides, setRides] = useState([]);
  const [rideForm, setRideForm] = useState({
    pickup: null,
    dropoff: null,
    pickupAddress: "",
    dropoffAddress: "",
  });

  const [mapCenter, setMapCenter] = useState([22.9734, 78.6569]); // Default India
  const [riderId, setRiderId] = useState(null);
  const [selecting, setSelecting] = useState("pickup");
  const [activeTab, setActiveTab] = useState("profile"); // Tabs: profile, ride, rides
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState(null);
  const [paymentMode, setPaymentMode] = useState("card");
  const API_BASE = process.env.REACT_APP_BACKEND_URL;

  function calculateFare(pickup, dropoff) {
  if (!pickup || !dropoff) return 0;

  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(dropoff.lat - pickup.lat);
  const dLon = toRad(dropoff.lng - pickup.lng);

  const lat1 = toRad(pickup.lat);
  const lat2 = toRad(dropoff.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  const baseFare = 50;
  const perKmRate = 20;

  return Math.round(baseFare + distanceKm * perKmRate);
}

  const fetchUserRides = async (userId) => {
    if (!userId) return;
    try {
      const userRides = await getRidesByUser(userId);
      setRides(userRides);
    } catch (error) {
      console.error("Failed to fetch rides:", error);
    }
  };

  const handleCashPayment = async () => {
  if (!selectedRide) return;

  try {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rideId: selectedRide.id,
        userId: selectedRide.rider_id,
        amount: selectedRide.fare,
        paymentMode: "cash", // indicate cash payment
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert('Cash payment recorded! Please pay the driver directly.');
      setSelectedRide(null);
      await fetchUserRides(riderId); 
    } else {
      console.error("Cash payment failed:", data);
      alert(`Failed to record cash payment: ${data.message || "Unknown error"}`);
    }
  } catch (error) {
    console.error('Cash payment recording error:', error);
    alert('Error recording cash payment.');
  }
};

const handleCancelRide = async (rideId) => {
  if (!window.confirm("Are you sure you want to cancel this ride?")) return;

  try {
    const res = await fetch(`${API_BASE}/rides/${rideId}/cancel`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cancelled_by: "user",
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Ride cancelled successfully.");
      await fetchUserRides(riderId);
    } else {
      console.error("Failed to cancel ride:", data);
      alert(`Error: ${data.message || "Failed to cancel ride"}`);
    }
  } catch (error) {
    console.error("Cancel ride error:", error);
    alert("Something went wrong while cancelling the ride.");
  }
};

  useEffect(() => {
  async function fetchProfileAndId() {
    if (!user) return;
    setLoading(true);
    try {
      // Upsert user data in Supabase
      const supabaseUser = await getUserByClerkId(user.id);
      if (!supabaseUser) {
        // Only insert default Clerk values if the user doesn't exist in Supabase
        await upsertUserProfile({
          clerkId: user.id,
          name: user.fullName || "",
          phoneNumber: user.phoneNumber || "",
          profileImage: user.profileImageUrl || "",
        });
      }

    } catch (error) {
      console.error("Error syncing user to Supabase:", error);
    }

    try {
      const supabaseUser = await getUserByClerkId(user.id);
      console.log("Clerk user:", user);
      console.log("Supabase user:", supabaseUser);

      if (supabaseUser) {
        setRiderId(supabaseUser.id);
        setName(supabaseUser.name ?? user.fullName ?? "");
        setPhoneNumber(supabaseUser.phone_number ?? user.phoneNumber ?? "");
        setProfileImage(supabaseUser.profile_image ?? user.profileImageUrl ?? "");
      } else {
        setName(user.fullName || "");
        setPhoneNumber(user.phoneNumber || "");
        setProfileImage(user.profileImageUrl || "");
      }

      if (supabaseUser) {
        const rides = await getRidesByUser(supabaseUser.id);
        setRides(rides);
      }
    } catch (error) {
      console.error("Error loading user profile and rides:", error);
    } finally{
      setLoading(false);
    }
  }

  fetchProfileAndId();
}, [user]);

if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Please login to access your dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await upsertUserProfile({
        clerkId: user.id,
        name,
        phoneNumber,
        profileImage,
      });
      alert("Profile updated!");
    } catch (error) {
      console.error("Update failed:", error);
      alert("Error updating profile.");
    }
  };

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
      );
      return res.data.display_name;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "Unknown address";
    }
  };

  const forwardGeocode = async (query) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1`
      );
      if (res.data && res.data.length > 0) {
        const { lat, lon } = res.data[0];
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
      }
    } catch (error) {
      console.error("Forward geocoding error:", error);
    }
    return null;
  };

  const handleManualAddressChange = async (type, address) => {
    setRideForm((prev) => ({
      ...prev,
      [`${type}Address`]: address,
    }));

    const coords = await forwardGeocode(address);
    if (coords) {
      setRideForm((prev) => ({
        ...prev,
        [type]: coords,
      }));
      setMapCenter([coords.lat, coords.lng]);
      if (type === "pickup") setSelecting("dropoff");
    }
  };

  const handleRideSubmit = async (e) => {
    e.preventDefault();
    if (!riderId) {
      alert("User not ready yet.");
      return;
    }

    try {
      const newRide = {
        pickup: rideForm.pickupAddress,
        dropoff: rideForm.dropoffAddress,
        pickup_lat: rideForm.pickup?.lat || null,
        pickup_lng: rideForm.pickup?.lng || null,
        dropoff_lat: rideForm.dropoff?.lat || null,
        dropoff_lng: rideForm.dropoff?.lng || null,
        ride_type: "standard",
        status: "requested",
        rider_id: riderId,
        fare: calculateFare(rideForm.pickup, rideForm.dropoff)
      };
      
      await createRide(newRide);
      await fetchUserRides(riderId); 
      setRideForm({
        pickup: null,
        dropoff: null,
        pickupAddress: "",
        dropoffAddress: "",
      });
      setSelecting("pickup");
    } catch (error) {
      console.error("Error creating ride:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handlePaymentSuccess = async (paymentIntent) => {
  if (!selectedRide) return;

  try {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rideId: selectedRide.id,
        userId: selectedRide.rider_id,
        amount: selectedRide.fare,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('Payment recorded successfully!');
      setSelectedRide(null);
      await fetchUserRides(riderId); 
    } else {
      console.error("Payment failed:", data);
      alert(`Failed to record payment: ${data.message || "Unknown error"}`);
    }
  } catch (error) {
    console.error('Payment recording error:', error);
    alert('Error recording payment.');
  }
};

 return (
  <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
    {/* Mobile Hamburger */}
    <div className="md:hidden bg-white p-2 shadow flex justify-between items-center">
      <h1 className="text-xl font-bold">🚀 User Dashboard</h1>
      
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="text-gray-700 focus:outline-none"
        aria-label="Toggle menu"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          ></path>
        </svg>
      </button>
    </div>

    {/* Sidebar */}
    <div
      className={`bg-white shadow-md p-4 w-full md:w-64 z-10 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        fixed md:static top-0 left-0 h-full md:h-auto flex flex-col justify-between`}
    >
      {/* Top: Title + Nav */}
      <div>
        <h1 className="text-2xl font-bold mb-2">🚀 User Dashboard</h1>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              setActiveTab("profile");
              setSidebarOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded ${
              activeTab === "profile"
                ? "bg-blue-100 font-semibold"
                : "hover:bg-gray-100"
            }`}
          >
            👤 Profile Info
          </button>
          <button
            onClick={() => {
              setActiveTab("ride");
              setSidebarOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded ${
              activeTab === "ride"
                ? "bg-blue-100 font-semibold"
                : "hover:bg-gray-100"
            }`}
          >
            📍 Book a Ride
          </button>
          <button
            onClick={() => {
              setActiveTab("rides");
              setSidebarOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded ${
              activeTab === "rides"
                ? "bg-blue-100 font-semibold"
                : "hover:bg-gray-100"
            }`}
          >
            📋 Your Rides
          </button>
        </div>
      </div>

      {/* Bottom: Sign Out */}
      <div className="mt-6">
        <button
          onClick={() => {
            handleSignOut();
            setSidebarOpen(false);
          }}
          className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 w-full"
        >
          Sign Out
        </button>
      </div>
    </div>

    {/* Overlay */}
    {sidebarOpen && (
      <div
        className="fixed inset-0 bg-black opacity-30 md:hidden"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      ></div>
    )}

      {/* Main Content */}
      <div className="flex-1 w-full px-6 md:px-10 py-6">
        {activeTab === "profile" && (
          <form
            onSubmit={handleProfileSubmit}
            className="bg-white p-6 rounded shadow-md max-w-lg mx-auto"
          >
            <h2 className="text-xl font-semibold mb-4">👤 Profile Info</h2>
            <div className="mb-4">
              <label className="block font-medium">Name</label>
              <input
                className="w-full border px-3 py-2 rounded"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block font-medium">Phone Number</label>
              <input
                className="w-full border px-3 py-2 rounded"
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block font-medium">Profile Image URL</label>
              <input
                className="w-full border px-3 py-2 rounded"
                type="text"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
              />
            </div>
            {profileImage && (
              <div className="mb-4">
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover"
                />
              </div>
            )}
            <button
              type="submit"
              className="bg-blue-600 text-white px-3 py-2 rounded"
            >
              Save Profile
            </button>
          </form>
        )}

        {activeTab === "ride" && (
          <div className="bg-white p-6 rounded shadow-md max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">📍 Book a Ride</h2>

            <div className="mb-4">
              <label className="block font-medium">Pickup Address</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                placeholder="Type pickup location"
                value={rideForm.pickupAddress}
                onChange={(e) =>
                  handleManualAddressChange("pickup", e.target.value)
                }
              />
            </div>

            <div className="mb-4">
              <label className="block font-medium">Drop-off Address</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                placeholder="Type drop-off location"
                value={rideForm.dropoffAddress}
                onChange={(e) =>
                  handleManualAddressChange("dropoff", e.target.value)
                }
              />
            </div>

            <p className="text-sm mb-2 text-gray-600">
              Or click on the map to select your{" "}
              {selecting === "pickup" ? "pickup" : "drop-off"} location.
            </p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSelecting("pickup")}
                className={`px-4 py-2 rounded ${
                  selecting === "pickup"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Select Pickup
              </button>
              <button
                onClick={() => setSelecting("dropoff")}
                className={`px-4 py-2 rounded ${
                  selecting === "dropoff"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Select Dropoff
              </button>
            </div>
            <MapContainer
              center={mapCenter}
              zoom={13}
              scrollWheelZoom={true}
              className="h-80 w-full rounded mb-4 z-0"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <MapAutoCenter center={mapCenter} />
              <LocationPicker
                label={selecting}
                position={rideForm[selecting]}
                setPosition={async (latlng) => {
                  const address = await reverseGeocode(latlng.lat, latlng.lng);
                  setRideForm((prev) => ({
                    ...prev,
                    [selecting]: latlng,
                    [`${selecting}Address`]: address,
                  }));
                  setMapCenter([latlng.lat, latlng.lng]);
                }}
              />
              {rideForm.pickup && (
                 <Marker 
                   position={[rideForm.pickup.lat, rideForm.pickup.lng]} 
                   icon={pickupIcon}
                 />
               )}
               {rideForm.dropoff && (
                 <Marker 
                   position={[rideForm.dropoff.lat, rideForm.dropoff.lng]} 
                   icon={dropoffIcon}
                 />
               )}
              {rideForm.pickup && rideForm.dropoff && (
                <Polyline 
                  positions={[
                    [rideForm.pickup.lat, rideForm.pickup.lng],
                    [rideForm.dropoff.lat, rideForm.dropoff.lng]
                  ]} 
                  pathOptions={{ color: 'blue', weight: 4, dashArray: '10 5' }}
                />
              )}
            </MapContainer>
            {rideForm.pickupAddress && (
              <div className="mb-2">
                <strong>Pickup:</strong> {rideForm.pickupAddress}
              </div>
            )}
            {rideForm.dropoffAddress && (
              <div className="mb-2">
                <strong>Drop-off:</strong> {rideForm.dropoffAddress}
              </div>
            )}
            {rideForm.pickup && rideForm.dropoff && (
              <div className="mt-4 text-lg font-semibold text-gray-700">
                Estimated Fare: ₹{calculateFare(rideForm.pickup, rideForm.dropoff)}
              </div>
            )}
            {rideForm.pickupAddress && rideForm.dropoffAddress && (
              <button
                onClick={handleRideSubmit}
                className="bg-green-600 text-white px-3 py-2 rounded mt-6"
              >
                Book Ride
              </button>
            )}
          </div>
        )}
      </div>
      {activeTab === "rides" && (
  <div className="w-full flex justify-center">
    <div className="bg-white p-6 rounded shadow-md w-full max-w-3xl">
    <h2 className="text-xl font-semibold mb-4">📋 Your Rides</h2>
    {rides.length === 0 ? (
      <p>No rides booked yet.</p>
    ) : (
      <ul className="space-y-2">
        {rides.map(
          (ride) =>
            ride && (
              <li key={ride.id} className="border p-3 rounded">
                <strong>{ride.pickup || "Unknown pickup"}</strong> →{" "}
                <strong>{ride.dropoff || "Unknown dropoff"}</strong>
                <div>
                  <span className="italic">Status: {ride.status || "Unknown"}</span>
                </div>

                {/* Add a button to select this ride for payment */}
              {ride.status === "requested" || ride.status === "accepted" ? (
  <div className="flex flex-col md:flex-row gap-2 mt-2">
    {ride.status === "accepted" && (
      <button
        onClick={() => setSelectedRide(ride)}
        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
      >
        Pay for this Ride
      </button>
    )}
    <button
      onClick={() => handleCancelRide(ride.id)}
      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
    >
      Cancel Ride
    </button>
  </div>
) : ride.status === "completed" ? (
  <div className="text-green-600 mt-2 font-semibold">✅ Paid</div>
) : ride.status?.startsWith("cancelled") ? (
  <div className="text-gray-500 mt-2 italic">🚫 Cancelled</div>
) : (
  <div className="text-gray-600 mt-2 font-semibold">Status: {ride.status}</div>
)}
              </li>
            )
        )}
      </ul>
    )}

    {/* Render PaymentForm if a ride is selected */}
    {selectedRide && (
      <div className="mt-6 p-4 border rounded shadow">
  <h3 className="mb-2 font-semibold">Pay for Ride</h3>
  <p>
    Ride: {selectedRide.pickup} → {selectedRide.dropoff}
  </p>
  <p>Amount: ₹{selectedRide.fare ?? "N/A"}</p>

  <div className="mb-4">
    <label className="mr-4">
      <input
        type="radio"
        name="paymentMode"
        value="card"
        checked={paymentMode === "card"}
        onChange={() => setPaymentMode("card")}
      />{" "}
      Card
    </label>
    <label>
      <input
        type="radio"
        name="paymentMode"
        value="cash"
        checked={paymentMode === "cash"}
        onChange={() => setPaymentMode("cash")}
      />{" "}
      Cash
    </label>
  </div>

  {paymentMode === "card" && (
    <PaymentForm
      amount={selectedRide.fare}
      driverStripeAccountId={selectedRide.driverStripeAccountId}
      onPaymentSuccess={handlePaymentSuccess}
    />
  )}

  {paymentMode === "cash" && (
  <div className="flex flex-col items-center gap-3 mt-4">
    <p className="text-sm text-gray-700 text-center">
      Please confirm that you will pay the driver in cash.
    </p>
    <button
      onClick={handleCashPayment}
      className="bg-yellow-500 hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 text-white px-4 py-2 rounded shadow-md transition"
      aria-label="Confirm cash payment"
    >
      Confirm Cash Payment
    </button>
  </div>
)}


  <button
    onClick={() => setSelectedRide(null)}
    className="mt-4 px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
  >
    Cancel Payment
  </button>
</div>
   )}
  </div>
  </div>
)}
    </div>
  );
}