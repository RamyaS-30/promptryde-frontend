import React, { useEffect, useState } from "react";
import {
  SignedIn,
  SignedOut,
  UserButton,
  useClerk,
  useUser,
} from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { signOut } = useClerk();
  const { user, isSignedIn } = useUser();
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!isSignedIn || !user) return;

      try {
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/users/by-clerk-id/${user.id}`
        );
        const data = await res.json();

        if (res.ok && data?.role) {
          setRole(data.role);
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [isSignedIn, user]);

  return (
    <div className="min-h-screen bg-slate-800 text-white flex items-center justify-center px-6">
      <div className="bg-black bg-opacity-10 backdrop-blur-md p-10 rounded-lg shadow-2xl max-w-2xl w-full text-center">
        <h1 className="text-5xl font-extrabold mb-4 tracking-tight">🚗 PromptRyde</h1>
        <p className="text-xl mb-8">
          Seamlessly connect riders and drivers. Get moving with one click.
        </p>

        {/* Signed Out View */}
        <SignedOut>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="w-full md:w-auto bg-white text-blue-700 font-bold px-6 py-3 rounded shadow hover:bg-gray-100 transition"
            >
              Sign In
            </button>

            <button
              onClick={() => navigate("/signup")}
              className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded shadow transition"
            >
              Sign Up
            </button>
          </div>
        </SignedOut>

        {/* Signed In View */}
        <SignedIn>
          <div className="flex flex-col items-center gap-6">
            <UserButton afterSignOutUrl="/" />

            {loading ? (
              <p className="text-gray-300">Loading dashboard...</p>
            ) : (
              <>
                {role === "driver" && (
                  <button
                    onClick={() => navigate("/driverdashboard")}
                    className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded shadow transition"
                  >
                    Driver Dashboard
                  </button>
                )}

                {role === "user" && (
                  <button
                    onClick={() => navigate("/userdashboard")}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-3 rounded shadow transition"
                  >
                    Rider Dashboard
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded shadow transition"
            >
              Logout
            </button>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}