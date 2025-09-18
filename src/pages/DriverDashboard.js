import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import RideRequestCard from "./RideRequestCard";
import RideHistoryCard from "./RideHistoryCard";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
  getUserByClerkId,
  upsertUserProfile,
  upsertUserRole,
} from "../api/userApi";

export default function DriverDashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [rideRequests, setRideRequests] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [driverId, setDriverId] = useState(null);

  useEffect(() => {
  async function loadDriverData() {
    if (!user) return;
    setLoading(true);

    try {
      let profile = null;

      try {
        profile = await getUserByClerkId(user.id);
      } catch {
        // First-time user — create profile
        await upsertUserProfile({
          clerkId: user.id,
          name: user.fullName || "",
          phoneNumber: user.phoneNumber || "",
          profileImage: user.profileImageUrl || "",
        });

        profile = await getUserByClerkId(user.id);
      }

      if (profile) {
        setDriverId(profile.id);
        setName(profile.name || "");
        setPhoneNumber(profile.phone_number || "");
        setProfileImage(profile.profile_image || "");

        // Set role
        await upsertUserRole(user.id, "driver");
      }

      const { data: requestsData, error: requestsError } = await supabase
  .from("rides")
  .select("*")
  .eq("status", "requested")
  .neq("rider_id", profile?.id);

if (requestsError) {
  console.error("Error fetching ride requests:", requestsError);
} else {
  setRideRequests(requestsData);
}
      

      // ✅ Load ride history
      const { data: historyData, error: historyError } = await supabase
        .from("rides")
        .select("*")
        .in("status", ["accepted", "in_progress", "completed", "cancelled"])
        .eq("driver_id", profile?.id)
        .order("updated_at", { ascending: false });

      if (historyError) {
        console.error("Error fetching ride history:", historyError);
      } else {
        setRideHistory(historyData);

        const totalEarnings = historyData
          .filter((ride) => ride.status === "completed" && ride.fare)
          .reduce((sum, ride) => sum + ride.fare, 0);

        setEarnings(totalEarnings);
      }
    } catch (error) {
      console.error("Error loading driver data:", error);
    } finally {
      setLoading(false);
    }
  }

  loadDriverData();
}, [user]);

  const acceptRide = async (rideId) => {
    if (!driverId) {
      alert("Driver ID not ready yet. Try again.");
      return;
    }

    const { data, error } = await supabase
      .from("rides")
      .update({
        status: "accepted",
        driver_id: driverId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rideId)
      .eq("status", "requested")
      .select()
      .single();

    if (error) {
      console.error("Error accepting ride:", error);
      alert("Failed to accept ride.");
    } else {
      setRideRequests((prev) => prev.filter((ride) => ride.id !== rideId));
      setRideHistory((prev) => [data, ...prev]);
      alert("Ride accepted successfully!");
    }
  };

  const cancelRide = async (rideId) => {
  const confirm = window.confirm("Are you sure you want to cancel this ride?");
  if (!confirm) return;

  const { error } = await supabase
    .from("rides")
    .update({
      cancelled_by : "driver",
      status : "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", rideId)
    .eq("driver_id", driverId); // Only cancel rides assigned to this driver

  if (error) {
    console.error("Error cancelling ride:", error);
    alert("Failed to cancel ride.");
  } else {
    setRideHistory((prev) =>
  prev.map((ride) =>
    ride.id === rideId
      ? { ...ride, status: "cancelled", cancelled_by: "driver", updated_at: new Date().toISOString() }
      : ride
  )
);
    alert("Ride cancelled successfully.");
  }
};

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await upsertUserProfile({
        clerkId: user.id,
        name,
        phoneNumber,
        profileImage,
      });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);
      alert("Failed to update profile.");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading driver dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar */}
      <nav className="w-full md:w-64 bg-white shadow flex flex-row md:flex-col justify-between p-4 space-x-4 md:space-x-0 md:space-y-4 overflow-x-auto">
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span role="img" aria-label="car">🚗</span> Driver Dashboard
          </h2>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 w-full px-4 py-2 rounded mb-2 ${
              activeTab === "profile" ? "bg-blue-600 text-white" : "hover:bg-gray-100"
            }`}
          >
            👤 Profile
          </button>
          <button
            onClick={() => setActiveTab("rides")}
            className={`flex items-center gap-2 w-full px-4 py-2 rounded mb-2 ${
              activeTab === "rides" ? "bg-blue-600 text-white" : "hover:bg-gray-100"
            }`}
          >
            📋 Ride Requests
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 w-full px-4 py-2 rounded mb-2 ${
              activeTab === "history" ? "bg-blue-600 text-white" : "hover:bg-gray-100"
            }`}
          >
            📜 Ride History
          </button>
          <button
            onClick={() => setActiveTab("earnings")}
            className={`flex items-center gap-2 w-full px-4 py-2 rounded mb-2 ${
              activeTab === "earnings" ? "bg-blue-600 text-white" : "hover:bg-gray-100"
            }`}
          >
            💰 Earnings
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSignOut}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-6">
        {activeTab === "profile" && (
          <form
            onSubmit={handleProfileSubmit}
            className="bg-white p-6 rounded shadow max-w-lg mx-auto"
          >
            <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>
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
                type="tel"
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

        {activeTab === "rides" && (
          <div className="max-w-3xl mx-auto">
            {rideRequests.length === 0 ? (
              <p className="text-center">No available ride requests.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rideRequests.map((ride) => (
                  <RideRequestCard
                    key={ride.id}
                    ride={ride}
                    onAccept={acceptRide}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="max-w-3xl mx-auto">
            {rideHistory.length === 0 ? (
              <p className="text-center">No rides completed or in progress yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rideHistory.map((ride) => (
                  <div key={ride.id} className="mb-2">
                    <RideHistoryCard ride={ride} onCancel={cancelRide}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "earnings" && (
  <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
      <span role="img" aria-label="money bag">💰</span> Total Earnings
    </h3>
    <p className="text-3xl font-bold text-green-600 mb-6">₹{earnings}</p>

    <h4 className="text-lg font-semibold mb-3">Ride Earnings Details</h4>
    {rideHistory.length === 0 ? (
      <p>No earnings data available.</p>
    ) : (
      <ul className="divide-y divide-gray-200">
        {rideHistory.filter(ride => ride.status === 'completed').map((ride) => (
          <li key={ride.id} className="py-2 flex justify-between">
            <span>
              {new Date(ride.updated_at).toLocaleDateString()} - Ride ID: {ride.id}
            </span>
            <span className="font-semibold text-green-700">₹{ride.fare || 0}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
)}
      </main>
    </div>
  );
}