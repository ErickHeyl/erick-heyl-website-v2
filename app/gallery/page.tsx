"use client";
import Image from "@/components/Image";
import React, { useEffect } from "react";
import { useHeaderContext } from "@/utils/HeaderContext";
import { images } from "@/data/gallery_images";

export default function Gallery() {
  const { setSticky } = useHeaderContext();

  useEffect(() => {
    setSticky(false);
    return () => setSticky(true); // Reset when leaving the page
  }, [setSticky]);

  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="space-y-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-center marcellus-regs text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            Gallery
          </h1>
          <div className="justify-center grid md:grid-cols-3 gap-4 pt-4">
            <p className="marcellus-regs text-lg leading-7 text-gray-700 dark:text-gray-300 col-span-1">
              Here are some photos of us
              <br />
              sharing moments together.
              <br />
              macOS is better than Windows,
              <br />
              but both are inferior to Linux.
              <br />
            </p>
            <p className="marcellus-regs text-lg leading-7 text-gray-700 dark:text-gray-300 col-span-1">
              Our story in pictures, bright and true,
              <br />
              Moments we have shared.
              <br />
              Climbing high and walking far,
              <br />
              Under the sun, beneath the stars.
              <br />
            </p>
            <p className="marcellus-regs text-lg leading-7 text-gray-700 dark:text-gray-300 col-span-1">
              Together in snow, sliding with glee,
              <br />
              Solving puzzles, just you and me.
              <br />
              Learning new things, cultures we share,
              <br />
              In every photo, our love is there.
              <br />
            </p>
          </div>
        </div>

        <div className="container py-4">
          <div className="-m-4 flex flex-wrap">
            {images.map((image, index) => (
              <div key={index} className="p-6 md:w-1/3">
                <div className="md:flex md:justify-center md:items-center md:h-72 overflow-hidden rounded-md dark:bg-gray-950 bg-white">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={444}
                    height={306}
                    className="rounded-2xl"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
