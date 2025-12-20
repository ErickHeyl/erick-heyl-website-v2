import Link from "@/components/Link";
import Image from "@/components/Image";

export default function Home() {
  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-center marcellus-regs text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            Alice and Bob
          </h1>
          <p className="text-center marcellus-regs text-lg leading-7 text-gray-700 dark:text-gray-300">
            A&B
          </p>
          <p className="text-center marcellus-regs text-lg leading-7 text-gray-700 dark:text-gray-300">
            June 1st, 2024
          </p>
        </div>
      </div>
      <div className="container py-2">
        <div className="-m-4 flex flex-wrap">
          <div className="md max-w-[544px] p-2 md:w-1/2">
            <Image
              src={"/static/images/engagement1.jpg"}
              alt="avatar"
              width={544}
              height={306}
              className="rounded-md"
              // buffer
            />
          </div>
          <div className="md max-w-[544px] p-2 md:w-1/2">
            <Image
              src={"/static/images/engagement2.jpg"}
              alt="avatar"
              width={544}
              height={306}
              className="rounded-md"
              // buffer
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center pt-4">
        <div className="md:w-auto mt-2 flex w-full rounded-md shadow-sm sm:mt-0 sm:ml-3">
          <Link
            href="/rsvp"
            className="marcellus-regs md:inline-block md:w-auto w-full block text-center focus:shadow-outline-blue inline rounded-lg border border-transparent bg-blue-600 px-8 py-2 text-sm font-medium leading-5 text-white shadow transition-colors duration-150 hover:bg-blue-700 focus:outline-none dark:hover:bg-blue-500"
          >
            RSVP
          </Link>
        </div>
      </div>
    </>
  );
}
