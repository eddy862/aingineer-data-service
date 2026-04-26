import { useState } from "react";
import Sidebar from "../components/Sidebar";
import DataTable from "../components/DataTable";

export default function Dashboard() {
  const [activeDataset, setActiveDataset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("browse");

  return (
    <div style={{ display: "flex" }}>
      
      {/* LEFT */}
      <Sidebar onSelectDataset={setActiveDataset} activeDataset={activeDataset} />

      {/* RIGHT */}
      <div style={{ flex: 1, padding: "1rem" }}>
        <h2>Dataset: {activeDataset || "None selected"}</h2>

        {/* <Tabs activeTab={activeTab} setActiveTab={setActiveTab} /> */}

        {activeDataset && activeTab === "browse" && (
          <DataTable tableName={activeDataset} />
        )}

        {/* {activeDataset && activeTab === "query" && (
          <QueryPanel />
        )}*/}
      </div>

    </div>
  );
}