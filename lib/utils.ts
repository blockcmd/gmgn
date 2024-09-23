import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Address } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Truncate the address for display.
export function truncateAddress(
  address: Address | undefined,
  numberOfChars: number
) {
  if (!address) return "--------------";
  let convertedAddress = address.toString();
  return `${convertedAddress.slice(
    0,
    numberOfChars
  )}...${convertedAddress.slice(-4)}`;
}

// Truncate the hash for display
export function truncateHash(
  address: String | undefined,
  numberOfChars: number
) {
  if (!address) return "--------------";
  let convertedAddress = address.toString();
  return `${convertedAddress.slice(
    0,
    numberOfChars
  )}...${convertedAddress.slice(-numberOfChars)}`;
}

// Format the balance for display
export function formatBalance(number: string, maxDecimal: number) {
  // split the number base on the decimal point, then take only maxDecimals character from the decimal part
  const [whole, decimal] = number.split(".");
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${formattedWhole}.${decimal.slice(0, maxDecimal)}`;
}

export function selectChainNameFromNetwork(network: string | null) {
  if (!network) return "Unknown Network";
  switch (network) {
    case "ethereum-sepolia":
      return "Ethereum Sepolia";
    case "arbitrum-sepolia":
      return "Arbitrum Sepolia";
    case "base-sepolia":
      return "Base Sepolia";
    case "kaia-kairos":
      return "Kaia Kairos";
    default:
      return "Unknown Network";
  }
}
