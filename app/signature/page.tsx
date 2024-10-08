"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import BackButton from "@/components/back-button";
import SignatureReview from "@/components/signature-review";

export default function SignaturePage() {
  const searchParams = useSearchParams();
  const address = searchParams.get("address");
  const network = searchParams.get("network");

  return (
    <div className="flex flex-col gap-6 p-4 w-screen md:w-[768px]">
      <Link href={`/?network=${network}&address=${address}`}>
        <Image
          src="/gmgn-logo.svg"
          alt="gmgn logo"
          width={40}
          height={40}
          className="rounded-md"
        />
      </Link>
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
        Signature
      </h1>
      <BackButton route={`/?network=${network}&address=${address}`} />
      <SignatureReview />
    </div>
  );
}
