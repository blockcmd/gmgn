"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from 'next/navigation'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  Address,
  formatEther,
  http,
  fromBytes,
} from "viem";
import Image from "next/image";
import WalletCopyButton from "./wallet-copy-button";
import {
  Send,
  RotateCcw,
  Download,
  LoaderPinwheel,
  KeyRound,
  Mail,
  Signature,
  Settings,
  Pencil,
  Handshake,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { WebAuthnStorage } from "@/lib/webauthnstorage";
import { createIcon } from "@/lib/blockies";
import { createId } from "@paralleldrive/cuid2";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WalletAddressContext,
  WalletAddressContextType,
} from "@/app/wallet-context";
import {
  selectNativeAssetSymbol,
  truncateAddress,
  formatBalance,
  selectViemChainFromNetwork,
} from "@/lib/utils";
// import { getPublicKey, etc } from '@noble/ed25519';
// import { sha512 } from "@noble/hashes/sha512";

export default function WalletManagement() {
  // Get the search params from the URL.
  const searchParams = useSearchParams();

  const router = useRouter();
  // Get the toast function from the useToast hook.
  const { toast } = useToast();

  // Create the state variables for the wallet management
  const [balance, setBalance] = useState("");
  // Get the wallet address and set the wallet address from the WalletAddressContext.
  const { walletAddress, setWalletAddress } = useContext(
    WalletAddressContext
  ) as WalletAddressContextType;
  // Create the state variables for the wallet management
  const [createWalletButtonActive, setCreateWalletButtonActive] =
    useState(true);
  const [loadingWalletStorage, setLoadingWalletStorage] = useState(true);
  const [network, setNetwork] = useState<string>(searchParams.get("network") ?? "kaia-kairos");
  const [walletName, setWalletName] = useState("");
  const [walletIcon, setWalletIcon] = useState("");

  useEffect(() => {
    router.push('?network=' + network);
    const GMGN_WALLET = localStorage.getItem("gmgn-wallet");
    if (GMGN_WALLET) {
      const wallet = JSON.parse(GMGN_WALLET);
      setWalletName(wallet.username);
      setWalletIcon(wallet.icon);
      if (wallet.status === "created") {
        setCreateWalletButtonActive(false);
        setLoadingWalletStorage(false);
      }
    } else {
      setLoadingWalletStorage(false);
      setWalletIcon(
        createIcon({
          // All options are optional
          seed: createId(), // seed used to generate icon data, default: random
          size: 15, // width/height of the icon in blocks, default: 10
          scale: 3, // width/height of each block in pixels, default: 5
        }).toDataURL()
      );
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      const publicClient = createPublicClient({
        chain: selectViemChainFromNetwork(network as string),
        transport: http(),
      });
      const fetchBalance = async () => {
        const balance = await publicClient.getBalance({
          address: walletAddress as Address,
        });
        setBalance(formatEther(balance).toString());
      };
      // call the function
      fetchBalance()
        // make sure to catch any error
        .catch(console.error);
    }
  }, [walletAddress, network]);

  const publicClient = createPublicClient({
    chain: selectViemChainFromNetwork(network as string),
    transport: http(),
  });

  async function fetchBalance() {
    const balance = await publicClient.getBalance({
      address: walletAddress as Address,
    });
    setBalance(formatEther(balance).toString());
  }

  
  async function getWallet() {
    /**
     * Retrieve the handle to the private key from some unauthenticated storage
     */
    const cache = await caches.open("gmgn-storage");
    const request = new Request("gmgn-wallet");
    const response = await cache.match(request);
    const handle = response
      ? new Uint8Array(await response.arrayBuffer())
      : new Uint8Array();
    /**
     * Retrieve the private key from authenticated storage
     */
    const bytes = await WebAuthnStorage.getOrThrow(handle);
    const privateKey = fromBytes(bytes, "hex");
    if (privateKey) {
      setCreateWalletButtonActive(false);
      const account = privateKeyToAccount(privateKey as Address);
      setWalletAddress(account.address);
      toast({
        className:
          "bottom-0 right-0 flex fixed md:max-h-[300px] md:max-w-[420px] md:bottom-4 md:right-4 bg-green-600 text-white",
        title: "Wallet loaded!",
        description: "You are ready to use your wallet.",
      });
      const fetchBalance = async () => {
        const balance = await publicClient.getBalance({
          address: account.address,
        });
        setBalance(formatEther(balance).toString());
      };
      // call the function
      fetchBalance()
        // make sure to catch any error
        .catch(console.error);
    } else {
      toast({
        className:
          "bottom-0 right-0 flex fixed md:max-h-[300px] md:max-w-[420px] md:bottom-4 md:right-4",
        variant: "destructive",
        title: "Wallet load failed!",
        description: "Uh oh! Something went wrong. please try again.",
      });
    }
  }

  async function createWallet() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    /**
     * Store the private key into authenticated storage
     */
    const handle = await WebAuthnStorage.createOrThrow("gmgn-wallet", bytes);
    /**
     * Store the handle to the private key into some unauthenticated storage
     */
    const cache = await caches.open("gmgn-storage");
    const request = new Request("gmgn-wallet");
    const response = new Response(handle);
    await cache.put(request, response);
    const icon = createIcon({
      // All options are optional
      seed: createId, // seed used to generate icon data, default: random
      size: 15, // width/height of the icon in blocks, default: 10
      scale: 3, // width/height of each block in pixels, default: 5
    });
    const GMGN_WALLET_STORAGE = {
      status: "created",
      icon: icon.toDataURL(),
      username: walletName,
    };
    localStorage.setItem("gmgn-wallet", JSON.stringify(GMGN_WALLET_STORAGE));
    setCreateWalletButtonActive(false);
    if (handle) {
      toast({
        className:
          "bottom-0 right-0 flex fixed md:max-h-[300px] md:max-w-[420px] md:bottom-4 md:right-4 bg-blue-600 text-white",
        title: "Wallet created!",
        description: "Please click Load wallet from Passkey to begin.",
      });
    } else {
      toast({
        className:
          "bottom-0 right-0 flex fixed md:max-h-[300px] md:max-w-[420px] md:bottom-4 md:right-4",
        variant: "destructive",
        title: "Wallet creation failed!",
        description: "Uh oh! Something went wrong. please try again.",
      });
    }
  }

  async function handleInputNetworkChange(value: string) {
    setNetwork(value);
    router.push('?network=' + value);
    const publicClient = createPublicClient({
      chain: selectViemChainFromNetwork(value as string),
      transport: http(),
    });
    if (walletAddress) {
      const balance = await publicClient.getBalance({
        address: walletAddress as Address,
      });
      setBalance(formatEther(balance).toString());
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-row justify-between items-center">
        <Link href="/">
          <Image
            src="/gmgn-logo.svg"
            alt="gmgn logo"
            width={40}
            height={40}
            className="rounded-md"
          />
        </Link>
        <div className="flex flex-row gap-2">
          <Select
            value={network}
            onValueChange={handleInputNetworkChange}
            defaultValue="kaia-kairos"
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a network" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Select a network</SelectLabel>
                <SelectItem value="kaia-kairos">Kaia Kairos</SelectItem>
                <SelectItem value="arbitrum-sepolia">
                  Aribtrum Sepolia
                </SelectItem>
                <SelectItem value="base-sepolia">Base Sepolia</SelectItem>
                <SelectItem value="ethereum-sepolia">
                  Ethereum Sepolia
                </SelectItem>
                <SelectItem value="fraxtal-testnet">
                  Fraxtal Testnet
                </SelectItem>
                <SelectItem value="abstract-testnet">
                  Abstract Testnet
                </SelectItem>
                <SelectItem value="bartio-testnet">
                  bArtio Testnet
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button asChild size="icon" variant="outline">
            <Link href="/settings">
              <Settings className="w-6 h-6" />
            </Link>
          </Button>
        </div>
      </div>
      {createWalletButtonActive === false &&
      loadingWalletStorage === false &&
      walletAddress ? (
        <div className="flex flex-col gap-2 bg-[#9FE870] text-[#163300] border-primary border-2 rounded-md p-4">
          <div className="flex flex-row justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <Image
                src={walletIcon ? walletIcon : "/gmgn-placeholder-icon.svg"}
                alt="avatar"
                width={50}
                height={50}
                className="rounded-full border-primary border-2"
              />
              <div className="flex flex-col text-sm">
                <div className="flex flex-row gap-2 items-center p-2">
                  <p>{walletName ? walletName : "---"}</p>
                  <Pencil className="w-4 h-4" />
                </div>
                <WalletCopyButton
                  copyText={walletAddress}
                  buttonTitle={truncateAddress(walletAddress as Address, 6)}
                />
              </div>
            </div>
            <Button onClick={fetchBalance} size="icon">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          <p className="self-end text-3xl font-semibold">
            {balance ? formatBalance(balance, 8) : "-/-"}{" "}
            <span className="text-lg">{selectNativeAssetSymbol(network)}</span>
          </p>
        </div>
      ) : createWalletButtonActive === true &&
        loadingWalletStorage === false ? (
        <div className="flex flex-col gap-2 bg-[#9FE870] border-primary border-2 h-[200px] items-center justify-center rounded-md p-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <KeyRound className="mr-2 h-4 w-4" />
                Create wallet with Passkey
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader className="flex flex-col items-center">
                <DialogTitle>Create</DialogTitle>
                <DialogDescription>
                  Enter any username to create a wallet
                </DialogDescription>
              </DialogHeader>
              <div>
                <Input
                  className="rounded-none w-full border-primary border-2 p-2.5 mt-2"
                  placeholder="johnsmith"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={createWallet}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : createWalletButtonActive === false &&
        loadingWalletStorage === false &&
        !walletAddress ? (
        <div className="flex flex-col gap-2 bg-[#9FE870] border-primary border-2 h-[200px] items-center justify-center rounded-md p-4">
          <Button disabled={createWalletButtonActive} onClick={getWallet}>
            <LoaderPinwheel className="mr-2 h-4 w-4" />
            Load wallet from Passkey
          </Button>
        </div>
      ) : (
        <Skeleton className="h-[200px] rounded-md" />
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {!createWalletButtonActive && walletAddress ? (
          <Button asChild>
            <Link href={`/send?network=${network}&address=${walletAddress}`}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Link>
          </Button>
        ) : (
          <Button disabled>
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        )}
        {!createWalletButtonActive && walletAddress ? (
          <Button asChild>
            <Link href={`receive?network=${network}&address=${walletAddress}`}>
              <Download className="mr-2 h-4 w-4" />
              Receive
            </Link>
          </Button>
        ) : (
          <Button disabled>
            <Download className="mr-2 h-4 w-4" />
            Receive
          </Button>
        )}
        {!createWalletButtonActive && walletAddress ? (
          <Button asChild>
            <Link href={`message?address=${walletAddress}&network=${network}`}>
              <Mail className="mr-2 h-4 w-4" />
              Message
            </Link>
          </Button>
        ) : (
          <Button disabled>
            <Mail className="mr-2 h-4 w-4" />
            Message
          </Button>
        )}
        {!createWalletButtonActive && walletAddress ? (
          <Button asChild>
            <Link href={`sign?address=${walletAddress}&network=${network}`}>
              <Signature className="mr-2 h-4 w-4" />
              Sign
            </Link>
          </Button>
        ) : (
          <Button disabled>
            <Signature className="mr-2 h-4 w-4" />
            Sign
          </Button>
        )}
        {!createWalletButtonActive && walletAddress ? (
          <Button asChild>
            <Link href={`paylink?address=${walletAddress}`}>
              <Handshake className="mr-2 h-4 w-4" />
              Pay
            </Link>
          </Button>
        ) : (
          <Button disabled>
            <Handshake className="mr-2 h-4 w-4" />
            Pay
          </Button>
        )}
      </div>
    </div>
  );
}
