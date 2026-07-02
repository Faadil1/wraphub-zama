// App shell: Registry grid (default) + preserved S5 probe behind a tab.
import { useState } from "react";
import RegistryGrid from "./registry/RegistryGrid";
import Probe from "./Probe";
import PairDrawer from "./drawer/PairDrawer";
import type { OfficialPair } from "./registry/pairs.official";
import "./registry/registry.css";

export default function App() {
  const [tab, setTab] = useState<"registry" | "probe">("registry");
  const [drawerPair, setDrawerPair] = useState<OfficialPair | null>(null);
  return (
    <div className="app-shell">
      <header className="app-top">
        <div>
          <h1 className="app-title">WrapHub <span className="pulse">/ registry with a pulse</span></h1>
          <p className="app-tag">The composability entry point for Zama confidential tokens.</p>
        </div>
        <nav className="app-tabs" role="tablist" aria-label="Views">
          <button className="tab" role="tab" aria-selected={tab === "registry"} onClick={() => setTab("registry")}>Registry</button>
          <button className="tab" role="tab" aria-selected={tab === "probe"} onClick={() => setTab("probe")}>S5 probe</button>
        </nav>
      </header>
      {tab === "registry" ? <RegistryGrid onOpenPair={setDrawerPair} /> : <Probe />}
      {drawerPair && <PairDrawer key={drawerPair.wrapper} pair={drawerPair} onClose={() => setDrawerPair(null)} />}
    </div>
  );
}
