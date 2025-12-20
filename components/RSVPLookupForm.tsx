import { FC, useState, FormEvent } from "react";
import RSVPConfirmForm from "@/components/RSVPConfirmForm";

const RSVPLookupForm: FC = () => {
  const [first_name, setFirstName] = useState<string>("");
  const [last_name, setLastName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [guestInfo, setGuestInfo] = useState([]);

  const handle_continue = async (e: FormEvent) => {
    e.preventDefault();

    const response = await fetch("/api/guests/get_guest_info_from_name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ first_name, last_name }),
    });

    const data = await response.json();

    if (data.error) {
      setError(data.error);
      console.log(error);
    } else {
      setGuestInfo(data);
      setShowConfirmForm(true);
    }
  };

  if (showConfirmForm) {
    return <RSVPConfirmForm guests={guestInfo} />;
  }

  return (
    <div className="flex flex-col items-center justify-center container mx-auto py-2">
      <>
        <form
          onSubmit={handle_continue}
          className="w-full md:w-1/2 p-4 space-y-4"
        >
          <div className="space-y-2">
            <label
              htmlFor="first_name"
              className="block text-gray-700 dark:text-gray-300"
            >
              First Name:
            </label>
            <input
              id="first_name"
              type="text"
              value={first_name}
              onChange={(e) => setFirstName(e.target.value)}
              className={`w-full max-w-lg mx-auto p-2 ${
                error
                  ? "dark:border-red-500 border-red-500"
                  : "dark:border-gray-600 border"
              } dark:bg-gray-800 dark:text-white rounded-md`}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="last_name"
              className="block text-gray-700 dark:text-gray-300"
            >
              Last Name:
            </label>
            <input
              id="last_name"
              type="text"
              value={last_name}
              onChange={(e) => setLastName(e.target.value)}
              className={`w-full max-w-lg mx-auto p-2 ${
                error
                  ? "dark:border-red-500 border-red-500"
                  : "dark:border-gray-600 border"
              } dark:bg-gray-800 dark:text-white rounded-md`}
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full max-w-lg mx-auto mt-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </form>
        {error && <p className="text-center text-red-600">{error}</p>}
      </>
    </div>
  );
};

export default RSVPLookupForm;
