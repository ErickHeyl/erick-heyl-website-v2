"use client";
import site_config from "@/data/site_config";
import header_nav_links from "@/data/header_nav_links";
import Link from "./Link";
import Image from "./Image";
import MobileNav from "./MobileNav";
import ThemeSwitch from "./ThemeSwitch";
import { useHeaderContext } from "@/utils/HeaderContext";

const Header = () => {
  const { isSticky } = useHeaderContext();

  return (
    <header
      className={`${
        isSticky ? "sticky top-0" : ""
      } marcellus-regs bg-white dark:bg-gray-950 flex items-center justify-between py-3`}
    >
      <div>
        <Link href="/" aria-label={site_config.header_title}>
          <div className="flex items-center justify-between">
            <div className="mr-3">
              <Image
                src="/static/images/logo.png"
                alt="my logo"
                width={50}
                height={50}
              ></Image>
            </div>
          </div>
        </Link>
      </div>
      <div className="flex items-center leading-5 space-x-4 sm:space-x-6">
        {header_nav_links.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className="hidden sm:block font-medium text-gray-900 dark:text-gray-100"
          >
            {link.title}
          </Link>
        ))}
        <ThemeSwitch />
        <MobileNav />
      </div>
    </header>
  );
};

export default Header;
