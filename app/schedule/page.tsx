import Image from "@/components/Image";

export default function Schedule() {
  return (
    <>
      <div className="divide-y divide-gray-300 dark:divide-gray-700">
        <div className="space-y-4 pb-8 pt-6 md:space-y-5">
          <h1 className="text-center marcellus-regs text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            Schedule
          </h1>
          <p className="marcellus-regs text-lg text-center leading-7 text-gray-700 dark:text-gray-300">
            We are so excited to celebrate our wedding with you all! Here is
            what to expect during our wedding day.
          </p>
        </div>
        <div className="space-y-4 pb-8 pt-6 md:space-y-5">
          <p className="marcellus-bold text-center text-2xl dark:text-gray-300">
            Arrival Time
            <br></br>
            <span className="marcellus-regs non-bold text-xl">
              {" "}
              June 1st, 2024. 5:30 PM{" "}
            </span>
          </p>
          <p className="text-center marcellus-regs text-gray-700 dark:text-gray-300 text-md leading-7">
            1234 Emacs Avenue, Cupertino, CA 91234
          </p>
        </div>
        <div className="container py-12">
          <div className="-m-4 flex flex-wrap">
            <div className="marcellus-regs md max-w-[544px] p-4 md:w-1/2">
              <div className="h-full overflow-hidden rounded-md border-2 border-gray-200 border-opacity-60 dark:border-gray-700">
                <Image
                  alt="Ceremony"
                  src="/static/images/ceremony.jpg"
                  className="object-cover object-center md:h-36 lg:h-48"
                  width={544}
                  height={306}
                />
                <div className="p-6">
                  <h2 className="mb-3 text-2xl font-bold leading-8 tracking-tight">
                    Ceremony
                  </h2>
                  <p className="prose mb-3 max-w-none text-gray-700 dark:text-gray-300">
                    June 1st, 2024. 6:00pm - 6:30pm <br></br> Join us for our
                    wedding ceremony! It will be located outdoors at the
                    Lakeside Arbor of the Cupertino Estate by systemctl
                    Weddings. <br></br>
                  </p>
                </div>
              </div>
            </div>
            <div className="marcellus-regs md max-w-[544px] p-4 md:w-1/2">
              <div className="h-full overflow-hidden rounded-md border-2 border-gray-200 border-opacity-60 dark:border-gray-700">
                <Image
                  alt="reception"
                  src="/static/images/reception.webp"
                  className="object-cover object-center md:h-36 lg:h-48"
                  width={544}
                  height={306}
                />
                <div className="p-6">
                  <h2 className="mb-3 text-2xl font-bold leading-8 tracking-tight">
                    Reception
                  </h2>
                  <p className="prose mb-3 max-w-none text-gray-700 dark:text-gray-300">
                    June 1st, 2024. 6:30pm - 11:00pm <br></br>
                    The reception will include a dinner, and open bar, dancing,
                    card games, and much much more! Please join us in the
                    celebration of our marriage in this epic reception.{" "}
                    <br></br>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
