import Image from "next/image";

const ProductCard = () => {
  const handleSubscription = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    window.open("https://squareup.com/us/en/payment-links", "_blank");
  };

  return (
    <div className="text-center md max-w-[544px] p-4 md:w-1/2">
      <div className="p-6">
        <h2 className="marcellus-regs text-center mb-3 text-2xl font-bold leading-8 tracking-tight">
          Honeymoon Fund
        </h2>

        <Image
          width={448}
          height={336}
          src="/static/images/switzerland.jpg"
          alt="Switzerland"
          className="mx-auto mb-3"
        />

        <p className="marcellus-regs prose mb-3 max-w-none text-gray-700 dark:text-gray-300">
          This will help us fund our planned mountaineering trip in
          Schaffhausen, Switzerland.
        </p>

        <button
          onClick={handleSubscription}
          className="marcellus-regs md:inline-block md:w-auto w-full block
          text-center focus:shadow-outline-blue inline rounded-lg border
          border-transparent bg-blue-600 px-8 py-2 text-sm font-medium
          leading-5 text-white shadow transition-colors duration-150
          hover:bg-blue-700 focus:outline-none dark:hover:bg-blue-500"
        >
          Donate
        </button>
        <p className="marcellus-regs text-sm mt-4">
          Supported payment methods:
        </p>
        <div className="flex justify-center space-x-2 mt-2">
          <Image
            src="/static/images/paymentLogos/amex.svg"
            alt="Amex"
            className="w-6 h-6"
            width={6}
            height={6}
          />
          <Image
            src="/static/images/paymentLogos/mastercard.svg"
            alt="Mastercard"
            className="w-6 h-6"
            width={6}
            height={6}
          />
          <Image
            src="/static/images/paymentLogos/visa.svg"
            alt="Visa"
            className="w-6 h-6"
            width={6}
            height={6}
          />
          <Image
            src="/static/images/paymentLogos/applepay.svg"
            alt="Apple Pay"
            className="w-8 h-8 mt-[-0.27rem]"
            width={8}
            height={8}
          />
          {/* <Image */}
          {/*   src="/static/images/paymentLogos/wechatpay.svg" */}
          {/*   alt="WeChat" */}
          {/*   className="w-5 h-5" */}
          {/*   width={5} */}
          {/*   height={5} */}
          {/* /> */}
          <Image
            src="/static/images/paymentLogos/alipay.svg"
            alt="Alipay"
            className="w-5 h-5"
            width={5}
            height={5}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
