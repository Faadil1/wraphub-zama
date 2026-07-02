// App shell: Registry grid (default) + preserved S5 probe behind a tab.
import { useState } from "react";
import RegistryGrid from "./registry/RegistryGrid";
import Probe from "./Probe";
import PairDrawer from "./drawer/PairDrawer";
import ArbitraryDecrypt from "./arbitrary/ArbitraryDecrypt";
import type { OfficialPair } from "./registry/pairs.official";
import "./registry/registry.css";

export default function App() {
  const [tab, setTab] = useState<"registry" | "decrypt" | "probe">("registry");
  const [drawerPair, setDrawerPair] = useState<OfficialPair | null>(null);
  return (
    <div className="app-shell">
      <header className="app-top">
        <div className="app-logo">
          <h1 className="app-title">WrapHub <span className="pulse">• Registry with a Pulse</span></h1>
        </div>
        <nav className="app-tabs" role="tablist" aria-label="Views">
          <button className="tab" role="tab" aria-selected={tab === "registry"} onClick={() => setTab("registry")}>Registry Grid</button>
          <button className="tab" role="tab" aria-selected={tab === "decrypt"} onClick={() => setTab("decrypt")}>Arbitrary Decrypt</button>
          <button className="tab" role="tab" aria-selected={tab === "probe"} onClick={() => setTab("probe")}>S5 Browser Probe</button>
        </nav>
      </header>
      <main className="app-main">
        {tab === "registry" ? <RegistryGrid onOpenPair={setDrawerPair} /> : tab === "decrypt" ? <ArbitraryDecrypt /> : <Probe />}
      </main>
      {drawerPair && <PairDrawer key={drawerPair.wrapper} pair={drawerPair} onClose={() => setDrawerPair(null)} />}
    </div>
  );
}
