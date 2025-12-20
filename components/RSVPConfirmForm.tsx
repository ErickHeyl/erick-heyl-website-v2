import { FC, useState, FormEvent } from "react";
import { Guest } from "@/models/guests_model";
import Link from "next/link";

interface Props {
  guests: Guest[];
}

const RSVPConfirmForm: FC<Props> = ({ guests }) => {
  const [updatedGuests, setUpdatedGuests] = useState<Guest[]>(guests);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(
    null,
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const finalGuests = updatedGuests.map((guest) => {
        if (guest.rsvp_status === "Pending") {
          return { ...guest, rsvp_status: "Not Going" };
        }
        return guest;
      });
      const response = await fetch("/api/guests/update_rsvp_info_many", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updatedGuests: finalGuests }),
      });

      if (response.ok) {
        setSubmittedSuccessfully(true);
        setError(null);

        if (updatedGuests.some((guest) => guest.rsvp_status === "Going")) {
          setSubmissionMessage(
            "Thank you for submitting your RSVP info! We look forward to sharing our special day with you. Please remember to mark your calender for June 1st, 2024 to arrive at 5:30pm!",
          );
        } else {
          setSubmissionMessage(
            "Thank you for submitting your RSVP info! We are sorry you are unable to attend!",
          );
        }
      } else {
        throw new Error("Failed to update");
      }
    } catch (err) {
      setError("There was an error updating your message.");
      console.log(err);
    }
  };

  if (submittedSuccessfully) {
    return (
      <div className="flex flex-col items-center text-gray-700 dark:text-gray-300 justify-center container mx-auto py-2">
        <p>{submissionMessage}</p>
        <Link
          href="/"
          className="mt-4 marcellus-regs md:inline-block md:w-auto w-full block text-center focus:shadow-outline-blue inline rounded-lg border border-transparent bg-blue-600 px-8 py-2 text-sm font-medium leading-5 text-white shadow transition-colors duration-150 hover:bg-blue-700 focus:outline-none dark:hover:bg-blue-500"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center container mx-auto py-2">
      <>
        <form onSubmit={handleSubmit} className="w-full md:w-1/2 p-4 space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Please confirm the status of you and your guest(s). Edit the name to
            reflect what you want to appear on the table as needed, and confirm
            RSVP status.
          </p>

          <table className="min-w-full bg-white dark:bg-gray-950">
            <thead>
              <tr>
                <th className="border dark:border-gray-600 p-2 text-gray-900 dark:text-gray-200">
                  First Name
                </th>
                <th className="border dark:border-gray-600 p-2 text-gray-900 dark:text-gray-200">
                  Last Name
                </th>
                <th className="border dark:border-gray-600 p-2 text-gray-900 dark:text-gray-200">
                  Going?
                </th>
              </tr>
            </thead>
            <tbody>
              {updatedGuests.map((guest, idx) => (
                <tr key={guest.guest_id}>
                  <td className="border dark:border-gray-600 p-2">
                    <input
                      value={guest.first_name}
                      onChange={(e) => {
                        const newGuests = [...updatedGuests];
                        newGuests[idx].first_name = e.target.value;
                        setUpdatedGuests(newGuests);
                      }}
                      className={`w-full p-2 ${
                        error ? "border-red-500" : "border"
                      } dark:bg-gray-800 dark:text-white rounded-md`}
                    />
                  </td>
                  <td className="border dark:border-gray-600 p-2">
                    <input
                      value={guest.last_name}
                      onChange={(e) => {
                        const newGuests = [...updatedGuests];
                        newGuests[idx].last_name = e.target.value;
                        setUpdatedGuests(newGuests);
                      }}
                      className={`w-full p-2 ${
                        error ? "border-red-500" : "border"
                      } dark:bg-gray-800 dark:text-white rounded-md`}
                    />
                  </td>
                  <td className="border dark:border-gray-600 p-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        value=""
                        className="sr-only peer"
                        checked={guest.rsvp_status === "Going"}
                        onChange={() => {
                          const newGuests = [...updatedGuests];
                          newGuests[idx].rsvp_status =
                            guest.rsvp_status === "Going"
                              ? "Not Going"
                              : "Going";
                          setUpdatedGuests(newGuests);
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>{" "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <button
              type="submit"
              className="w-full max-w-lg mx-auto mt-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:bg-blue-700"
            >
              Submit
            </button>
          </div>
        </form>
        {error && <p className="text-center text-red-600">{error}</p>}
      </>
    </div>
  );
};

export default RSVPConfirmForm;
