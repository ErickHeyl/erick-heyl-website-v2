import { hotel_data } from "@/data/travel_hotel_info";
export default function Travel() {
  return (
    <>
      <div className="marcellus-regs divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-center marcellus-regs text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            Travel
          </h1>
          <p className="text-center marcellus-regs text-lg leading-7 text-gray-700 dark:text-gray-300">
            Below are a list of hotels in the area. We also recommend searching
            &apos;systemctl weddings&apos; in{" "}
            <a
              className="text-blue-500"
              href="https://www.airbnb.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Airbnb
            </a>{" "}
            as there are several options very close to the venue there as well.
          </p>
        </div>
        <div className="container py-4">
          <div className="flex flex-wrap -m-4">
            {hotel_data.map((hotel, index) => (
              <div key={index} className="p-4 w-full md:w-1/2 lg:w-1/3">
                <div className="h-full overflow-hidden rounded-md dark:bg-gray-950 bg-white flex flex-col justify-center">
                  <h2 className="marcellus-bold text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {hotel.title}
                  </h2>
                  <p className="marcellus-regs text-lg dark:text-gray-400">
                    <span className="marcellus-bold">({hotel.distance})</span>{" "}
                    <br /> {hotel.phone_number} <br /> {hotel.address} <br />{" "}
                    {hotel.city_state_zip} <br />
                    <a
                      className="text-blue-500"
                      href={hotel.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Website
                    </a>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
