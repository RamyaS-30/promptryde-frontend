import { useSignIn } from "@clerk/clerk-react";
import { useState } from "react";
import { Link } from "react-router-dom"; // import Link

export default function ForgotPassword() {
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      setSent(true);
    } catch (err) {
      console.error(err);
      setError(err.errors?.[0]?.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100 p-6">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Forgot Password
        </h2>

        {sent ? (
          <>
            <p className="text-green-600 text-center mb-4">
              A reset code has been sent to your email.
            </p>
            <p className="text-center text-blue-600 hover:underline">
              <Link to="/reset-password">Go to Reset Password</Link>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Enter your email
              </label>
              <input
                type="email"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && (
                <p className="text-red-600 text-sm font-medium">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition"
              >
                Send Reset Code
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
