"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  createPublicClient,
  Address,
  Account,
  formatEther,
  http,
  parseEther,
  fromBytes,
  toHex,
} from "viem";
import { klaytnBaobab } from "viem/chains";
import Image from "next/image";
import WalletCopyButton from "./wallet-copy-button";
import {
  Send,
  RotateCcw,
  Download,
  LoaderPinwheel,
  CirclePlus,
  CircleUser,
  Wallet,
  Mail,
  Signature,
  CreditCard,
} from "lucide-react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { WebAuthnStorage } from "@hazae41/webauthnstorage";
import { createIcon } from "@/lib/blockies";
import cuid from "cuid";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { set } from "react-hook-form";

export default function WalletManagement() {
  const { toast } = useToast();
  const [balance, setBalance] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletClient, setWalletClient] = useState<any>();
  const [createWalletButtonActive, setCreateWalletButtonActive] =
    useState(true);

  const [sendingAmount, setSendingAmount] = useState("");
  const [receivingAddress, setReceivingAddress] = useState("");
  const [walletName, setWalletName] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [walletIcon, setWalletIcon] = useState("/kaia.png");
  const [gasEstimate, setGasEstimate] = useState("");
  const [gasPrice, setGasPrice] = useState("");
  const [transactionCost, setTransactionCost] = useState("");
  const [readyToTransfer, setReadyToTransfer] = useState(false);
  const [sendingMessage, setSendingMessage] = useState("");

  useEffect(() => {
    const GMGN_WALLET = localStorage.getItem("gmgn-wallet");
    if (GMGN_WALLET) {
      const wallet = JSON.parse(GMGN_WALLET);
      setWalletName(wallet.username);
      setWalletIcon(wallet.icon);
      if (wallet.status === "created") {
        setCreateWalletButtonActive(false);
      }
    }
  }, []);

  const publicClient = createPublicClient({
    chain: klaytnBaobab,
    transport: http(),
  });

  async function fetchBalance() {
    const balance = await publicClient.getBalance({
      address: walletAddress as Address,
    });
    setBalance(formatEther(balance).toString());
  }

  async function fetchTransactionCostEstimate() {
    const gas = await publicClient.estimateGas({
      account: walletAddress as Address,
      to: receivingAddress as Address,
      value: parseEther(sendingAmount),
    });
    const gasPrice = await publicClient.getGasPrice();
    setGasEstimate(formatEther(gas));
    setGasPrice(formatEther(gasPrice));
    setTransactionCost(formatEther(gas * gasPrice));
    setReadyToTransfer(true);
  }

  // Truncate the address for display.
  function truncateAddress(
    address: Address | undefined,
    numberOfChars: number
  ) {
    if (!address) return "No address";
    let convertedAddress = address.toString();
    return `${convertedAddress.slice(
      0,
      numberOfChars
    )}...${convertedAddress.slice(-4)}`;
  }

  // Truncate the hash for display
  function truncateHash(address: String | undefined, numberOfChars: number) {
    if (!address) return "No address";
    let convertedAddress = address.toString();
    return `${convertedAddress.slice(
      0,
      numberOfChars
    )}...${convertedAddress.slice(-numberOfChars)}`;
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
    // const handle = new Uint8Array([156, 237, 69, 251, 193, 186, 47, 79, 7, 235, 149, 213, 83, 235, 149, 107, 155, 176, 52, 240, 51, 62, 173, 205, 28, 234, 252, 16, 219, 138, 124, 143])
    /**
     * Retrieve the private key from authenticated storage
     */
    const bytes = await WebAuthnStorage.getOrThrow(handle);
    const privateKey = fromBytes(bytes, "hex");
    if (privateKey) {
      setCreateWalletButtonActive(false);
      const account = privateKeyToAccount(privateKey as Address);
      const walletClient = createWalletClient({
        account: privateKeyToAccount(privateKey as Address),
        chain: klaytnBaobab,
        transport: http(),
      });
      setWalletClient(walletClient);
      setWalletAddress(account.address);
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
    }
  }

  async function createWallet() {
    // const privateKey = generatePrivateKey();
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
      seed: cuid(), // seed used to generate icon data, default: random
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
  }

  async function submitTransaction() {
    const hash = await walletClient.sendTransaction({
      to: receivingAddress as Address,
      value: parseEther(sendingAmount),
    });
    toast({
      className:
        "bottom-0 right-0 flex fixed md:max-w-[420px] md:top-4 md:right-4",
      title: "Transaction sent!",
      description: "Hash: " + truncateHash(hash, 6),
      action: (
        <ToastAction altText="view">
          <a target="_blank" href={`https://kairos.kaiascan.io/tx/${hash}`}>
            View
          </a>
        </ToastAction>
      ),
    });
    setReadyToTransfer(false);
    setGasEstimate("");
    setGasPrice("");
    setTransactionCost("");
    setTransactionHash(hash);
    setSendingAmount("");
    setReceivingAddress("");
  }

  async function submitMessage() {
    const hash = await walletClient.sendTransaction({
      to: receivingAddress as Address,
      value: 0,
      data: toHex(sendingMessage),
    });
    toast({
      className:
        "bottom-0 right-0 flex fixed md:max-w-[420px] md:top-4 md:right-4",
      title: "Message sent!",
      description: "Hash: " + truncateHash(hash, 6),
      action: (
        <ToastAction altText="view">
          <a target="_blank" href={`https://kairos.kaiascan.io/tx/${hash}`}>
            View
          </a>
        </ToastAction>
      ),
    });
    setReadyToTransfer(false);
    setGasEstimate("");
    setGasPrice("");
    setTransactionCost("");
    setTransactionHash(hash);
    setSendingMessage("");
    setReceivingAddress("");
  }


  function trimWalletName(name: string) {
    if (name.length > 10) {
      return name.slice(0, 10) + "...";
    }
    return name;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-2 border-black rounded-md border-2 p-4">
        <div className="flex flex-row justify-between">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <Image
              src={walletIcon}
              alt="avatar"
              width={50}
              height={50}
              className="rounded-full border-2 border-primary"
            />
            <div className="flex flex-col text-sm">
              <div className="flex flex-row gap-2 items-center">
                <CircleUser className="w-4 h-4" />
                <p>{walletName ? walletName : "---"}</p>
              </div>
              <WalletCopyButton
                copyText={walletAddress}
                buttonTitle={truncateAddress(walletAddress as Address, 6)}
              />
            </div>
          </div>
          <Button onClick={fetchBalance} variant="outline" size="icon">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        <p className="self-end text-3xl font-semibold">
          {balance ? balance : "-/-"}{" "}
          <span className="text-lg text-gray-400">KLAY</span>
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {createWalletButtonActive && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <CirclePlus className="mr-2 h-4 w-4" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader className="flex flex-col items-center">
                <DialogTitle>Create</DialogTitle>
                <DialogDescription>Enter note and create</DialogDescription>
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
        )}
        <Button onClick={getWallet}>
          <LoaderPinwheel className="mr-2 h-4 w-4" />
          Load
        </Button>
        {!createWalletButtonActive && (
          <Button disabled>
            <CreditCard className="mr-2 h-4 w-4" />
            Topup
          </Button>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              disabled={
                createWalletButtonActive ? true : walletAddress ? false : true
              }
            >
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="flex flex-col items-center">
              <DialogTitle>Send</DialogTitle>
              <DialogDescription>Enter address and amount</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-8 mt-4 mb-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="receivingAddress">Receiving address</Label>
                <Input
                  id="receivingAddress"
                  className="rounded-none w-full border-primary border-2 p-2.5 mt-2"
                  placeholder="0x..."
                  value={receivingAddress}
                  onChange={(e) => setReceivingAddress(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sendingAmount">Amount</Label>
                <Input
                  id="sendingAmount"
                  className="rounded-none w-full border-primary border-2 p-2.5 mt-2"
                  placeholder="0"
                  value={sendingAmount}
                  onChange={(e) => setSendingAmount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2 border-2 border-primary p-2 text-right">
                <h2 className="border-b pb-2 text-xl font-semibold">Details</h2>
                <p>{gasEstimate} : Gas</p>
                <p>{gasPrice} : Gas price</p>
                <p>{transactionCost} : Cost</p>
                <Button
                  disabled={readyToTransfer}
                  className="w-fit self-end"
                  onClick={fetchTransactionCostEstimate}
                >
                  Continue
                </Button>
              </div>
            </div>
            <DialogFooter>
              <DialogTrigger asChild>
                <Button disabled={!readyToTransfer} onClick={submitTransaction}>
                  Send
                </Button>
              </DialogTrigger>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              disabled={
                createWalletButtonActive ? true : walletAddress ? false : true
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Receive
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="flex flex-col items-center">
              <DialogTitle>Receive</DialogTitle>
              <DialogDescription>
                Scan QR code or copy address
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center">
              <QRCode
                className="mt-4"
                size={256}
                value={walletAddress}
                viewBox={`0 0 256 256`}
              />
            </div>
            <DialogFooter className="flex flex-row gap-2 items-center">
              <Input
                className="rounded-none w-full border-primary border-2 p-2.5 mt-2"
                value={walletAddress}
                readOnly
              />
              <WalletCopyButton
                copyText={walletAddress}
                buttonTitle={walletAddress}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              disabled={
                createWalletButtonActive ? true : walletAddress ? false : true
              }
            >
              <Mail className="mr-2 h-4 w-4" />
              Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="flex flex-col items-center">
              <DialogTitle>Message</DialogTitle>
              <DialogDescription>Enter receiver and message</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-8 mt-4 mb-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="receivingAddress">Receiving address</Label>
                <Input
                  id="receivingAddress"
                  className="rounded-none w-full border-primary border-2 p-2.5 mt-2"
                  placeholder="0x..."
                  value={receivingAddress}
                  onChange={(e) => setReceivingAddress(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  className="rounded-none w-full border-primary border-2 p-2.5 mt-2"
                  placeholder="gm or gn"
                  value={sendingMessage}
                  onChange={(e) => setSendingMessage(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2 border-2 border-primary p-2 text-right">
                <h2 className="border-b pb-2 text-xl font-semibold">Details</h2>
                <p>{gasEstimate} : Gas</p>
                <p>{gasPrice} : Gas price</p>
                <p>{transactionCost} : Cost</p>
                <Button
                  disabled={readyToTransfer}
                  className="w-fit self-end"
                  onClick={fetchTransactionCostEstimate}
                >
                  Continue
                </Button>
              </div>
            </div>
            <DialogFooter>
              <DialogTrigger asChild>
                <Button disabled={!readyToTransfer} onClick={submitMessage}>
                  Send
                </Button>
              </DialogTrigger>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              disabled={
                createWalletButtonActive ? true : walletAddress ? false : true
              }
            >
              <Signature className="mr-2 h-4 w-4" />
              Sign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="flex flex-col items-center">
              <DialogTitle>Sign</DialogTitle>
              <DialogDescription>Sign a message</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-8 mt-4 mb-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="receivingAddress">Receiving address</Label>
                <Input
                  id="receivingAddress"
                  className="rounded-none w-full border-primary border-2 p-2.5 mt-2"
                  placeholder="0x..."
                  value={receivingAddress}
                  onChange={(e) => setReceivingAddress(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  className="rounded-none w-full border-primary border-2 p-2.5 mt-2"
                  placeholder="gm or gn"
                  value={sendingAmount}
                  onChange={(e) => setSendingAmount(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogTrigger asChild>
                <Button disabled={!readyToTransfer} onClick={submitTransaction}>
                  Send
                </Button>
              </DialogTrigger>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
