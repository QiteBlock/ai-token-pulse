import Image from "next/image";

export default function Logo() {
  return (
    <div className="flex items-center space-x-3">
      <Image
        src="/token-pulse.png"
        alt="TokenPulse Logo"
        width={32}
        height={32}
        className="rounded-lg"
      />
      <div className="flex items-center text-green-500">
        <span className="text-xl font-bold font-mono">TokenPulse</span>
        <span className="text-green-500/50 text-sm ml-2 font-mono">
          [v1.0.0]
        </span>
      </div>
    </div>
  );
}
