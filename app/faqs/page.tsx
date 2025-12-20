import { faqs_data } from "@/data/faqs";
export default function FAQS() {
  return (
    <>
      <div className="marcellus-regs divide-y divide-gray-300 dark:divide-gray-700">
        <div className="space-y-2 pb-8 pt-6 md:space-y-5">
          <h1 className="text-center marcellus-regs text-3xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
            FAQs
          </h1>
          <p className="text-center marcellus-regs text-lg leading-7 text-gray-700 dark:text-gray-300">
            Below is a list of frequently asked questions with answers. For
            further questions not listed, feel free to contact our &apos;wedding
            coordinators&apos;—actually, it&apos;s just us, Bob and Alice! Reach
            out via text, email, or WhatsApp; we&apos;re ready to help with
            anything you need.
          </p>
        </div>
        <div className="container py-2">
          {faqs_data.map((faq, index) => (
            <div key={index} className="pt-4">
              <h2 className="marcellus-regs text-xl font-semibold text-gray-900 dark:text-gray-100">
                {faq.question}
              </h2>
              <p className="marcellus-regs text-lg text-gray-700 dark:text-gray-300">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
