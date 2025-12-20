"use client";
import RSVPLookupForm from "@/components/RSVPLookupForm";

export default function RSVP() {
  return (
    <>
      <div className="marcellus-regs divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-center marcellus-regs text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            RSVP
          </h1>
          <p className="text-center marcellus-regs text-lg leading-7 text-gray-700 dark:text-gray-300">
            Please let us know if you are going to join us on our wedding day!
          </p>
        </div>
        <RSVPLookupForm />
      </div>
    </>
  );
}
