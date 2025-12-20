"use client";
import ProductCard from "@/components/ProductCard";

export default function Registry() {
  return (
    <>
      <div className="divide-y divide-gray-300 dark:divide-gray-700">
        <div className="space-y-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-center marcellus-regs text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            Registry
          </h1>
          <p className="marcellus-regs text-lg leading-7 text-gray-700 dark:text-gray-300">
            Many of you are traveling accross the State, Country, or Globe to
            visit us and celebrate our wedding with us, so your presence alone
            is a massive gift, and all we ask for. If you would like to
            contribute to our wedding registry, please donate to our honeymoon
            fund below.
          </p>
        </div>
        <div className="container py-2">
          <div className="justify-center -m-4 flex flex-wrap">
            {<ProductCard />}
          </div>
        </div>
      </div>
    </>
  );
}
